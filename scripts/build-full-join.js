// Builds data/full-join.json -- the single file the dashboard (index.html)
// loads to render both the table and the map. It's a full outer join,
// computed once at build time, between the Wikidata protected area list and
// the MoEF ESZ notification records, keyed by wikidataId (falling back to
// state+name for MoEF records that couldn't be matched to a Wikidata item).
//
// Each entry is one protected area with its notification history nested,
// plus every Wikidata field the map/popups need and a precomputed
// "representative" notification (same logic as build-geojson.js) so the
// client never has to cross-reference three separate payloads to render.

import { readFile, writeFile } from 'node:fs/promises';
import { loadCache } from './lib/enrichment-cache.js';

// { gazetteMaps, georeferencedMaps, gazetteMapPages } for the notification's
// archive.org gazette: how many map images build:gazette-maps found in it, how
// many of those are georeferenced in Allmaps, and the 1-based pages they're
// on. Empty when the gazette wasn't matched.
// Matching OSM ESZ polygons (data/osm/india-protected-areas-esz.json) to
// PAs by name. Names are compared by their "core": lower-cased, accents,
// brackets ("(Proposed)", "(North)"), "ESZ"/"Eco-Sensitive Zone" and the PA
// type words/abbreviations stripped -- "Kali TR ESZ" and "Kali Tiger Reserve"
// both become "kali". A combined PA ("Bhagwan Mahaveer Sanctuary and Mollem
// National Park") is matched by each of its parts. In order, the first that
// finds any PA: an exact core match; a core of 6+ letters within edit
// distance 2 (spelling variants: Mahavir/Mahaveer, Anamalai/Anaimalai,
// Chimmony/Chimmini); one core a whole-word prefix of the other, the shorter
// 8+ letters ("Thane Creek Flamingo" / "Thane Creek"). Then narrowed to the
// ESZ's PA type when it names one and that leaves any.
const PA_TYPE_PATTERNS = [
  ['tiger', /\b(tiger reserve|tr)\b/],
  ['np', /\b(national ?park|np)\b/],
  ['bird', /\b(bird sanctuary|bs)\b/],
  ['wls', /\b(wildlife sanctuary|wls|sanctuary)\b/],
];
function normalizePaName(name) {
  return String(name || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/eco[- ]?sensitive zones?|\besz\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function paNameType(normalized) {
  return (PA_TYPE_PATTERNS.find(([, re]) => re.test(normalized)) || [null])[0];
}
function paNameCore(normalized) {
  return normalized
    .replace(/\b(tiger reserve|national ?park|bird sanctuary|wildlife sanctuary|sanctuary|wildlife|wls|np|tr|bs|zone)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}
// {QID: [osm type/id of its ESZ polygons]}
function matchEszToPAs(eszIndex, pas) {
  const paCores = pas.map((pa) => {
    const n = normalizePaName(pa.wikidataLabel);
    return { qid: pa.wikidataId, cores: n.split(' and ').map(paNameCore).filter(Boolean), type: paNameType(n) };
  });
  const tests = [
    (a, b) => a === b,
    (a, b) => a.length >= 6 && b.length >= 6 && editDistance(a, b) <= 2,
    (a, b) => {
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      return short.length >= 8 && long.startsWith(`${short} `);
    },
  ];
  const byQid = {};
  const unmatched = [];
  for (const [osmId, name] of Object.entries(eszIndex)) {
    const n = normalizePaName(name);
    const core = paNameCore(n);
    const type = paNameType(n);
    let cands = [];
    for (const test of tests) {
      cands = paCores.filter((p) => p.cores.some((c) => test(c, core)));
      if (cands.length) break;
    }
    if (cands.length > 1 && type && cands.some((p) => p.type === type)) cands = cands.filter((p) => p.type === type);
    if (!cands.length) { unmatched.push(name); continue; }
    for (const qid of new Set(cands.map((p) => p.qid))) (byQid[qid] ||= []).push(osmId);
  }
  return { byQid, unmatched };
}

function gazetteMapCounts(index, archiveLink) {
  const id = archiveLink?.match(/archive\.org\/details\/([^/?#]+)/)?.[1];
  const counts = id && index[id];
  return counts ? { gazetteMaps: counts.maps, georeferencedMaps: counts.georeferenced, gazetteMapPages: counts.mapPages || [] } : {};
}

function pickLatest(notifications, status) {
  const relevant = notifications.filter((n) => n.notificationStatus === status);
  return relevant.sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''))[0] || null;
}

// Same composite key enrich-allmaps.js keys "allmaps editor" (the Allmaps
// georeferencing-editor link) by -- a multi-park notification is one gazette
// PDF but each park's toposheet/annexure can sit on a different page, so the
// georeferencing link is per (orderNumber, notificationDate, protectedAreaName),
// not per notification alone.
function findGeoreferencingLink(cache, orderNumber, notificationDate, protectedAreaName) {
  const row = cache.find((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate
    && r.protectedAreaName === protectedAreaName);
  return row?.['allmaps editor'] || null;
}

// Fallback for when a scan hasn't been georeferenced yet (no "allmaps
// editor" link): the plain Allmaps image viewer for the matched archive.org
// scan, so a user can at least locate the boundary map page and georeference
// it themselves.
function findAllmapsImagesLink(cache, orderNumber, notificationDate, protectedAreaName) {
  const row = cache.find((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate
    && r.protectedAreaName === protectedAreaName);
  return row?.['allmaps images'] || null;
}

async function main() {
  const wikidataPAs = JSON.parse(await readFile('data/wikidata/protected-areas.json', 'utf8'));
  const moefRecords = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  // Map counts per gazette from build:gazette-maps (absent before its first run).
  const gazetteMapIndex = await readFile('data/gazette-maps/index.json', 'utf8').then(JSON.parse, () => ({}));
  // {QID: [osm type/id]} from build:osm-protected-areas: OSM features whose
  // wikidata tag points at the PA. Far more PAs are linked this way than by
  // Wikidata's own OSM relation ID (P402), which few items carry.
  const osmByWikidata = await readFile('data/osm/india-protected-areas-wikidata.json', 'utf8').then(JSON.parse, () => ({}));
  const osmExtentById = await readFile('data/osm/india-protected-areas-bbox.json', 'utf8').then(JSON.parse, () => ({}));
  // {QID: [osm type/id]}: the OSM ESZ polygons of each PA, matched by name.
  const eszIndex = await readFile('data/osm/india-protected-areas-esz.json', 'utf8').then(JSON.parse, () => ({}));
  const { byQid: osmEszByWikidata, unmatched: unmatchedEsz } = matchEszToPAs(eszIndex, wikidataPAs);
  console.log(`OSM ESZ polygons matched to a PA: ${Object.keys(eszIndex).length - unmatchedEsz.length}/${Object.keys(eszIndex).length}`
    + `${unmatchedEsz.length ? ` (unmatched: ${unmatchedEsz.join('; ')})` : ''}`);
  // For the OSM polygons linked to a PA (its Wikidata OSM relation(s) and OSM
  // features tagged with its QID) that are in the OSM extract:
  // - osmBbox: [west, south, east, north] spanning all of them -- the map
  //   fits to this when a PA is selected, instead of zooming to its point;
  // - osmAreaKm2: the largest one's area (linked features often overlap, e.g.
  //   a national park inside its tiger reserve, so they aren't summed) -- the
  //   map sizes markers by it.
  // Both null when none of them is in the extract.
  const osmExtent = (ids) => {
    const found = ids.map((id) => osmExtentById[id]).filter(Boolean);
    if (!found.length) return { osmBbox: null, osmAreaKm2: null };
    const boxes = found.map((f) => f.bbox);
    return {
      osmBbox: [
        Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])),
        Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3])),
      ],
      osmAreaKm2: Math.max(...found.map((f) => f.areaKm2)),
    };
  };
  const enrichmentCache = await loadCache('data/enrichment-cache.csv');

  const notificationsByWikidataId = new Map();
  const unmatchedByKey = new Map();

  for (const r of moefRecords) {
    const notification = {
      moefSNo: r.moefSNo,
      protectedAreaName: r.protectedAreaName,
      protectedAreaType: r.protectedAreaType,
      state: r.state,
      notificationStatus: r.notificationStatus,
      notificationDate: r.notificationDate,
      orderNumber: r.orderNumber,
      notificationPdfLink: r.notificationPdfLink,
      notificationArchiveLink: r.notificationArchiveLink,
      georeferencingLink: findGeoreferencingLink(enrichmentCache, r.orderNumber, r.notificationDate, r.protectedAreaName),
      allmapsImagesLink: findAllmapsImagesLink(enrichmentCache, r.orderNumber, r.notificationDate, r.protectedAreaName),
      ...gazetteMapCounts(gazetteMapIndex, r.notificationArchiveLink),
    };
    if (r.wikidataId) {
      const list = notificationsByWikidataId.get(r.wikidataId) || [];
      list.push(notification);
      notificationsByWikidataId.set(r.wikidataId, list);
    } else {
      const key = `${r.state}::${r.protectedAreaName}`;
      const entry = unmatchedByKey.get(key) || {
        paKey: key,
        wikidataId: null,
        name: r.protectedAreaName,
        protectedAreaType: r.protectedAreaType,
        state: [r.state].filter(Boolean),
        wikidataUrl: null,
        iucnCategory: null,
        area: null,
        pageBanner: null,
        image: null,
        enwikiUrl: null,
        osmRelationIds: [],
        coordinateLatitude: null,
        coordinateLongitude: null,
        notifications: [],
      };
      entry.notifications.push(notification);
      unmatchedByKey.set(key, entry);
    }
  }

  function summarize(notifications) {
    const hasFinal = notifications.some((n) => n.notificationStatus === 'Final');
    const hasDraft = notifications.some((n) => n.notificationStatus === 'Draft');
    const eszStatus = hasFinal ? 'final' : hasDraft ? 'draft' : 'none';
    const latestRecord = hasFinal ? pickLatest(notifications, 'Final') : hasDraft ? pickLatest(notifications, 'Draft') : null;
    const latest = latestRecord && {
      status: latestRecord.notificationStatus,
      date: latestRecord.notificationDate,
      orderNumber: latestRecord.orderNumber,
      pdfLink: latestRecord.notificationPdfLink,
      archiveLink: latestRecord.notificationArchiveLink,
    };
    return { hasFinal, hasDraft, eszStatus, latest };
  }

  const entries = [];

  for (const pa of wikidataPAs) {
    const notifications = notificationsByWikidataId.get(pa.wikidataId) || [];
    entries.push({
      paKey: pa.wikidataId,
      wikidataId: pa.wikidataId,
      name: pa.wikidataLabel,
      protectedAreaType: pa.protectedAreaType,
      state: pa.state || [],
      wikidataUrl: pa.wikidataUrl,
      iucnCategory: pa.iucnCategory || null,
      area: pa.area || null,
      pageBanner: pa.pageBanner || null,
      image: pa.image || null,
      enwikiUrl: pa.enwikiUrl || null,
      osmRelationIds: pa.osmRelationIds || [],
      osmFeatureIds: osmByWikidata[pa.wikidataId] || [],
      osmEszIds: osmEszByWikidata[pa.wikidataId] || [],
      ...osmExtent([
        ...(pa.osmRelationIds || []).map((id) => `relation/${id}`),
        ...(osmByWikidata[pa.wikidataId] || []),
      ]),
      coordinateLatitude: pa.coordinateLatitude ?? null,
      coordinateLongitude: pa.coordinateLongitude ?? null,
      ...summarize(notifications),
      notifications,
    });
  }

  for (const entry of unmatchedByKey.values()) {
    entry.notifications.sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''));
    Object.assign(entry, summarize(entry.notifications));
    entries.push(entry);
  }

  await writeFile('data/full-join.json', JSON.stringify(entries), 'utf8');

  const withCoords = entries.filter((e) => e.coordinateLatitude != null).length;
  const byStatus = { final: 0, draft: 0, none: 0 };
  for (const e of entries) byStatus[e.eszStatus] += 1;
  console.log(`Wrote ${entries.length} protected areas to data/full-join.json (${withCoords} with coordinates, ${entries.length - wikidataPAs.length} unmatched-to-Wikidata).`);
  console.log('By ESZ status:', byStatus);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
