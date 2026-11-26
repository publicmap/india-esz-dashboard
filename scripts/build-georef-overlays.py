#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pillow>=10.1",
# ]
# ///
"""
Build georeferencing reference overlays: one transparent, already-georeferenced
image per protected area, shown under the gazette page in the Allmaps editor
(its `bg-annotation-url` parameter) while you place control points.

    uv run scripts/build-georef-overlays.py Q1661434 [Q... ...]
    uv run scripts/build-georef-overlays.py Q1661434 --base http://localhost:3000/
    uv run scripts/build-georef-overlays.py --all     # every PA with georefOverlay

--all builds every PA that data/full-join.json gives a georefOverlay (those
mapped in OSM or with gazette table points), skips PAs whose inputs haven't
changed since their last build (inputs.sha256), and deletes overlays of PAs
no longer listed. The overlays are not committed (see .gitignore): the Pages
workflow builds them into the deployed site, caching the folder between runs.

Each overlay shows:
  - the PA's OSM boundary (and its OSM ESZ polygons), in green;
  - the points of the gazette's coordinate tables (from
    digitize-gazette-maps.py's table-points.geojson), numbered as in the
    table: one colour per boundary table (ESZ / PA / ...), joined in table
    order, and village points in blue.

The Allmaps editor reads only georeference annotations as a background, not
GeoJSON, so the overlay is published as a static IIIF Image API 3 level0
image (PNG tiles, transparent) whose four corners are pinned by an
annotation. The image is drawn in Web Mercator, which is what Allmaps warps
in, so a first-order polynomial through the corners places it exactly.

Each zoom level is drawn separately (not downscaled) so line widths and
labels stay legible at every level.

Inputs:  data/full-join.json, .cache/osm/india-protected-areas-all.geojson
         (build:osm-protected-areas), data/gazette-maps/<id>/table-points.geojson
Outputs: data/georef-overlays/<QID>/info.json, tiles, annotation.json
"""
from __future__ import annotations

import argparse
import functools
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "georef-overlays"
DEFAULT_BASE = "https://publicmap.github.io/india-esz-dashboard/"

SIZE = 4096          # full-resolution image, square
TILE = 512
SCALES = [1, 2, 4, 8]  # SIZE / 8 == TILE: the coarsest level is one tile
PAD_FRACTION = 0.15  # around the PA + table points
JOIN_MAX_MEDIAN_STEP = 0.06  # of the image width; see render()

OSM_COLOR = (21, 128, 61)
OSM_ESZ_COLOR = (34, 197, 94)
HALO = (255, 255, 255)
VILLAGE_COLOR = (37, 99, 235)
# One colour per boundary table, in the order the tables appear.
TABLE_COLORS = [(219, 39, 119), (234, 88, 12), (124, 58, 237), (202, 138, 4), (8, 145, 178)]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# --- Web Mercator, as fractions of the world (0..1, y down) ---------------

def merc(lon: float, lat: float) -> tuple[float, float]:
    lat = max(min(lat, 85.0511), -85.0511)
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def unmerc(x: float, y: float) -> tuple[float, float]:
    lon = x * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))
    return lon, lat


# --- inputs -----------------------------------------------------------------

def archive_ids(entry: dict) -> list[str]:
    ids = []
    for n in entry.get("notifications", []):
        link = n.get("notificationArchiveLink") or ""
        if "/details/" in link:
            ids.append(link.rstrip("/").rsplit("/details/", 1)[1])
    return list(dict.fromkeys(ids))  # a notification can be listed twice


OSM_PATH = ROOT / ".cache" / "osm" / "india-protected-areas-all.geojson"


@functools.cache
def osm_index() -> dict[str, dict]:
    if not OSM_PATH.exists():
        log(f"  ! {OSM_PATH} missing (run npm run build:osm-protected-areas): no OSM outlines")
        return {}
    return {f["properties"].get("@id"): f for f in json.loads(OSM_PATH.read_text())["features"]}


def load_osm(ids: set[str]) -> list[dict]:
    index = osm_index() if ids else {}
    return [index[i] for i in sorted(ids) if i in index]


def rings(geom: dict) -> list[list[list[float]]]:
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return c
    if t == "MultiPolygon":
        return [r for poly in c for r in poly]
    if t == "LineString":
        return [c]
    if t == "MultiLineString":
        return c
    return []


def table_layers(entry: dict) -> list[dict]:
    """Point groups from the PA's gazettes' coordinate tables, newest gazette
    first: [{kind, label, color, points: [(lon, lat, seq, name)]}]."""
    layers, n_boundary = [], 0
    for gid in archive_ids(entry):
        path = ROOT / "data" / "gazette-maps" / gid / "table-points.geojson"
        if not path.exists():
            continue
        groups: dict[tuple, dict] = {}
        for f in json.loads(path.read_text())["features"]:
            p = f["properties"]
            if f["geometry"]["type"] != "Point" or p.get("kind") not in ("boundary", "villages"):
                continue
            key = (p.get("annexure"), p.get("table"), p["kind"])
            if key not in groups:
                if p["kind"] == "boundary":
                    color = TABLE_COLORS[n_boundary % len(TABLE_COLORS)]
                    n_boundary += 1
                else:
                    color = VILLAGE_COLOR
                groups[key] = {"kind": p["kind"], "gazette": gid, "annexure": p.get("annexure"),
                               "table": p.get("table"), "color": color, "points": []}
            lon, lat = f["geometry"]["coordinates"]
            groups[key]["points"].append((lon, lat, p.get("seq"), p.get("name") or ""))
        drop_outliers(list(groups.values()))
        layers += [g for g in groups.values() if g["points"]]
    return layers


# Points far from the rest of a gazette's points are misreads (prose read as
# a table, a dropped digit) and are left out; same rule as the dashboard's
# markCoordOutliers.
OUTLIER_FACTOR = 5
OUTLIER_MIN_DEG = 0.1


def drop_outliers(groups: list[dict]) -> None:
    pts = [(lon, lat) for g in groups for lon, lat, *_ in g["points"]]
    if len(pts) < 4:
        return
    med = lambda a: sorted(a)[len(a) // 2]
    cx, cy = med([p[0] for p in pts]), med([p[1] for p in pts])
    limit = max(OUTLIER_FACTOR * med([math.hypot(x - cx, y - cy) for x, y in pts]), OUTLIER_MIN_DEG)
    for g in groups:
        kept = [p for p in g["points"] if math.hypot(p[0] - cx, p[1] - cy) <= limit]
        g["dropped"] = len(g["points"]) - len(kept)
        g["points"] = kept


# --- drawing ----------------------------------------------------------------

class Labeller:
    """Greedy label placement: a label is drawn only where it doesn't overlap
    one already drawn (boundary tables are labelled before villages)."""

    def __init__(self, size: int):
        self.boxes: list[tuple[int, int, int, int]] = []
        self.size = size

    def place(self, draw, font, x, y, r, text, color):
        if not text:
            return
        w = draw.textlength(text, font=font)
        h = font.size
        for dx, dy in ((r + 3, -h / 2), (-r - 3 - w, -h / 2), (-w / 2, -r - 3 - h), (-w / 2, r + 3)):
            box = (x + dx - 2, y + dy - 2, x + dx + w + 2, y + dy + h + 2)
            if box[0] < 0 or box[1] < 0 or box[2] > self.size or box[3] > self.size:
                continue
            if any(not (box[2] < b[0] or box[0] > b[2] or box[3] < b[1] or box[1] > b[3]) for b in self.boxes):
                continue
            self.boxes.append(box)
            draw.text((x + dx, y + dy), text, font=font, fill=color + (255,),
                      stroke_width=max(2, font.size // 6), stroke_fill=HALO + (230,))
            return


def render(level_size: int, to_px, osm: list[dict], esz_ids: set[str], layers: list[dict]) -> Image.Image:
    img = Image.new("RGBA", (level_size, level_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=15)
    small = ImageFont.load_default(size=12)
    fine = level_size >= SIZE // 2  # room for names, not just numbers

    for f in osm:
        color = OSM_ESZ_COLOR if f["properties"].get("@id") in esz_ids else OSM_COLOR
        for ring in rings(f["geometry"]):
            pts = [to_px(lon, lat) for lon, lat in ring]
            if len(pts) > 1:
                draw.line(pts, fill=HALO + (200,), width=6, joint="curve")
                draw.line(pts, fill=color + (255,), width=3, joint="curve")

    # Boundary tables: the outline they describe (in table order), then the
    # points over it. Villages after, so boundary labels win collisions. A
    # table of a few scattered landmarks (checkposts) isn't a traversal of
    # the boundary, so it's joined only when its points are close together.
    for layer in layers:
        if layer["kind"] == "boundary" and len(layer["points"]) > 1:
            pts = [to_px(lon, lat) for lon, lat, *_ in layer["points"]]
            steps = sorted(math.dist(a, b) for a, b in zip(pts, pts[1:]))
            if steps[len(steps) // 2] < level_size * JOIN_MAX_MEDIAN_STEP:
                draw.line(pts, fill=layer["color"] + (110,), width=2)

    labeller = Labeller(level_size)
    ordered = [l for l in layers if l["kind"] == "boundary"] + [l for l in layers if l["kind"] == "villages"]
    for layer in ordered:
        r = 5 if layer["kind"] == "boundary" else 3
        for lon, lat, seq, name in layer["points"]:
            x, y = to_px(lon, lat)
            draw.ellipse((x - r - 1.5, y - r - 1.5, x + r + 1.5, y + r + 1.5), fill=HALO + (255,))
            draw.ellipse((x - r, y - r, x + r, y + r), fill=layer["color"] + (255,))
        for lon, lat, seq, name in layer["points"]:
            x, y = to_px(lon, lat)
            if layer["kind"] == "boundary":
                text = f"{seq} {name}".strip() if fine and name else (str(seq) if seq is not None else "")
                labeller.place(draw, font, x, y, r, text, layer["color"])
            elif fine:
                labeller.place(draw, small, x, y, r, name, layer["color"])
    return img


# --- IIIF -------------------------------------------------------------------

def save_tile(img: Image.Image, d: Path):
    """PNG, saved as default.png and (same bytes) default.jpg: released
    @allmaps/iiif-parser (1.0.0-beta.49) ignores preferredFormats and asks for
    .jpg; browsers sniff the bytes, so the PNG decodes with its transparency."""
    d.mkdir(parents=True, exist_ok=True)
    img.save(d / "default.png", optimize=True)
    shutil.copyfile(d / "default.png", d / "default.jpg")


def write_iiif(qid: str, levels: dict[int, Image.Image], extent, base: str, entry: dict, layers: list[dict]):
    out = OUT / qid
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    service_id = f"{base}data/georef-overlays/{qid}"

    for s, img in levels.items():
        n = SIZE // (TILE * s)
        for ty in range(n):
            for tx in range(n):
                tile = img.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE))
                region = f"{tx * TILE * s},{ty * TILE * s},{TILE * s},{TILE * s}"
                save_tile(tile, out / region / f"{TILE},{TILE}" / "0")
    # The whole image: at the one listed size, and full size (Allmaps asks a
    # level0 service for full/max as a thumbnail).
    save_tile(levels[SCALES[-1]], out / "full" / f"{TILE},{TILE}" / "0")
    save_tile(levels[SCALES[0]], out / "full" / "max" / "0")

    (out / "info.json").write_text(json.dumps({
        "@context": "http://iiif.io/api/image/3/context.json",
        "id": service_id,
        "type": "ImageService3",
        "protocol": "http://iiif.io/api/image",
        "profile": "level0",
        "width": SIZE,
        "height": SIZE,
        "sizes": [{"width": TILE, "height": TILE}],
        "tiles": [{"width": TILE, "height": TILE, "scaleFactors": SCALES}],
        "extraFormats": ["png"],
        "preferredFormats": ["png"],
    }, indent=1))

    x0, y0, x1, y1 = extent
    corners = [((0, 0), (x0, y0)), ((SIZE, 0), (x1, y0)), ((SIZE, SIZE), (x1, y1)), ((0, SIZE), (x0, y1))]
    tables = "; ".join(f"Annexure {l['annexure']}: {l['table']}" for l in layers)
    (out / "annotation.json").write_text(json.dumps({
        "@context": ["http://iiif.io/api/extension/georef/1/context.json",
                     "http://iiif.io/api/presentation/3/context.json"],
        "id": f"{service_id}/annotation.json",
        "type": "Annotation",
        "motivation": "georeferencing",
        "label": {"en": [f"{entry['name']}: georeferencing reference (OSM boundary, gazette coordinate tables)"]},
        "summary": {"en": [tables or "OSM boundary only"]},
        "target": {
            "type": "SpecificResource",
            "source": {"id": service_id, "type": "ImageService3", "width": SIZE, "height": SIZE},
            "selector": {"type": "SvgSelector",
                         "value": f'<svg width="{SIZE}" height="{SIZE}"><polygon points="0,0 {SIZE},0 {SIZE},{SIZE} 0,{SIZE}" /></svg>'},
        },
        "body": {
            "type": "FeatureCollection",
            "transformation": {"type": "polynomial", "options": {"order": 1}},
            "features": [{
                "type": "Feature",
                "properties": {"resourceCoords": list(px)},
                "geometry": {"type": "Point", "coordinates": [round(c, 7) for c in unmerc(*m)]},
            } for px, m in corners],
        },
    }, indent=1))
    return out


# --- main -------------------------------------------------------------------

def build(entry: dict, base: str, force: bool = True) -> str:
    """'built', 'unchanged' or 'empty'."""
    qid = entry["paKey"]
    esz_ids = set(entry.get("osmEszIds") or [])
    osm_ids = set(entry.get("osmFeatureIds") or []) | {f"relation/{r}" for r in entry.get("osmRelationIds") or []} | esz_ids
    osm = load_osm(osm_ids)
    layers = table_layers(entry)
    # Everything the image depends on, so an unchanged PA can be skipped.
    digest = hashlib.sha256(json.dumps({
        "script": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "base": base, "name": entry["name"], "esz": sorted(esz_ids), "osm": osm,
        "tables": [{k: v for k, v in l.items()} for l in layers],
    }, sort_keys=True, default=str).encode()).hexdigest()
    stamp = OUT / qid / "inputs.sha256"
    if not force and stamp.exists() and stamp.read_text() == digest and (OUT / qid / "annotation.json").exists():
        return "unchanged"
    log(f"{qid} {entry['name']}: {len(osm)} OSM feature(s), "
        + (", ".join(f"{l['kind']} {l['annexure']} ({len(l['points'])}" + (f", {l['dropped']} misread dropped" if l.get("dropped") else "") + ")"
                   for l in layers) or "no table points"))
    if not osm and not layers:
        log("  nothing to draw")
        return "empty"

    # Extent: the OSM boundary and the table points (falling back to the
    # Allmaps bbox), padded, then squared in Mercator.
    xs, ys = [], []
    for f in osm:
        for ring in rings(f["geometry"]):
            for lon, lat in ring:
                x, y = merc(lon, lat); xs.append(x); ys.append(y)
    for l in layers:
        for lon, lat, *_ in l["points"]:
            x, y = merc(lon, lat); xs.append(x); ys.append(y)
    if not xs and entry.get("allmapsBbox"):
        w, s, e, n = entry["allmapsBbox"]
        for lon, lat in ((w, s), (e, n)):
            x, y = merc(lon, lat); xs.append(x); ys.append(y)
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    half = max(max(xs) - min(xs), max(ys) - min(ys)) / 2 * (1 + 2 * PAD_FRACTION)
    extent = (cx - half, cy - half, cx + half, cy + half)

    levels = {}
    for s in SCALES:
        size = SIZE // s
        k = size / (2 * half)
        to_px = lambda lon, lat, k=k: ((merc(lon, lat)[0] - extent[0]) * k, (merc(lon, lat)[1] - extent[1]) * k)
        levels[s] = render(size, to_px, osm, esz_ids, layers)
    out = write_iiif(qid, levels, extent, base, entry, layers)
    stamp.write_text(digest)
    log(f"  wrote {out.relative_to(ROOT)}")
    return "built"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("qids", nargs="*", help="PA Wikidata IDs (paKey in data/full-join.json)")
    ap.add_argument("--all", action="store_true", help="every PA with a georefOverlay in data/full-join.json, skipping unchanged ones")
    ap.add_argument("--base", default=DEFAULT_BASE, help=f"site URL the overlays are served from (default {DEFAULT_BASE})")
    args = ap.parse_args()
    base = args.base if args.base.endswith("/") else args.base + "/"
    entries = {e["paKey"]: e for e in json.loads((ROOT / "data" / "full-join.json").read_text())}
    if args.all:
        wanted = {q for q, e in entries.items() if e.get("georefOverlay")}
        if OUT.exists():
            for d in OUT.iterdir():
                if d.is_dir() and d.name not in wanted:
                    shutil.rmtree(d)
                    log(f"{d.name}: no longer listed, removed")
        counts: dict[str, int] = {}
        for qid in sorted(wanted):
            result = build(entries[qid], base, force=False)
            counts[result] = counts.get(result, 0) + 1
        log(f"overlays: {counts}")
        return
    if not args.qids:
        ap.error("give PA Wikidata IDs or --all")
    for qid in args.qids:
        if qid not in entries:
            log(f"{qid}: not in data/full-join.json")
            continue
        build(entries[qid], base)


if __name__ == "__main__":
    main()
