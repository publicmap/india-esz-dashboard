// Downloads every OSM protected area in India from Postpass
// (https://wiki.openstreetmap.org/wiki/Postpass) and builds
// data/osm/india-protected-areas-all.pmtiles: vector tiles (tippecanoe, layer
// `protected_areas`, one property per OSM tag), which the dashboard map reads
// straight from GitHub Pages via range requests. The intermediate GeoJSON is
// kept in .cache/osm/ only. Also writes data/osm/india-protected-areas-wikidata.json,
// {<wikidata QID>: [<osm type/id>, ...]} for every feature with a wikidata tag,
// which build-full-join.js uses to mark protected areas as mapped in OSM, and
// data/osm/india-protected-areas-bbox.json, {<osm type/id>: {bbox: [west,
// south, east, north], areaKm2}} for every polygon feature, which
// build-full-join.js attaches to each protected area so the map can fit to
// its OSM boundary and size its marker by area, and
// data/osm/india-protected-areas-esz.json, {<osm type/id>: name} for every
// ESZ polygon (see writeEszIndex).
//
// Selection: boundary=protected_area, boundary=national_park, or any feature
// with a protect_class tag. Points (nodes) are kept as well as polygons.
// This is wider than enrich-osm.js, which keeps only protect_class 2/4/6 for
// Wikidata matching.
//
// The Postpass query only uses a bbox, which the spatial index makes cheap.
// Each feature's point-on-surface is then tested locally against India's
// outline: OSM relation 304716, simplified on the server and committed as
// data/osm/india-outline.geojson. Intersecting with the full relation on the
// server is slow, because it is a very large multipolygon. Matching by
// point-on-surface keeps a park that straddles the border when its interior
// point is in India. The outline is committed rather than fetched each run
// because the border rarely changes, and Postpass sometimes holds the
// relation with a NULL geometry when an OSM edit leaves its rings broken
// (seen 2026-11-23); --refresh-india refetches it.
//
// Usage: node scripts/build-osm-protected-areas.js [--refresh-india]
//        node scripts/build-osm-protected-areas.js --bbox-only
//          (rewrites only the bbox and ESZ indexes, from the cached GeoJSON -- no
//          Postpass download or tippecanoe run)
import { mkdir, readFile, writeFile, access, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const POSTPASS = 'https://postpass.geofabrik.de/api/interpreter';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const INDIA_RELATION = 304716;
const INDIA_BBOX = [68, 6, 98, 38]; // mainland plus Andaman & Nicobar and Lakshadweep
const INDIA_OUTLINE_PATH = 'data/osm/india-outline.geojson';
const GEOJSON_PATH = '.cache/osm/india-protected-areas-all.geojson';
const WIKIDATA_INDEX_PATH = 'data/osm/india-protected-areas-wikidata.json';
const BBOX_INDEX_PATH = 'data/osm/india-protected-areas-bbox.json';
const ESZ_INDEX_PATH = 'data/osm/india-protected-areas-esz.json';
const PMTILES_PATH = 'data/osm/india-protected-areas-all.pmtiles';
const OSM_TYPE = { N: 'node', W: 'way', R: 'relation' };

const exists = (p) => access(p).then(() => true, () => false);

async function postpass(sql) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(POSTPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
      body: `data=${encodeURIComponent(sql)}`,
    });
    if (res.ok) return res.json();
    const text = await res.text();
    if (attempt >= 3 || res.status < 500) throw new Error(`Postpass ${res.status}: ${text.slice(0, 500)}`);
    console.error(`Postpass ${res.status}, retrying...`);
    await new Promise((r) => setTimeout(r, 10000 * attempt));
  }
}

async function indiaOutline(refresh) {
  if (!refresh && await exists(INDIA_OUTLINE_PATH)) return JSON.parse(await readFile(INDIA_OUTLINE_PATH, 'utf8'));
  console.log(`Fetching India outline (relation ${INDIA_RELATION})...`);
  const fc = await postpass(`
    SELECT osm_id, ST_SimplifyPreserveTopology(geom, 0.002) AS geom
    FROM postpass_polygon WHERE osm_type = 'R' AND osm_id = ${INDIA_RELATION}`);
  if (!fc.features?.length) throw new Error('India relation not found in Postpass');
  const type = fc.features[0].geometry?.type;
  if (type !== 'Polygon' && type !== 'MultiPolygon') {
    throw new Error(`Postpass returned no polygon for India relation ${INDIA_RELATION} (geometry type ${type}): `
      + `its rings are probably broken in OSM right now. Keep the committed ${INDIA_OUTLINE_PATH} and retry later.`);
  }
  await mkdir('data/osm', { recursive: true });
  await writeFile(INDIA_OUTLINE_PATH, JSON.stringify(fc));
  return fc;
}

// Even-odd ray casting over every ring of a (Multi)Polygon. Holes are just
// more rings, so even-odd handles them.
function makeContains(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const rings = polys.flat().map((ring) => {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const [x, y] of ring) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    return { ring, minX, minY, maxX, maxY };
  });
  return ([x, y]) => {
    let inside = false;
    for (const { ring, minX, minY, maxX, maxY } of rings) {
      if (y < minY || y > maxY || x > maxX) continue;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  };
}

// Spherical area of a lon/lat ring in km^2 (the formula turf.area uses;
// Chamberlain & Duquette 2007). Sign follows winding, so callers take abs.
const EARTH_RADIUS_KM = 6378.137;
function ringAreaKm2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i]; const [x2, y2] = ring[i + 1];
    sum += ((x2 - x1) * Math.PI / 180) * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
  }
  return (sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
}

// {<osm type/id>: {bbox: [west, south, east, north], areaKm2}} for every
// polygon feature (points have no extent), bbox rounded to ~1 m. Area is
// each polygon's outer ring minus its holes.
async function writeBboxIndex(features) {
  const round = (v) => Math.round(v * 1e5) / 1e5;
  const index = {};
  for (const f of features) {
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
    let w = Infinity; let s = Infinity; let e = -Infinity; let n = -Infinity;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const [x, y] of polys.flat(2)) { w = Math.min(w, x); s = Math.min(s, y); e = Math.max(e, x); n = Math.max(n, y); }
    let area = 0;
    for (const [outer, ...holes] of polys) {
      area += Math.abs(ringAreaKm2(outer)) - holes.reduce((sum, h) => sum + Math.abs(ringAreaKm2(h)), 0);
    }
    index[f.properties['@id']] = { bbox: [round(w), round(s), round(e), round(n)], areaKm2: Math.round(area * 100) / 100 };
  }
  await writeFile(BBOX_INDEX_PATH, `${JSON.stringify(index)}\n`);
  console.log(`Wrote ${BBOX_INDEX_PATH} (${Object.keys(index).length} features).`);
}

// OSM maps ESZs as their own polygons, named after their PA ("Kali TR ESZ",
// "Galathea National Park Eco-Sensitive Zone") and without a wikidata tag.
// Writes {<osm type/id>: name} for each, which build-full-join.js matches to
// PAs by name so the map can colour an ESZ by its PA's notification status.
// Same classification as the map's osmPaZoneExpr (eco-sensitive *areas* are
// a different thing and left out).
async function writeEszIndex(features) {
  const index = {};
  for (const f of features) {
    const p = f.properties;
    const text = `${p.name || ''} | ${p['name:en'] || ''} | ${p.protection_title || ''}`.toLowerCase();
    if (text.includes('sensitive area') || !(text.includes('sensitive zone') || /\besz\b/.test(text))) continue;
    index[p['@id']] = p['name:en'] || p.name || '';
  }
  await writeFile(ESZ_INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${ESZ_INDEX_PATH} (${Object.keys(index).length} ESZ features).`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--bbox-only')) {
    if (!await exists(GEOJSON_PATH)) throw new Error(`${GEOJSON_PATH} not found -- run without --bbox-only first`);
    const cached = JSON.parse(await readFile(GEOJSON_PATH, 'utf8')).features;
    await writeBboxIndex(cached);
    await writeEszIndex(cached);
    return;
  }
  const india = await indiaOutline(args.includes('--refresh-india'));
  const contains = makeContains(india.features[0].geometry);

  console.log('Querying Postpass for protected areas in the India bbox...');
  const t0 = Date.now();
  const fc = await postpass(`
    SELECT osm_type, osm_id, tags,
      ST_X(ST_PointOnSurface(geom)) AS lon, ST_Y(ST_PointOnSurface(geom)) AS lat,
      geom
    FROM postpass_pointpolygon
    WHERE geom && ST_MakeEnvelope(${INDIA_BBOX.join(', ')}, 4326)
      AND (tags->>'boundary' IN ('protected_area', 'national_park') OR tags ? 'protect_class')`);
  console.log(`Fetched ${fc.features.length} features in ${Math.round((Date.now() - t0) / 1000)} s.`);

  const features = [];
  for (const f of fc.features) {
    const { osm_type: type, osm_id: id, tags, lon, lat } = f.properties;
    if (!contains([lon, lat])) continue;
    features.push({
      type: 'Feature',
      id: Number(id) * 10 + { N: 1, W: 2, R: 3 }[type], // unique numeric id for tippecanoe
      geometry: f.geometry,
      properties: { '@id': `${OSM_TYPE[type]}/${id}`, ...tags },
    });
  }
  features.sort((a, b) => a.properties['@id'].localeCompare(b.properties['@id'], 'en', { numeric: true }));
  console.log(`${features.length} features inside India (${fc.features.length - features.length} outside dropped).`);

  const byWikidata = {};
  for (const f of features) {
    for (const qid of String(f.properties.wikidata ?? '').split(';').map((q) => q.trim()).filter((q) => /^Q\d+$/.test(q))) {
      (byWikidata[qid] ??= []).push(f.properties['@id']);
    }
  }
  const sortedIndex = Object.fromEntries(Object.entries(byWikidata).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1))));
  await writeFile(WIKIDATA_INDEX_PATH, `${JSON.stringify(sortedIndex, null, 1)}\n`);
  console.log(`Wrote ${WIKIDATA_INDEX_PATH} (${Object.keys(sortedIndex).length} Wikidata items).`);

  await writeBboxIndex(features);
  await writeEszIndex(features);

  await mkdir('.cache/osm', { recursive: true });
  await writeFile(GEOJSON_PATH, JSON.stringify({ type: 'FeatureCollection', features }));

  const run = (cmd, cmdArgs) => {
    const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
    if (r.error) throw new Error(`${cmd} not available: ${r.error.message}`);
    if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
  };
  // Written to a temporary name (tippecanoe picks the format from the
  // extension) and renamed, so a failed run leaves the previous tiles intact.
  const tmpPmtiles = PMTILES_PATH.replace(/\.pmtiles$/, '.tmp.pmtiles');
  run('tippecanoe', [
    '-o', tmpPmtiles, '--force', '-l', 'protected_areas', '-n', 'India protected areas (OpenStreetMap)',
    '-A', '© OpenStreetMap contributors', '-Z0', '-z12', '--drop-densest-as-needed', '--extend-zooms-if-still-dropping',
    '--detect-shared-borders', '--quiet', GEOJSON_PATH,
  ]);
  await rename(tmpPmtiles, PMTILES_PATH);
  console.log(`Wrote ${PMTILES_PATH}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
