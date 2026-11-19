#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pymupdf>=1.24",
#   "numpy>=1.26",
#   "opencv-python-headless>=4.9",
#   "scikit-image>=0.22",
#   "scipy>=1.11",
#   "shapely>=2.0",
#   "pyproj>=3.6",
#   "rasterio>=1.3",
# ]
# ///
"""
Digitize ESZ / protected-area boundaries from a Gazette of India notification.

    uv run scripts/digitize-gazette-maps.py \
        https://egazette.servantsofknowledge.in/details/in.gazette.central.e.2024-11-29.259220/

Pipeline (everything is cached under .cache/gazettes/<id>/, outputs go to
data/gazette-maps/<id>/):

 1. fetch     Download the gazette PDF from egazette.servantsofknowledge.in.
              The text layer comes from the PDF; if a page has none (scanned
              gazettes), the OCR text on the archive's details page is used.
 2. tables    Parse every coordinate table (decimal degrees or D°M'S") and
              group it by the Annexure it appears under. Tables whose heading
              mentions villages are treated as interior points; everything
              else is treated as boundary vertices.
 3. maps      Extract every embedded map image (>= 500 px).
 4. georef    Find the map neatline and its graticule ticks, then pick the
              graticule interval/origin (and the colour of the boundary
              lines) that puts the most boundary-table points on a drawn line.
              Graticule labels are usually too small to OCR reliably; the
              table points are the ground truth. Writes a GeoTIFF per map.
 5. vectorize Skeletonize the boundary-coloured dashes, bridge the gaps left
              by dash spacing, vertex markers and labels, and polygonize the
              enclosed faces. Each face gets the dash-style mix of its edges
              (e.g. yellow/red vs black/red), the number of listed villages it
              contains, and its area.
 6. label     Faces are grouped into zones: a heuristic guess ("esz" if the
              face holds listed villages or is mostly drawn with the ESZ dash
              style), overridden by seed points in
              data/gazette-maps/<id>/labels.json:
                  {"map": "p42-i2",           # optional: which map to digitize
                   "line_color": "red",        # optional: boundary line colour
                   "default": "protected_area",
                   "zones": {"esz": [[lon, lat], ...], "core": [...], "drop": [...]}}
              Each seed labels the face that contains it; "drop" removes it.

Outputs (data/gazette-maps/<id>/):
  boundaries.geojson   one dissolved (Multi)Polygon per zone + stated areas
  faces.geojson        every digitized face with its attributes (for review)
  table-points.geojson coordinate-table points (boundary + village tables)
  <map>.tif            georeferenced map image (EPSG:4326)
  <map>-preview.png    QA overlay: faces, labels, table points
  report.json          georeference fit stats, areas, stated areas from text
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import re
import sys
import urllib.request
from collections import Counter, deque
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import pymupdf as fitz
import numpy as np
import rasterio
from rasterio.features import shapes as raster_shapes
from rasterio.transform import Affine
from pyproj import Geod
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import unary_union
from skimage.morphology import skeletonize
from skimage.segmentation import expand_labels

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://egazette.servantsofknowledge.in/details"
UA = "Mozilla/5.0 (gazette-digitizer)"
GEOD = Geod(ellps="WGS84")

# India's bounding box: lat and lon ranges don't overlap, so a number's range
# tells us which axis it is.
LAT_RANGE = (6.0, 37.5)
LON_RANGE = (68.0, 97.5)
GRATICULE_MINUTES = [0.5, 1, 2, 2.5, 3, 4, 5, 6, 7.5, 10, 12, 15, 20, 30, 60]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------
# 1. fetch
# --------------------------------------------------------------------------

def gazette_id(arg: str) -> str:
    m = re.search(r"(in\.gazette\.[a-z0-9_.\-]+?\.\d{4}-\d{2}-\d{2}\.\d+)", arg)
    if not m:
        sys.exit(f"Can't find a gazette identifier in {arg!r}")
    return m.group(1)


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def fetch(gid: str, cache: Path) -> tuple[Path, str]:
    cache.mkdir(parents=True, exist_ok=True)
    pdf = cache / "gazette.pdf"
    if not pdf.exists():
        data = b""
        for url in (f"{BASE}/{gid}/pdf/", f"https://archive.org/download/{gid}/{gid.rsplit('.', 1)[1]}.pdf"):
            log(f"fetch  {url}")
            try:
                data = http_get(url)
            except Exception as e:
                log(f"  ! {e}")
                continue
            if data.startswith(b"%PDF"):
                break
        if not data.startswith(b"%PDF"):
            sys.exit("Could not download the gazette PDF")
        pdf.write_bytes(data)
    ocr = cache / "ocr.txt"
    if not ocr.exists():
        try:
            log(f"fetch  {BASE}/{gid}/  (OCR text)")
            ocr.write_text(details_text(http_get(f"{BASE}/{gid}/").decode("utf-8", "replace")))
        except Exception as e:  # OCR text is only a fallback
            log(f"  ! could not fetch OCR text: {e}")
            ocr.write_text("")
    return pdf, ocr.read_text()


def details_text(page_html: str) -> str:
    """Plain text of the OCR transcript on a gazette details page."""
    body = re.sub(r"(?is)<(script|style|header|nav|footer)\b.*?</\1>", " ", page_html)
    body = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|li|h\d)>", "\n", body)
    body = re.sub(r"(?s)<[^>]+>", " ", body)
    body = html.unescape(body)
    return "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in body.splitlines())


def pdf_lines(doc: fitz.Document, ocr_text: str) -> list[str]:
    """Reading-order text lines. Rebuilt from word boxes so table rows stay on
    one line even when PyMuPDF emits cells as separate blocks."""
    out: list[str] = []
    textless = 0
    for page in doc:
        words = page.get_text("words")
        if len(words) < 20:
            textless += 1
        rows: list[list] = []
        for w in sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
            yc = (w[1] + w[3]) / 2
            if rows and abs(rows[-1][0] - yc) <= 3:
                rows[-1][1].append(w)
            else:
                rows.append([yc, [w]])
        for _, ws in rows:
            ws.sort(key=lambda w: w[0])
            # keep wide gaps visible so "name   10.5  76.8" splits cleanly
            line, last = "", None
            for w in ws:
                if last is not None:
                    line += "   " if w[0] - last > 12 else " "
                line += w[4]
                last = w[2]
            out.append(line)
    if textless > len(doc) / 2 and ocr_text.strip():
        log(f"  {textless}/{len(doc)} pages have no text layer; using archive OCR text")
        return ocr_text.splitlines()
    return out


# --------------------------------------------------------------------------
# 2. coordinate tables
# --------------------------------------------------------------------------

DMS_RE = re.compile(
    r"(?<![\d.])(\d{1,2}|\d{2,3})\s*[°º˚o]\s*(\d{1,2}(?:\.\d+)?)\s*['’′`]?\s*"
    r"(?:(\d{1,2}(?:\.\d+)?)\s*(?:\"|''|”|″|’’)?)?\s*([NSEW])?",
    re.I,
)
# Many gazette PDFs map the degree glyph to "0": 92°39'49" comes out as
# "920 39’49”" and 76°58' as "76058’". Only trusted when a minute mark follows.
DMS0_RE = re.compile(r"(?<![\d.])(\d{1,2})0\s*(\d{1,2})\s*['’′]\s*(?:(\d{1,2}(?:\.\d+)?)\s*(?:\"|''|”|″|’’)?)?")
DEC_RE = re.compile(r"(?<![\d.])(\d{1,2}\.\d{2,}|\d{2}\.\d{2,})(?![\d.])")
ANNEX_RE = re.compile(r"^\s*(?:Annex(?:ure)?|अनुबंध|उपाबंध|अनुलग्नक|परिशिष्ट)\s*[-–:.]?\s*([IVX\d]+[A-Z0-9()\s\-–]*|[क-ह][^\s]*)?\s*$", re.I)
SEQ_RE = re.compile(r"(?<![\d.])(\d{1,4})[.)]?\s*$")
# a line that starts a new table even inside the same Annexure
TABLE_TITLE_RE = re.compile(r"^\s*(table\b|list of\b)|co-?\s?ordinates|gps location|boundary points", re.I)
# a column-header line (repeated after page breaks; must not split a table)
HEADER_WORDS = {"gps", "points", "point", "longitude", "latitude", "lat", "long", "lon", "s.no", "s.no.", "sl.", "sl",
                "no", "no.", "sr.", "name", "(n)", "(e)", "n", "e", "id", "station", "location", "direction",
                "of", "the", "and", "prominent", "identification", "degree", "decimal"}
VILLAGE_RE = re.compile(r"villag|hamlet|habitation|settlement|गांव|ग्राम", re.I)


def is_header(line: str) -> bool:
    words = [w.strip(":,|()").lower() for w in line.split()]
    return bool(words) and all(w in HEADER_WORDS or not re.search(r"[a-z]", w) for w in words)


def axis_of(v: float) -> str | None:
    if LAT_RANGE[0] <= v <= LAT_RANGE[1]:
        return "lat"
    if LON_RANGE[0] <= v <= LON_RANGE[1]:
        return "lon"
    return None


def coords_in_line(line: str) -> list[tuple[int, int, float]]:
    """(start, end, value) for every coordinate-like number in a line."""
    hits = []
    taken = np.zeros(len(line) + 1, bool)
    for rx in (DMS_RE, DMS0_RE):
        for m in rx.finditer(line):
            if taken[m.start():m.end()].any():
                continue
            d, mi, s = float(m.group(1)), float(m.group(2)), float(m.group(3) or 0)
            if mi >= 60 or s >= 60:
                continue
            hits.append((m.start(), m.end(), d + mi / 60 + s / 3600))
            taken[m.start():m.end()] = True
    for m in DEC_RE.finditer(line):
        if not taken[m.start()]:
            hits.append((m.start(), m.end(), float(m.group(1))))
    return sorted(hits)


@dataclass
class Table:
    annexure: str
    title: str
    kind: str  # "boundary" | "villages"
    points: list[dict] = field(default_factory=list)


def parse_tables(lines: list[str]) -> list[Table]:
    tables: list[Table] = []
    annex, annex_title, cur = "", "", None
    recent: deque[str] = deque(maxlen=4)  # recent text lines, for the table title
    pending_title = gap = 0
    for line in lines:
        text = line.strip()
        m = ANNEX_RE.match(line)
        if m and len(text) < 60:
            annex = re.sub(r"\s+", "", m.group(1) or "?").replace("–", "-").strip("-")
            annex_title, cur, pending_title = "", None, 2
            recent.clear()
            continue
        hits = [(s, e, v, axis_of(v)) for s, e, v in coords_in_line(line)]
        hits = [h for h in hits if h[3]]
        if len(hits) < 2:
            gap += 1
            if gap >= 6:
                cur = None
            if text and re.search(r"[^\W\d_]{3}", text):
                if pending_title:
                    annex_title = (annex_title + " " + text).strip()
                    pending_title -= 1
                if not is_header(text):
                    recent.append(text)
                    if cur is not None and TABLE_TITLE_RE.search(text):
                        cur = None
            continue
        gap = 0
        i = 0
        prev_end = 0
        while i + 1 < len(hits):
            a, b = hits[i], hits[i + 1]
            if {a[3], b[3]} == {"lat", "lon"} and not re.search(r"[A-Za-z]{3,}", line[a[1]:b[0]]):
                lat = a[2] if a[3] == "lat" else b[2]
                lon = b[2] if b[3] == "lon" else a[2]
                before = line[prev_end:a[0]]
                seq_m = SEQ_RE.search(before)
                name = re.sub(r"^\s*\d{1,4}[.)]?\s+", "", before).strip(" |-")
                name = re.sub(r"\s{2,}.*$", "", name) if re.search(r"[A-Za-z]", name) else ""
                if cur is None:
                    titled = [l for l in recent if TABLE_TITLE_RE.search(l)]
                    title = (titled or list(recent) or [annex_title])[-1]
                    context = " ".join([annex_title, *recent])
                    cur = Table(annexure=annex or "?", title=title,
                                kind="villages" if VILLAGE_RE.search(context) else "boundary")
                    tables.append(cur)
                    recent.clear()
                cur.points.append({
                    "seq": int(seq_m.group(1)) if seq_m and not name else (len(cur.points) + 1),
                    "name": name or None,
                    "lat": round(lat, 7),
                    "lon": round(lon, 7),
                })
                prev_end = b[1]
                i += 2
            else:
                i += 1

    # Tables are often printed twice (Hindi half, then English half), and the
    # Hindi copy may be split or merged differently and OCR'd slightly
    # differently. Drop a table when nearly all of its points appear in later
    # tables; the English copy comes last.
    uniq = []
    for i, t in enumerate(tables):
        later = [(p["lon"], p["lat"]) for u in tables[i + 1:] for p in u.points]
        if later and len(t.points) >= 1:
            d, _ = cKDTree(later).query([(p["lon"], p["lat"]) for p in t.points])
            if (d < 2e-4).mean() >= 0.8:
                continue
        uniq.append(t)
    # Tables under an unrecognised heading ("Annexure ?") that appear before
    # any recognised Annexure are almost always the Hindi copy's fragments.
    if any(t.annexure != "?" for t in uniq):
        first = next(i for i, t in enumerate(uniq) if t.annexure != "?")
        uniq = uniq[first:]
    for t in uniq:
        if t.kind == "boundary":
            # two-column layouts list 1..n on the left and n+1.. on the right
            seqs = [p["seq"] for p in t.points]
            if len(set(seqs)) == len(seqs):
                t.points.sort(key=lambda p: p["seq"])
    return [t for t in uniq if len(t.points) >= 3]


def stated_areas(lines: list[str]) -> list[dict]:
    """'... an area of 767.57 square kilometres ...' style statements."""
    text = " ".join(lines)
    out = []
    for m in re.finditer(
        r"([^.;]{0,160}?)(\d[\d,]*\.?\d*)\s*(sq\.?\s*km|square\s*kilomet(?:er|re)s?|km2|km²|hectares?|ha\b)",
        text, re.I,
    ):
        val = float(m.group(2).replace(",", ""))
        unit = m.group(3).lower()
        km2 = val / 100 if unit.startswith("h") else val
        out.append({"context": (m.group(1)[-120:] + m.group(2) + " " + m.group(3)).strip(), "km2": km2})
    return out[:20]


# --------------------------------------------------------------------------
# 3. maps
# --------------------------------------------------------------------------

def extract_maps(doc: fitz.Document, outdir: Path, min_px=500) -> list[dict]:
    outdir.mkdir(parents=True, exist_ok=True)
    maps, seen = [], set()
    for pno, page in enumerate(doc):
        for k, info in enumerate(page.get_images(full=True)):
            xref = info[0]
            try:
                pix = fitz.Pixmap(doc, xref)
            except Exception:
                continue
            if pix.width < min_px or pix.height < min_px * 0.5:
                continue
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            png = pix.tobytes("png")
            h = hashlib.sha1(png).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            name = f"p{pno + 1}-i{k + 1}"
            path = outdir / f"{name}.png"
            path.write_bytes(png)
            maps.append({"name": name, "page": pno + 1, "path": path, "w": pix.width, "h": pix.height})
    return maps


# --------------------------------------------------------------------------
# 4. georeference
# --------------------------------------------------------------------------

def longest_run(v: np.ndarray) -> int:
    if not v.any():
        return 0
    d = np.diff(np.r_[0, v.astype(np.int8), 0])
    starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
    return int((ends - starts).max())


def find_frame(gray: np.ndarray):
    """Neatline (inner map frame) and the graticule ticks drawn outside it."""
    H, W = gray.shape
    dark = gray < 100
    rows = np.array([longest_run(dark[y]) for y in range(H)])
    cols = np.array([longest_run(dark[:, x]) for x in range(W)])
    try:
        top = next(y for y in range(H // 3) if rows[y] > W * 0.6)
        bot = next(y for y in range(H - 1, 2 * H // 3, -1) if rows[y] > W * 0.6)
        left = next(x for x in range(W // 3) if cols[x] > H * 0.6)
        right = next(x for x in range(W - 1, 2 * W // 3, -1) if cols[x] > H * 0.6)
    except StopIteration:
        return None
    # skip over a thick neatline
    while top + 1 < H and rows[top + 1] > W * 0.6: top += 1
    while bot - 1 > 0 and rows[bot - 1] > W * 0.6: bot -= 1
    while left + 1 < W and cols[left + 1] > H * 0.6: left += 1
    while right - 1 > 0 and cols[right - 1] > H * 0.6: right -= 1

    def groups(idx):
        g = []
        for i in idx:
            if g and i - g[-1][-1] <= 2:
                g[-1].append(i)
            else:
                g.append([i])
        return [float(np.mean(x)) for x in g if len(x) <= 6]

    def ticks(band, axis, off):
        if band.size == 0:
            return []
        s = band.sum(axis)
        return [off + t for t in groups(np.where(s >= band.shape[axis] * 0.6)[0])]

    # look a few px outside each side of the neatline (skipping the line itself)
    def outside(side):
        for gap in range(1, 6):
            if side == "top":
                b = dark[max(0, top - gap - 4):top - gap, left:right]; t = ticks(b, 0, left)
            elif side == "bottom":
                b = dark[bot + gap:bot + gap + 4, left:right]; t = ticks(b, 0, left)
            elif side == "left":
                b = dark[top:bot, max(0, left - gap - 4):left - gap]; t = ticks(b, 1, top)
            else:
                b = dark[top:bot, right + gap:right + gap + 4]; t = ticks(b, 1, top)
            if len(t) >= 3:
                return t
        return []

    xt = max([outside("top"), outside("bottom")], key=len)
    yt = max([outside("left"), outside("right")], key=len)
    return {"frame": (left, top, right, bot), "xticks": xt, "yticks": yt}


def regular_lattice(t: list[float]):
    """Fit evenly spaced ticks -> (origin_px, step_px, residual). Drops strays."""
    t = np.array(sorted(t))
    if len(t) < 3:
        return None
    step = np.median(np.diff(t))
    idx = np.round((t - t[0]) / step)
    keep = np.abs(t - (t[0] + idx * step)) < max(2.0, step * 0.05)
    if keep.sum() < 3:
        return None
    a, b = np.polyfit(idx[keep], t[keep], 1)
    resid = float(np.abs(np.polyval([a, b], idx[keep]) - t[keep]).max())
    return float(b), float(a), resid


HUES = {  # OpenCV HSV hue ranges (0-179) for typical boundary line colours
    "red": [(0, 8), (165, 180)],
    "orange": [(9, 17)],
    "yellow": [(18, 35)],
    "green": [(36, 80)],
    "cyan": [(81, 100)],
    "blue": [(101, 130)],
    "magenta": [(131, 164)],
    "black": [],  # any hue, very dark
}


def hue_mask(hsv: np.ndarray, name: str) -> np.ndarray:
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    if name == "black":
        return (V < 70).astype(np.uint8)
    m = np.zeros(H.shape, bool)
    for lo, hi in HUES[name]:
        m |= (H >= lo) & (H < hi)
    return (m & (S > 110) & (V > 100)).astype(np.uint8)


def thin_lines(m: np.ndarray, max_width=7) -> np.ndarray:
    """Keep line-like structures: drop filled areas wider than max_width px,
    then close the gaps between dashes."""
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max_width, max_width))
    fill = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_OPEN, k), np.ones((3, 3), np.uint8))
    m = m & (1 - fill)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))


def georeference(img: np.ndarray, boundary_pts: np.ndarray, frame_info: dict, line_color: str | None):
    """Return best {transform, color, score, ...} or None.

    transform maps pixel (x, y) -> (lon, lat): lon = a*x + c, lat = e*y + f.
    """
    if frame_info is None or len(boundary_pts) < 3:
        return None
    lx, ly = regular_lattice(frame_info["xticks"]), regular_lattice(frame_info["yticks"])
    if not lx or not ly:
        return None
    x0, dx, _ = lx
    y0, dy, _ = ly
    L, T, R, B = frame_info["frame"]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    frame_area = (R - L) * (B - T)
    lon, lat = boundary_pts[:, 0], boundary_pts[:, 1]
    best = None
    color_scores: dict[str, float] = {}
    for color in ([line_color] if line_color else HUES):
        m = thin_lines(hue_mask(hsv, color))
        m[:T + 3] = 0; m[B - 2:] = 0; m[:, :L + 3] = 0; m[:, R - 2:] = 0
        if m.sum() < 200:
            continue
        # chance that a random point lands within 4px of this colour
        p_rand = cv2.dilate(m, np.ones((9, 9), np.uint8)).sum() / frame_area
        if p_rand > 0.25:
            continue
        tree = cKDTree(np.argwhere(m > 0)[:, ::-1])
        for minutes in GRATICULE_MINUTES:
            vd = minutes / 60
            for lon0 in np.arange(math.floor(lon.min() / vd) * vd - 15 * vd, lon.max() + vd, vd):
                px = x0 + (lon - lon0) / vd * dx
                if px.max() < L or px.min() > R:
                    continue
                for lat0 in np.arange(math.ceil(lat.max() / vd) * vd + 15 * vd, lat.min() - vd, -vd):
                    py = y0 + (lat0 - lat) / vd * dy
                    inside = (px > L) & (px < R) & (py > T) & (py < B)
                    if inside.mean() < 0.8:
                        continue
                    # points must spread over the map, not collapse into a corner
                    if max(np.ptp(px) / (R - L), np.ptp(py) / (B - T)) < 0.25:
                        continue
                    d, _ = tree.query(np.c_[px, py])
                    hit = (d < 4).mean()
                    score = (hit - p_rand) / (1 - p_rand)
                    color_scores[color] = max(color_scores.get(color, -1.0), round(float(score), 3))
                    if best is None or score > best["score"]:
                        best = {
                            "score": float(score), "hit_fraction": float(hit), "chance": float(p_rand),
                            "color": color, "minutes": minutes, "lon0": float(lon0), "lat0": float(lat0),
                            "median_px_error": float(np.median(d)),
                        }
    if best:
        best["color_scores"] = color_scores
    if not best or best["score"] < 0.3:
        return best and {**best, "transform": None}
    vd = best["minutes"] / 60
    a, e = vd / dx, -vd / dy
    c, f = best["lon0"] - x0 * a, best["lat0"] - y0 * e
    best["transform"] = (a, c, e, f)
    return best


def write_geotiff(img: np.ndarray, t, path: Path):
    a, c, e, f = t
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)
    with rasterio.open(path, "w", driver="GTiff", width=img.shape[1], height=img.shape[0], count=3,
                       dtype="uint8", crs="EPSG:4326", transform=Affine(a, 0, c, 0, e, f),
                       compress="deflate", photometric="RGB") as dst:
        dst.write(rgb)


# --------------------------------------------------------------------------
# 5. vectorize
# --------------------------------------------------------------------------

def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def _endpoints(sk):
    nb = cv2.filter2D(sk, -1, np.ones((3, 3), np.float32), borderType=cv2.BORDER_CONSTANT) - sk
    return np.argwhere((sk == 1) & (nb <= 1))


_OFF = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def _geodesic(sk, y, x, maxd):
    H, W = sk.shape
    dist = {(y, x): 0}
    q = deque([(y, x)])
    while q:
        cy, cx = q.popleft()
        d = dist[(cy, cx)]
        if d >= maxd:
            continue
        for oy, ox in _OFF:
            ny, nx = cy + oy, cx + ox
            if 0 <= ny < H and 0 <= nx < W and sk[ny, nx] and (ny, nx) not in dist:
                dist[(ny, nx)] = d + 1
                q.append((ny, nx))
    return dist


def link_dashes(sk: np.ndarray, reach: int) -> np.ndarray:
    """Join each dash end to the next dash roughly straight ahead of it."""
    n, comp = cv2.connectedComponents(sk, connectivity=8)
    pts = np.argwhere(sk == 1)
    if len(pts) == 0:
        return sk
    tree = cKDTree(pts)
    out = sk.copy()
    for y, x in _endpoints(sk):
        c = comp[y, x]
        own = pts[tree.query_ball_point((y, x), 5)]
        own = own[comp[own[:, 0], own[:, 1]] == c]
        d0 = np.array([y, x]) - own.mean(0)
        nrm = np.linalg.norm(d0)
        best = None
        for i in tree.query_ball_point((y, x), reach):
            py, px = pts[i]
            if comp[py, px] == c:
                continue
            v = np.array([py - y, px - x])
            dist = np.linalg.norm(v)
            if nrm > 1.5:
                cosang = v.dot(d0) / (dist * nrm)
                if cosang < (0.3 if dist < reach / 2 else 0.75):
                    continue
                s = dist * (2 - cosang)
            else:
                s = dist * 1.5
            if best is None or s < best[0]:
                best = (s, py, px)
        if best:
            cv2.line(out, (int(x), int(y)), (int(best[2]), int(best[1])), 1, 1)
    return out


def close_dangles(sk: np.ndarray, reach: int, rounds=3) -> np.ndarray:
    """Boundaries are closed loops, so a loose end must connect somewhere:
    join it to the nearest line pixel that isn't just further along itself."""
    for _ in range(rounds):
        sk = skeletonize(cv2.dilate(sk, np.ones((3, 3), np.uint8)) > 0).astype(np.uint8)
        pts = np.argwhere(sk == 1)
        tree = cKDTree(pts)
        n = 0
        for y, x in _endpoints(sk):
            g = _geodesic(sk, y, x, 3 * reach)
            own = np.array([p for p, d in g.items() if d <= 6])
            d0 = np.array([y, x]) - own.mean(0)
            nrm = np.linalg.norm(d0)
            best = None
            for i in tree.query_ball_point((y, x), reach):
                py, px = pts[i]
                v = np.array([py - y, px - x])
                e = np.linalg.norm(v)
                if e < 1.5:
                    continue
                gd = g.get((py, px))
                if gd is not None and gd <= 2 * e + 6:
                    continue
                cosang = v.dot(d0) / (e * nrm) if nrm > 1 else 0.5
                if cosang < -0.2:
                    continue
                s = e * (1.6 - cosang)
                if best is None or s < best[0]:
                    best = (s, py, px)
            if best:
                cv2.line(sk, (int(x), int(y)), (int(best[2]), int(best[1])), 1, 1)
                n += 1
        if n == 0:
            break
    return sk


STYLE_NAMES = ["solid", "yellow", "dark", "white", "other"]


def line_styles(img: np.ndarray, line_mask: np.ndarray, sk: np.ndarray) -> np.ndarray:
    """Per skeleton pixel: which colour alternates with the boundary colour
    (dashed yellow/red vs black/red ...) or whether the line is solid."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    k = np.ones((7, 7), np.float32) / 49
    f = {
        "solid": cv2.filter2D(line_mask.astype(np.float32), -1, k),
        "yellow": cv2.filter2D(((H >= 15) & (H <= 40) & (S > 70) & (V > 140)).astype(np.float32), -1, k),
        "dark": cv2.filter2D((V < 60).astype(np.float32), -1, k),
        "white": cv2.filter2D(((S < 50) & (V > 210)).astype(np.float32), -1, k),
    }
    style = np.zeros(sk.shape, np.int8) - 1
    ys, xs = np.where(sk > 0)
    for y, x in zip(ys, xs):
        if f["solid"][y, x] > 0.45:
            s = 0
        elif f["yellow"][y, x] > max(0.06, f["dark"][y, x] * 1.2):
            s = 1
        elif f["dark"][y, x] > 0.12:
            s = 2
        elif f["white"][y, x] > 0.08:
            s = 3
        else:
            s = 4
        style[y, x] = s
    return style


def vectorize(img: np.ndarray, frame, color: str, scale: float):
    L, T, R, B = frame
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    H, S, V = [hsv[..., i].astype(int) for i in range(3)]

    def frame0(a):
        a[:T + 3] = 0; a[B - 2:] = 0; a[:, :L + 3] = 0; a[:, R - 2:] = 0
        return a

    line = hue_mask(hsv, color)
    # vertex markers (small yellow/white dots) sitting on the line
    marks = ((((H >= 18) & (H <= 40) & (S > 120) & (V > 170)) | ((S < 50) & (V > 215)))).astype(np.uint8)
    nm, ml, ms, _ = cv2.connectedComponentsWithStats(marks)
    ok = np.zeros(nm, bool)
    ok[1:] = (ms[1:, 4] >= 6) & (ms[1:, 4] <= 90 * scale * scale)
    line = frame0(line | (ok[ml].astype(np.uint8) & cv2.dilate(line, disk(3))))
    line = cv2.morphologyEx(line, cv2.MORPH_CLOSE, disk(1))

    sk = skeletonize(line > 0).astype(np.uint8)
    sk = link_dashes(sk, reach=max(10, int(24 * scale)))
    sk = close_dangles(sk, reach=max(15, int(45 * scale)))
    sk = frame0(sk)

    free = frame0((1 - cv2.dilate(sk, disk(1))).astype(np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    # the outside is the face touching the neatline
    border = np.unique(np.r_[lab[T + 4, L + 4:R - 4], lab[B - 4, L + 4:R - 4], lab[T + 4:B - 4, L + 4], lab[T + 4:B - 4, R - 4]])
    border = set(border.tolist()) - {0}
    min_px = int(150 * scale * scale)
    faces = np.zeros_like(lab)
    for i in range(1, n):
        if i not in border and st[i, 4] >= min_px:
            faces[lab == i] = i

    # Faces split only by a gap-bridge we invented (no drawn line under it)
    # are one face: merge them. Dash gaps are closed first so ordinary dashed
    # edges don't count as invented.
    drawn = cv2.dilate(cv2.morphologyEx(line, cv2.MORPH_CLOSE, disk(4)), disk(1))
    pair_total, pair_synth = Counter(), Counter()
    r = 3
    ys, xs = np.where(sk > 0)
    for y, x in zip(ys, xs):
        win = faces[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1]
        ids = np.unique(win[win > 0])
        if len(ids) == 2:
            key = (int(ids[0]), int(ids[1]))
            pair_total[key] += 1
            pair_synth[key] += int(not drawn[y, x])
    parent = {}

    def find(a):
        while parent.get(a, a) != a:
            a = parent[a]
        return a

    # Only small faces are absorbed, each into the one neighbour it shares the
    # most invented edge with -- so two large faces can never be chained
    # together through a sliver between them.
    areas = Counter(faces[faces > 0].ravel().tolist())
    small = sum(areas.values()) * 0.02
    for fid in sorted(areas, key=areas.get):
        if areas[fid] >= small:
            continue
        cands = [(pair_synth[k], k[0] if k[1] == fid else k[1]) for k, tot in pair_total.items()
                 if fid in k and tot >= 4 and pair_synth[k] / tot >= 0.7]
        if cands:
            target = find(max(cands)[1])
            if target != fid:
                parent[fid] = target
                areas[target] += areas[fid]
    if parent:
        lut = np.arange(faces.max() + 1)
        for k in list(parent):
            lut[k] = find(k)
        faces = lut[faces]
    neighbours: dict[int, set] = {}
    for (a, b), tot in pair_total.items():
        a, b = find(a), find(b)
        if a != b and tot >= 4:
            neighbours.setdefault(a, set()).add(b)
            neighbours.setdefault(b, set()).add(a)

    # give line pixels (and slivers) to the nearest face so neighbours share edges
    inside = cv2.morphologyEx(((faces > 0) | (sk > 0)).astype(np.uint8), cv2.MORPH_CLOSE, disk(2))
    faces = expand_labels(faces, distance=4) * (inside | (faces > 0))
    style = line_styles(img, hue_mask(hsv, color), sk)
    return faces.astype(np.int32), sk, style, neighbours


# --------------------------------------------------------------------------
# 6. label + output
# --------------------------------------------------------------------------

def pix_to_geo(t, x, y):
    a, c, e, f = t
    return a * x + c, e * y + f


def geo_to_pix(t, lon, lat):
    a, c, e, f = t
    return (np.asarray(lon) - c) / a, (np.asarray(lat) - f) / e


def area_km2(geom) -> float:
    return abs(GEOD.geometry_area_perimeter(geom)[0]) / 1e6


def face_polygons(faces: np.ndarray, t) -> dict[int, object]:
    a, c, e, f = t
    tr = Affine(a, 0, c, 0, e, f)
    polys: dict[int, list] = {}
    for geom, v in raster_shapes(faces, mask=faces > 0, transform=tr, connectivity=4):
        polys.setdefault(int(v), []).append(shape(geom))
    return {k: unary_union(v) for k, v in polys.items()}


def build_faces(faces, sk, style, neighbours, t, tables):
    polys = face_polygons(faces, t)
    villages = [(p["lon"], p["lat"]) for tb in tables if tb.kind == "villages" for p in tb.points]
    vfaces = Counter()
    if villages:
        vx, vy = geo_to_pix(t, [v[0] for v in villages], [v[1] for v in villages])
        vfaces = Counter()
        for x, y in zip(vx, vy):
            xi, yi = int(round(x)), int(round(y))
            if 0 <= yi < faces.shape[0] and 0 <= xi < faces.shape[1] and faces[yi, xi] > 0:
                vfaces[int(faces[yi, xi])] += 1
    out = []
    for fid, geom in polys.items():
        m = (faces == fid).astype(np.uint8)
        ring = cv2.dilate(m, disk(3)) & (sk > 0)
        hist = Counter(int(s) for s in style[ring > 0] if s >= 0)
        tot = sum(hist.values()) or 1
        out.append({
            "face": fid,
            "geometry": geom.simplify(abs(t[0]) * 0.7, preserve_topology=True),
            "area_km2": round(area_km2(geom), 3),
            "edge_style": {STYLE_NAMES[k]: round(v / tot, 3) for k, v in sorted(hist.items())},
            "villages": vfaces.get(fid, 0),
            "neighbours": sorted(neighbours.get(fid, ())),
        })
    total = sum(f["area_km2"] for f in out) or 1
    for f in out:
        f["share"] = f["area_km2"] / total
    return out


def guess_zone(face: dict) -> str:
    es = face["edge_style"]
    if not face["neighbours"] and face["share"] < 0.01 and not face["villages"]:
        return "drop"  # small stand-alone shape: usually a legend swatch
    if face["villages"] >= 2 or es.get("yellow", 0) >= 0.5:
        return "esz"
    return "protected_area"


def apply_labels(faces: list[dict], labels: dict) -> None:
    default = labels.get("default")
    for f in faces:
        f["zone"] = default or guess_zone(f)
        f["zone_source"] = "default" if default else "heuristic"
    for zone, seeds in (labels.get("zones") or {}).items():
        for lon, lat in seeds:
            p = Point(lon, lat)
            hit = [f for f in faces if f["geometry"].contains(p)]
            if not hit:
                log(f"  ! seed {lon},{lat} for {zone!r} is not inside any face")
            for f in hit:
                f["zone"] = zone
                f["zone_source"] = "labels.json"


def feature(geom, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(geom)}


def write_geojson(path: Path, feats):
    path.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False) + "\n")


def preview(img, faces_px, faces, sk, t, tables, path):
    out = (img * 0.45).astype(np.uint8)
    zones = sorted({f["zone"] for f in faces})
    palette = [(80, 200, 255), (90, 220, 120), (255, 140, 90), (200, 120, 255), (120, 255, 255), (255, 255, 120)]
    zcol = {z: palette[i % len(palette)] for i, z in enumerate(zones)}
    overlay = out.copy()
    for f in faces:
        if f["zone"] != "drop":
            overlay[faces_px == f["face"]] = zcol[f["zone"]]
    out = cv2.addWeighted(out, 0.55, overlay, 0.45, 0)
    out[sk > 0] = (255, 255, 255)
    for tb in tables:
        x, y = geo_to_pix(t, [p["lon"] for p in tb.points], [p["lat"] for p in tb.points])
        col = (0, 0, 255) if tb.kind == "boundary" else (255, 0, 255)
        for xi, yi in zip(x, y):
            cv2.circle(out, (int(round(xi)), int(round(yi))), 3, col, -1)
    for f in faces:
        ys, xs = np.where(faces_px == f["face"])
        if len(xs):
            cv2.putText(out, f"{f['face']}:{f['zone'][:4]}", (int(np.median(xs)) - 15, int(np.median(ys))),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)
    y = 20
    for z, c in zcol.items():
        cv2.rectangle(out, (10, y - 10), (22, y), c, -1)
        cv2.putText(out, z, (28, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        y += 16
    cv2.imwrite(str(path), out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gazette", help="egazette.servantsofknowledge.in URL or gazette identifier")
    ap.add_argument("--out", default=str(ROOT / "data" / "gazette-maps"))
    ap.add_argument("--cache", default=str(ROOT / ".cache" / "gazettes"))
    ap.add_argument("--line-color", choices=list(HUES), help="boundary line colour (default: auto-detect)")
    ap.add_argument("--map", help="map image to digitize, e.g. p42-i2 (default: best georeferenced)")
    args = ap.parse_args()

    gid = gazette_id(args.gazette)
    cache, out = Path(args.cache) / gid, Path(args.out) / gid
    out.mkdir(parents=True, exist_ok=True)
    pdf_path, ocr_text = fetch(gid, cache)
    doc = fitz.open(pdf_path)
    lines = pdf_lines(doc, ocr_text)
    (cache / "text.txt").write_text("\n".join(lines))

    tables = parse_tables(lines)
    log(f"tables {len(tables)}")
    for tb in tables:
        log(f"  Annexure {tb.annexure:<8} {tb.kind:<9} {len(tb.points):>4} pts  {tb.title[:70]}")
    tp = []
    for tb in tables:
        for p in tb.points:
            tp.append(feature(Point(p["lon"], p["lat"]), {"annexure": tb.annexure, "table": tb.title, "kind": tb.kind,
                                                          "seq": p["seq"], "name": p["name"]}))
    # The outline each boundary table describes, joining points in listed
    # order. Often partial (e.g. only the ESZ's outer edge), but it's the
    # authoritative geometry when a map can't be traced.
    for tb in tables:
        if tb.kind != "boundary" or len(tb.points) < 3:
            continue
        coords = [(p["lon"], p["lat"]) for p in tb.points]
        geom = LineString(coords)
        if len(coords) >= 4:
            ring = Polygon(coords)
            if ring.is_valid:
                geom = ring
        tp.append(feature(geom, {"annexure": tb.annexure, "table": tb.title, "kind": "outline",
                                 "points": len(coords), "note": "joined in listed order"}))
    write_geojson(out / "table-points.geojson", tp)
    # Boundary tables also as rings, in listed order (often a partial outline).
    bpts = np.array([(p["lon"], p["lat"]) for tb in tables if tb.kind == "boundary" for p in tb.points]).reshape(-1, 2)

    maps = extract_maps(doc, cache / "maps")
    log(f"maps   {len(maps)}")
    results = []
    for mp in maps:
        img = cv2.imread(str(mp["path"]))
        fi = find_frame(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
        g = georeference(img, bpts, fi, args.line_color) if fi else None
        status = "no frame/ticks" if not fi or not g else ("ok" if g.get("transform") else f"weak fit {g['score']:.2f}")
        log(f"  {mp['name']:<8} {mp['w']}x{mp['h']}  {status}"
            + (f"  {g['color']} lines, {g['minutes']}' graticule, {g['hit_fraction']:.0%} pts on lines" if g and g.get("transform") else ""))
        results.append({**mp, "frame": fi, "georef": g, "img": img})

    ok = [r for r in results if r["georef"] and r["georef"].get("transform")]
    report = {"gazette": gid, "source": f"{BASE}/{gid}/", "tables": [
        {"annexure": t.annexure, "title": t.title, "kind": t.kind, "points": len(t.points)} for t in tables],
        "maps": [{"name": r["name"], "page": r["page"], "georef": {k: v for k, v in (r["georef"] or {}).items() if k != "transform"}}
                 for r in results],
        "stated_areas": stated_areas(lines)}
    for r in ok:
        write_geotiff(r["img"], r["georef"]["transform"], out / f"{r['name']}.tif")

    labels_path = out / "labels.json"
    labels = json.loads(labels_path.read_text()) if labels_path.exists() else {}
    pick = args.map or labels.get("map")
    chosen = next((r for r in ok if r["name"] == pick), None) if pick else max(ok, key=lambda r: r["georef"]["score"], default=None)
    if not chosen:
        log("No map could be georeferenced; only table points were written.")
        (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        return

    t = chosen["georef"]["transform"]
    scale = max(chosen["w"], chosen["h"]) / 1431  # tuning constants were set on a 1431px map
    # Black is fine for georeferencing but on topo sheets it is also the grid,
    # contours and text, so only trace it when asked to.
    coloured = {c: v for c, v in chosen["georef"]["color_scores"].items() if c != "black" and v >= 0.3}
    color = args.line_color or labels.get("line_color") or (max(coloured, key=coloured.get) if coloured else None)
    if not color:
        log(f"{chosen['name']}: boundaries aren't drawn in a distinct colour; skipping line tracing "
            "(use the GeoTIFF + table outlines, or pass --line-color).")
        (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        return
    log(f"vectorize {chosen['name']} ({color} lines)")
    faces_px, sk, style, neighbours = vectorize(chosen["img"], chosen["frame"]["frame"], color, scale)
    faces = build_faces(faces_px, sk, style, neighbours, t, tables)
    apply_labels(faces, labels)

    write_geojson(out / "faces.geojson", [
        feature(f["geometry"], {k: v for k, v in f.items() if k not in ("geometry", "share")} | {"map": chosen["name"]})
        for f in sorted(faces, key=lambda f: -f["area_km2"])])

    zones = {}
    for f in faces:
        if f["zone"] != "drop":
            zones.setdefault(f["zone"], []).append(f["geometry"].buffer(0))
    feats, zone_areas = [], {}
    px_deg2 = abs(t[0] * t[2])
    pinhole = 2 * 150 * scale * scale * px_deg2  # gaps smaller than a face at line junctions

    def fill_pinholes(g):
        parts = getattr(g, "geoms", [g])
        return unary_union([Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area > pinhole]) for p in parts])

    merged = {}
    for z, gs in zones.items():
        g = unary_union(gs).buffer(abs(t[0]) * 0.01).buffer(-abs(t[0]) * 0.01)  # heal hairline seams
        merged[z] = fill_pinholes(g).simplify(abs(t[0]) * 0.5, preserve_topology=True)
    # make zones disjoint: smaller zones keep their shape, larger ones yield
    taken = None
    for z in sorted(merged, key=lambda z: merged[z].area):
        geom = merged[z] if taken is None else merged[z].difference(taken)
        taken = merged[z] if taken is None else taken.union(merged[z])
        geom = unary_union([p for p in getattr(geom, "geoms", [geom]) if p.geom_type == "Polygon" and p.area > pinhole])
        zone_areas[z] = round(area_km2(geom), 2)
        feats.append(feature(geom, {"zone": z, "area_km2": zone_areas[z], "gazette": gid,
                                    "source_map": chosen["name"], "source_page": chosen["page"],
                                    "source": f"{BASE}/{gid}/"}))
    write_geojson(out / "boundaries.geojson", feats)
    preview(chosen["img"], faces_px, faces, sk, t, tables, out / f"{chosen['name']}-preview.png")

    report["digitized_map"] = chosen["name"]
    report["zone_areas_km2"] = zone_areas
    # How far the listed boundary vertices are from the digitized boundaries.
    edges = unary_union([shape(f["geometry"]).boundary for f in feats])
    lat_c = edges.centroid.y if not edges.is_empty else 0
    mx, my = 111320 * math.cos(math.radians(lat_c)), 110574
    from shapely import affinity
    edges_m = affinity.scale(edges, mx, my, origin=(0, 0))
    report["table_fit_m"] = {}
    for tb in tables:
        if tb.kind != "boundary":
            continue
        d = sorted(edges_m.distance(Point(p["lon"] * mx, p["lat"] * my)) for p in tb.points)
        report["table_fit_m"][f"Annexure {tb.annexure}"] = {
            "points": len(d), "median": round(d[len(d) // 2]), "p90": round(d[int(len(d) * 0.9)]),
            "within_250m": round(sum(x <= 250 for x in d) / len(d), 2)}
        log(f"fit    Annexure {tb.annexure}: median {d[len(d) // 2]:.0f} m from digitized boundary")
    if report["table_fit_m"] and min(v["median"] for v in report["table_fit_m"].values()) > 500:
        report["warning"] = "Listed boundary points are far from the traced lines; the trace is probably wrong."
        log(f"  ! LOW CONFIDENCE: {report['warning']} Check {chosen['name']}-preview.png.")
    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    log(f"zones  {zone_areas}")
    log(f"wrote  {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}/")


if __name__ == "__main__":
    main()
