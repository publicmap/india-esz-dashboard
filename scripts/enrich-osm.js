// Fetches every OSM protected-area / national-park boundary in India via
// Postpass (https://wiki.openstreetmap.org/wiki/Postpass), a read-only
// SQL-over-OSM-data query service updated every 5 minutes from planet data.
//
// data/osm/india-protected_areas.overpass.ql.txt records the original
// Overpass QL query (boundary=protected_area with protect_class 4/6, or
// boundary=national_park with protect_class 2, inside an India geocode
// area) that this pipeline is meant to reproduce -- but Postpass does not
// execute Overpass QL itself, only SQL against its postpass_* tables, so
// SQL_QUERY below is a hand-translation of that same tag filter rather than
// something generated from the .txt file.
//
// Writes a full-geometry GeoJSON cache (data/osm/protected-areas.geojson,
// used later for point-in-polygon QA checks) and a flat CSV cache with a
// lon/lat centroid per feature (data/osm/protected-areas.csv). Both are
// consumed by enrich-wikidata.js to cross-reference OSM <-> Wikidata ids.
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { diffByKey, logDiff } from './lib/diff-log.js';
import { osmKey } from './lib/osm-cache.js';

const POSTPASS_ENDPOINT = 'https://postpass.geofabrik.de/api/interpreter';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const GEOJSON_PATH = 'data/osm/protected-areas.geojson';
const CSV_PATH = 'data/osm/protected-areas.csv';

async function loadPreviousCsvRows() {
  let text;
  try {
    text = await readFile(CSV_PATH, 'utf8');
  } catch {
    return [];
  }
  return text.trim() ? parse(text, { columns: true, skip_empty_lines: true }) : [];
}

function describeFeature(r) {
  return `${r.name || r.nameEn || '(unnamed)'} -- ${r.osmUrl}${r.wikidata ? ` -> https://www.wikidata.org/wiki/${r.wikidata}` : ''}`;
}

// Bounding box covering mainland India plus Andaman & Nicobar and
// Lakshadweep. Deliberately a loose bbox rather than an exact India
// admin-boundary polygon -- India's own boundary relation is a huge,
// hole-riddled multipolygon that is slow/unreliable to intersect against on
// a shared query service. A handful of protected areas just across the
// Nepal/Bangladesh/Myanmar/Pakistan/Sri Lanka border slipping in here is
// harmless: every downstream match is keyed by wikidata id or name, not by
// membership in this bbox, so a stray neighboring-country feature simply
// never matches anything and is ignored.
const INDIA_BBOX = [68, 6, 98, 38];

// The source .txt query pairs boundary=protected_area only with
// protect_class 4/6, and boundary=national_park only with protect_class 2 --
// but in practice OSM mappers tag plenty of IUCN-category-II sites (e.g.
// Jim Corbett, Kanha, Bandhavgarh, Keoladeo/Kevladev National Parks) as
// boundary=protected_area + protect_class=2 rather than
// boundary=national_park, so a literal translation of the original query
// silently drops several of India's best-known national parks. protect_class
// (the actual IUCN category: 2=National Park, 4=Habitat/Species Management
// Area i.e. wildlife sanctuary, 6=Protected area with sustainable use) is
// the semantic driver here, not which boundary= value was used to express
// it, so this accepts either boundary value for all three protect_class
// codes rather than reproducing that pairing bug.
const SQL_QUERY = `
SELECT osm_id, osm_type, tags,
  ST_X(ST_Centroid(geom)) AS centroid_lon, ST_Y(ST_Centroid(geom)) AS centroid_lat,
  ST_GeometryType(geom) AS geometry_type, geom
FROM postpass_pointpolygon
WHERE tags->>'boundary' IN ('protected_area', 'national_park')
  AND tags->>'protect_class' IN ('2', '4', '6')
  AND ST_Intersects(geom, ST_MakeEnvelope(${INDIA_BBOX.join(', ')}, 4326))
`;

// Postpass reports osm_type as OSM's own single-letter element codes.
const OSM_TYPE_NAME = { N: 'node', W: 'way', R: 'relation' };

function buildOsmUrl(osmType, osmId) {
  return `https://www.openstreetmap.org/${OSM_TYPE_NAME[osmType] ?? 'node'}/${osmId}`;
}

async function queryPostpass(sql) {
  const res = await fetch(POSTPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(sql)}`,
  });
  if (!res.ok) throw new Error(`Postpass query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function toProperties(feature) {
  const {
    osm_id: osmId, osm_type: osmType, tags,
    centroid_lon: centroidLon, centroid_lat: centroidLat, geometry_type: geometryType,
  } = feature.properties;
  return {
    osmType: OSM_TYPE_NAME[osmType] ?? osmType,
    osmId,
    osmUrl: buildOsmUrl(osmType, osmId),
    name: tags.name ?? '',
    nameEn: tags['name:en'] ?? '',
    wikidata: tags.wikidata ?? '',
    wikipedia: tags.wikipedia ?? '',
    boundary: tags.boundary ?? '',
    protectClass: tags.protect_class ?? '',
    protectionTitle: tags.protection_title ?? '',
    operator: tags.operator ?? '',
    centroidLat,
    centroidLon,
    geometryType,
  };
}

async function main() {
  const previousRows = await loadPreviousCsvRows();

  console.log('Querying Postpass for Indian protected-area / national-park OSM boundaries...');
  const fc = await queryPostpass(SQL_QUERY);
  console.log(`Fetched ${fc.features.length} OSM features.`);

  const features = fc.features.map((f) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: toProperties(f),
  }));
  await writeFile(GEOJSON_PATH, JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'utf8');

  const csvRows = features.map((f) => f.properties);
  await writeFile(CSV_PATH, stringify(csvRows, { header: true }), 'utf8');

  const withWikidata = csvRows.filter((r) => r.wikidata).length;
  console.log(`Wrote ${csvRows.length} features to ${GEOJSON_PATH} and ${CSV_PATH}.`);
  console.log(`  with wikidata tag: ${withWikidata}`);
  console.log(`  without wikidata tag: ${csvRows.length - withWikidata}`);

  const diff = diffByKey(previousRows, csvRows, (r) => osmKey(r.osmType, r.osmId));
  logDiff('OSM features', diff, describeFeature);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
