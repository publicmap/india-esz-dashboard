// Downloads every OSM protected area in India from Postpass
// (https://wiki.openstreetmap.org/wiki/Postpass) and builds:
//   data/osm/india-protected-areas-all.geojson   all features, one property per OSM tag
//   data/osm/india-protected-areas-all.mbtiles   the same, as vector tiles (tippecanoe)
//
// Selection: boundary=protected_area, boundary=national_park, or any feature
// with a protect_class tag. Points (nodes) are kept as well as polygons.
// This is wider than enrich-osm.js, which keeps only protect_class 2/4/6 for
// Wikidata matching.
//
// The Postpass query only uses a bbox, which the spatial index makes cheap.
// Each feature's point-on-surface is then tested locally against India's
// outline: OSM relation 304716, simplified on the server and cached in
// .cache/osm/india.geojson. Intersecting with the full relation on the
// server is slow, because it is a very large multipolygon. Matching by
// point-on-surface keeps a park that straddles the border when its interior
// point is in India.
//
// Usage: node scripts/build-osm-protected-areas.js [--refresh-india] [--no-tiles]
import { mkdir, readFile, writeFile, access, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const POSTPASS = 'https://postpass.geofabrik.de/api/interpreter';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const INDIA_RELATION = 304716;
const INDIA_BBOX = [68, 6, 98, 38]; // mainland plus Andaman & Nicobar and Lakshadweep
const INDIA_CACHE = '.cache/osm/india.geojson';
const GEOJSON_PATH = 'data/osm/india-protected-areas-all.geojson';
const MBTILES_PATH = 'data/osm/india-protected-areas-all.mbtiles';
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
  if (!refresh && await exists(INDIA_CACHE)) return JSON.parse(await readFile(INDIA_CACHE, 'utf8'));
  console.log('Fetching India outline (relation 304716)...');
  const fc = await postpass(`
    SELECT osm_id, ST_SimplifyPreserveTopology(geom, 0.002) AS geom
    FROM postpass_polygon WHERE osm_type = 'R' AND osm_id = ${INDIA_RELATION}`);
  if (!fc.features?.length) throw new Error('India relation not found in Postpass');
  await mkdir('.cache/osm', { recursive: true });
  await writeFile(INDIA_CACHE, JSON.stringify(fc));
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

async function main() {
  const args = process.argv.slice(2);
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

  // One feature per line: valid GeoJSON that still diffs line by line.
  await writeFile(GEOJSON_PATH, `{"type":"FeatureCollection","features":[\n${features.map((f) => JSON.stringify(f)).join(',\n')}\n]}\n`);
  console.log(`Wrote ${GEOJSON_PATH}.`);

  if (args.includes('--no-tiles')) return;
  const tmp = `${MBTILES_PATH}.tmp`;
  const r = spawnSync('tippecanoe', [
    '-o', tmp, '--force', '-l', 'protected_areas', '-n', 'India protected areas (OpenStreetMap)',
    '-A', '© OpenStreetMap contributors', '-Z0', '-z12', '--drop-densest-as-needed', '--extend-zooms-if-still-dropping',
    '--detect-shared-borders', '--quiet', GEOJSON_PATH,
  ], { stdio: 'inherit' });
  if (r.error) throw new Error(`tippecanoe not available: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`tippecanoe exited with ${r.status}`);
  await rename(tmp, MBTILES_PATH);
  console.log(`Wrote ${MBTILES_PATH}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
