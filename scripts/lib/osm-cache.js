// Loads the OSM protected-area cache written by enrich-osm.js
// (data/osm/protected-areas.{geojson,csv}) for consumption by
// enrich-wikidata.js's OSM cross-reference + QA pass.
import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

export const OSM_CSV_PATH = 'data/osm/protected-areas.csv';
export const OSM_GEOJSON_PATH = 'data/osm/protected-areas.geojson';

// osm_id is only unique within one element type (a way and a relation can
// legitimately share the same numeric id), so every lookup key is the
// "type/id" pair, matching the path segment used in OSM URLs.
export function osmKey(osmType, osmId) {
  return `${osmType}/${osmId}`;
}

function splitWikidataTag(value) {
  // A very small number of OSM objects tag more than one wikidata id on a
  // single element (semicolon-separated), e.g. a combined core+buffer relation.
  return value ? value.split(';').map((s) => s.trim()).filter(Boolean) : [];
}

// Returns null when the cache hasn't been generated yet (npm run enrich:osm),
// so callers can skip OSM cross-referencing gracefully instead of crashing.
export async function loadOsmCache(csvPath = OSM_CSV_PATH, geojsonPath = OSM_GEOJSON_PATH) {
  let csvText;
  try {
    csvText = await readFile(csvPath, 'utf8');
  } catch {
    return null;
  }
  const rows = csvText.trim() ? parse(csvText, { columns: true, skip_empty_lines: true }) : [];
  const features = rows.map((r) => ({
    ...r,
    wikidataIds: splitWikidataTag(r.wikidata),
    centroidLat: r.centroidLat ? Number(r.centroidLat) : null,
    centroidLon: r.centroidLon ? Number(r.centroidLon) : null,
  }));

  let geojson = null;
  try {
    geojson = JSON.parse(await readFile(geojsonPath, 'utf8'));
  } catch {
    geojson = null;
  }
  const geometryByKey = new Map();
  if (geojson) {
    for (const f of geojson.features) {
      geometryByKey.set(osmKey(f.properties.osmType, f.properties.osmId), f.geometry);
    }
  }

  const byWikidataId = new Map();
  for (const f of features) {
    for (const qid of f.wikidataIds) {
      if (!byWikidataId.has(qid)) byWikidataId.set(qid, []);
      byWikidataId.get(qid).push(f);
    }
  }

  const byOsmKey = new Map(features.map((f) => [osmKey(f.osmType, f.osmId), f]));

  return {
    features, byWikidataId, byOsmKey, geometryByKey,
  };
}
