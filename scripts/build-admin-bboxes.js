// Bounding boxes for where each protected area sits, so links into the
// Allmaps editor can open its georeference map there instead of on the whole
// world (the editor's `bbox` URL parameter; allmaps/allmaps#653).
//
// For every Wikidata PA in data/wikidata/protected-areas.json, fetches its
// "located in the administrative territorial entity" (P131) items, and for
// those and every current state/UT (scripts/lib/india-states.js), the bbox of
// their OSM boundary from Nominatim: a /lookup of Wikidata's OSM relation ID
// (P402) where set, else a /search for the item's label in India, keeping a
// boundary result (the one tagged wikidata=<QID> if any is).
//
// Nominatim answers are cached in data/osm/nominatim-bounds.json (keyed
// "R<relation id>" or "search:<QID>") and reused on later runs, so only new
// places are looked up -- at most one request a second, per Nominatim's usage
// policy. Delete an entry (or the file) to look it up again.
//
// Output, data/osm/admin-bboxes.json:
//   { admins: { <QID>: { label, bbox } },   bbox = [west, south, east, north]
//     paAdmins: { <PA QID>: [<QID>, ...] },  that PA's P131 items with a bbox
//     states: { <normalized state name>: <QID> } }
// build-full-join.js turns it into each entry's allmapsBbox.
//
// Usage: node scripts/build-admin-bboxes.js

import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolveStateQid } from './lib/india-states.js';

const WIKIDATA_JSON_PATH = 'data/wikidata/protected-areas.json';
const OUT_PATH = 'data/osm/admin-bboxes.json';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org';
const NOMINATIM_CACHE_PATH = 'data/osm/nominatim-bounds.json';
const NOMINATIM_BATCH = 50; // /lookup's limit on osm_ids per request
const NOMINATIM_INTERVAL_MS = 1100;
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const INDIA_QID = 'Q668';
// Rough India extent with a margin: a "boundary" outside it is a bad match.
const INDIA_LIMITS = [66, 5, 99, 38];
const CHUNK = 200;
// Degrees a PA's Wikidata coordinate may sit outside its P131 bounds.
const COORD_MARGIN = 0.1;

const qidOf = (uri) => uri.replace('http://www.wikidata.org/entity/', '');
const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

async function sparql(query) {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`SPARQL query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).results.bindings;
}

let lastNominatimRequest = 0;
async function nominatim(pathAndQuery) {
  const wait = lastNominatimRequest + NOMINATIM_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatimRequest = Date.now();
  const res = await fetch(`${NOMINATIM_ENDPOINT}${pathAndQuery}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${pathAndQuery} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Nominatim's boundingbox is [south, north, west, east] as strings.
const toBbox = (b) => [b[2], b[0], b[3], b[1]].map((v) => Math.round(Number(v) * 1e5) / 1e5);
const insideIndia = ([w, s, e, n]) => w >= INDIA_LIMITS[0] && s >= INDIA_LIMITS[1] && e <= INDIA_LIMITS[2] && n <= INDIA_LIMITS[3];

async function main() {
  const pas = JSON.parse(await readFile(WIKIDATA_JSON_PATH, 'utf8'));
  const paQids = [...new Set(pas.map((p) => p.wikidataId).filter(Boolean))];

  // PA -> P131 items.
  const paAdminQids = new Map();
  for (const part of chunks(paQids, CHUNK)) {
    const rows = await sparql(`SELECT ?pa ?admin WHERE {
      VALUES ?pa { ${part.map((q) => `wd:${q}`).join(' ')} }
      ?pa wdt:P131 ?admin .
    }`);
    for (const r of rows) {
      const pa = qidOf(r.pa.value);
      const admin = qidOf(r.admin.value);
      if (admin === INDIA_QID) continue;
      if (!paAdminQids.has(pa)) paAdminQids.set(pa, new Set());
      paAdminQids.get(pa).add(admin);
    }
  }

  const stateNames = new Set(pas.flatMap((p) => p.state || []));
  const moef = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  for (const r of moef) if (r.state) stateNames.add(r.state);
  const states = {};
  for (const name of stateNames) {
    const qid = resolveStateQid(name);
    if (qid) states[name] = qid;
  }

  // Labels and OSM relation IDs for every admin item.
  const adminQids = [...new Set([...[...paAdminQids.values()].flatMap((s) => [...s]), ...Object.values(states)])];
  const admins = new Map(adminQids.map((q) => [q, { label: null, relations: [] }]));
  for (const part of chunks(adminQids, CHUNK)) {
    const rows = await sparql(`SELECT ?item ?itemLabel ?osm WHERE {
      VALUES ?item { ${part.map((q) => `wd:${q}`).join(' ')} }
      OPTIONAL { ?item wdt:P402 ?osm }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
    }`);
    for (const r of rows) {
      const a = admins.get(qidOf(r.item.value));
      a.label = r.itemLabel?.value ?? a.label;
      if (r.osm?.value && !a.relations.includes(r.osm.value)) a.relations.push(r.osm.value);
    }
  }

  // Bboxes from Nominatim, through the cache. A cached null is a lookup that
  // found nothing, so it isn't retried every run.
  let cache = {};
  try { cache = JSON.parse(await readFile(NOMINATIM_CACHE_PATH, 'utf8')); } catch { cache = {}; }
  const relKeys = [...new Set([...admins.values()].flatMap((a) => a.relations.map((id) => `R${id}`)))];
  for (const part of chunks(relKeys.filter((k) => !(k in cache)), NOMINATIM_BATCH)) {
    const results = await nominatim(`/lookup?format=json&osm_ids=${part.join(',')}`);
    for (const k of part) cache[k] = null;
    for (const r of results) if (r.boundingbox) cache[`R${r.osm_id}`] = { name: r.display_name, bbox: toBbox(r.boundingbox) };
  }
  const bboxes = new Map();
  for (const [qid, a] of admins) {
    const boxes = a.relations.map((id) => cache[`R${id}`]?.bbox).filter(Boolean);
    if (boxes.length) bboxes.set(qid, union(boxes));
  }
  for (const [qid, a] of admins) {
    if (bboxes.has(qid) || !a.label) continue;
    const key = `search:${qid}`;
    if (!(key in cache)) {
      const results = await nominatim(`/search?format=json&countrycodes=in&extratags=1&limit=10&q=${encodeURIComponent(a.label)}`);
      const boundaries = results.filter((r) => r.class === 'boundary' && r.boundingbox);
      const hit = boundaries.find((r) => r.extratags?.wikidata === qid)
        ?? boundaries.find((r) => !r.extratags?.wikidata);
      cache[key] = hit ? { name: hit.display_name, osm: `${hit.osm_type}/${hit.osm_id}`, bbox: toBbox(hit.boundingbox) } : null;
    }
    if (cache[key]?.bbox) bboxes.set(qid, cache[key].bbox);
  }
  const sortedCache = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(NOMINATIM_CACHE_PATH, `${JSON.stringify(sortedCache, null, 1)}\n`);

  const out = { admins: {}, paAdmins: {}, states };
  for (const [qid, a] of admins) {
    const bbox = bboxes.get(qid);
    if (bbox && insideIndia(bbox)) out.admins[qid] = { label: a.label, bbox };
  }
  // A P131 whose bounds miss the PA's own coordinate is a Wikidata error
  // (e.g. Siju WLS "located in" Manipur) -- skip it, so the PA falls back to
  // its state, and list it for fixing on Wikidata.
  const coords = new Map(pas.map((p) => [p.wikidataId, [p.coordinateLongitude, p.coordinateLatitude]]));
  const mislocated = [];
  for (const [pa, set] of [...paAdminQids].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const withBbox = [...set].filter((q) => out.admins[q]).sort();
    if (!withBbox.length) continue;
    const [lon, lat] = coords.get(pa) ?? [];
    const [w, s, e, n] = union(withBbox.map((q) => out.admins[q].bbox));
    if (lon != null && lat != null
      && !(lon >= w - COORD_MARGIN && lon <= e + COORD_MARGIN && lat >= s - COORD_MARGIN && lat <= n + COORD_MARGIN)) {
      mislocated.push(`${pas.find((p) => p.wikidataId === pa)?.wikidataLabel} (${pa}) in ${withBbox.map((q) => out.admins[q].label).join(', ')}`);
      continue;
    }
    out.paAdmins[pa] = withBbox;
  }
  out.admins = Object.fromEntries(Object.entries(out.admins).sort(([a], [b]) => (a < b ? -1 : 1)));
  out.states = Object.fromEntries(Object.entries(states).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(OUT_PATH, `${JSON.stringify(out, null, 1)}\n`);

  const missing = [...admins].filter(([q]) => !out.admins[q]).map(([q, a]) => `${a.label ?? '?'} (${q})`);
  console.log(`Wrote ${OUT_PATH}: ${Object.keys(out.admins).length} admin bboxes, ${Object.keys(out.paAdmins).length} of ${paQids.length} PAs located, ${Object.keys(states).length} state names.`);
  if (mislocated.length) console.log(`PA coordinate outside its P131 bounds, so using the state instead (check Wikidata) for ${mislocated.length}:\n  ${mislocated.join('\n  ')}`);
  if (missing.length) console.log(`No usable OSM boundary for ${missing.length}: ${missing.join(', ')}`);
}

export function union(boxes) {
  return [
    Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3])),
  ];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
