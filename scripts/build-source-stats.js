// Builds data/source-stats.json -- small summary the dashboard's status bar
// uses to show "how big is each upstream source" (Total Protected Areas /
// Tiger Reserves / National Parks / Wildlife Sanctuaries) plus a per-source
// "last updated" date, without the client having to fetch each source's raw
// file.
//
// "Last updated" isn't the time this script ran (the pipeline can run and
// find nothing new) -- it's the last time a source's content actually
// changed. We detect that by hashing each source's relevant content and
// comparing against the hash stored in the previous data/source-stats.json:
// same hash keeps the old timestamp, different hash (or first run) stamps
// "now". This also keeps CI shallow-clones (which don't have real git
// history to consult) out of the picture entirely.

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';

const OUTPUT_PATH = 'data/source-stats.json';

function hashOf(...parts) {
  return createHash('sha256').update(parts.join(' ')).digest('hex');
}

function bucketByType(types) {
  const counts = { total: 0, tigerReserve: 0, nationalPark: 0, wildlifeSanctuary: 0 };
  for (const type of types) {
    counts.total += 1;
    if (type === 'Tiger Reserve') counts.tigerReserve += 1;
    else if (type === 'National Park') counts.nationalPark += 1;
    else if (type === 'Wildlife Sanctuary' || type === 'Bird Sanctuary') counts.wildlifeSanctuary += 1;
  }
  return counts;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

// Flattens previous runs' sources for hash-lookup, including MoEFCC/Wikidata/
// Wikipedia/OpenStreetMap however they're currently nested (previously
// top-level, now under Conflated's `breakdown`) -- so a schema change here
// doesn't reset every source's "last updated" clock back to "now".
function flattenPreviousSources(sources) {
  const byId = new Map();
  for (const s of sources) {
    byId.set(s.id, s);
    for (const b of s.breakdown || []) if (b.id) byId.set(b.id, b);
  }
  return byId;
}

async function main() {
  const previous = await readJson(OUTPUT_PATH).catch(() => ({ sources: [] }));
  const previousById = flattenPreviousSources(previous.sources);

  function withLastUpdated(id, label, url, contentHash, counts) {
    const prev = previousById.get(id);
    const lastUpdated = prev && prev.contentHash === contentHash ? prev.lastUpdated : new Date().toISOString();
    return { id, label, url, lastUpdated, contentHash, counts };
  }

  // full-join.json is the outer join of the MoEF notification list against
  // Wikidata (see build-full-join.js): every entry with a wikidataId came
  // from Wikidata, every entry with notifications came from the MoEF list
  // (whether or not it matched a Wikidata item), so both source sizes can be
  // read off it directly instead of re-deriving from the raw files.
  const fullJoin = await readJson('data/full-join.json');
  const wikidataEntries = fullJoin.filter((e) => e.wikidataId);
  const moefEntries = fullJoin.filter((e) => e.notifications && e.notifications.length > 0);

  const wikidata = withLastUpdated(
    'wikidata',
    'Wikidata',
    'https://www.wikidata.org/wiki/Q473972',
    hashOf(...wikidataEntries.map((e) => `${e.wikidataId}:${e.protectedAreaType}`).sort()),
    bucketByType(wikidataEntries.map((e) => e.protectedAreaType)),
  );

  const moefcc = withLastUpdated(
    'moefcc',
    'MoEFCC',
    'https://moef.gov.in/esz-notifications',
    hashOf(...moefEntries.map((e) => `${e.paKey}:${e.protectedAreaType}`).sort()),
    bucketByType(moefEntries.map((e) => e.protectedAreaType)),
  );

  // Wikipedia's three "List of..." tables aren't joined into full-join.json
  // at all, so read them directly -- each is already scoped to one type.
  const [wpNationalParks, wpTigerReserves, wpWildlifeSanctuaries] = await Promise.all([
    readJson('data/wikipedia/national-parks.json'),
    readJson('data/wikipedia/tiger-reserves.json'),
    readJson('data/wikipedia/wildlife-sanctuaries.json'),
  ]);
  const wikipediaCounts = {
    total: wpNationalParks.length + wpTigerReserves.length + wpWildlifeSanctuaries.length,
    tigerReserve: wpTigerReserves.length,
    nationalPark: wpNationalParks.length,
    wildlifeSanctuary: wpWildlifeSanctuaries.length,
  };
  const wikipedia = withLastUpdated(
    'wikipedia',
    'Wikipedia',
    'https://en.wikipedia.org/wiki/List_of_national_parks_of_India',
    hashOf(
      wpNationalParks.map((p) => p.protectedAreaName).sort().join(','),
      wpTigerReserves.map((p) => p.protectedAreaName).sort().join(','),
      wpWildlifeSanctuaries.map((p) => p.protectedAreaName).sort().join(','),
    ),
    wikipediaCounts,
  );

  // OpenStreetMap: data/osm/protected-areas.csv is the raw Overpass/Postpass
  // extract (see data/osm/india-protected_areas.overpass.ql.txt), not yet
  // joined against our protected area list, so it's counted independently
  // here rather than via osmRelationIds on full-join entries (which only
  // reflects the much smaller set already cross-matched). protect_class=6
  // rows are Eco-Sensitive Zone buffer boundaries, not the protected area
  // itself, so they're excluded from the count. Where a row carries a
  // wikidata tag we already know its type from data/wikidata/protected-areas.json;
  // otherwise protect_class 2/4 stand in for National Park / Wildlife
  // Sanctuary (OSM has no separate class for tiger reserves, so untagged
  // ones land in the Wildlife Sanctuary bucket).
  const wikidataTypeById = new Map(wikidataEntries.map((e) => [e.wikidataId, e.protectedAreaType]));
  const osmRaw = await readFile('data/osm/protected-areas.csv', 'utf8');
  const osmRows = parse(osmRaw, { columns: true, skip_empty_lines: true });
  const osmCounts = { total: 0, tigerReserve: 0, nationalPark: 0, wildlifeSanctuary: 0 };
  for (const row of osmRows) {
    const type = wikidataTypeById.get(row.wikidata);
    if (type === 'Tiger Reserve') osmCounts.tigerReserve += 1;
    else if (type === 'National Park') osmCounts.nationalPark += 1;
    else if (type === 'Wildlife Sanctuary' || type === 'Bird Sanctuary') osmCounts.wildlifeSanctuary += 1;
    else if (row.protectClass === '2') osmCounts.nationalPark += 1;
    else if (row.protectClass === '4') osmCounts.wildlifeSanctuary += 1;
    else continue; // protect_class 6 (ESZ boundary) or unclassified: not a protected area itself
  }
  osmCounts.total = osmCounts.tigerReserve + osmCounts.nationalPark + osmCounts.wildlifeSanctuary;
  const openstreetmap = withLastUpdated(
    'openstreetmap',
    'OpenStreetMap',
    'https://github.com/publicmap/india-esz-dashboard/blob/main/data/osm/india-protected_areas.overpass.ql.txt',
    hashOf(...osmRows.map((r) => `${r.osmType}/${r.osmId}:${r.protectClass}:${r.wikidata}`).sort()),
    osmCounts,
  );

  // Conflated is the join's actual final output -- every entry in
  // full-join.json, deduplicated across both sources -- so its counts match
  // what assets/app.js's own HERO_STAT_GROUPS/renderHeroStats computes as the
  // KPI denominator (paEntries.filter by protectedAreaType). The four actual
  // upstream sources are nested under it as a `breakdown`, collapsed by
  // default in the UI.
  const conflatedCounts = bucketByType(fullJoin.map((e) => e.protectedAreaType));
  conflatedCounts.breakdown = [moefcc, wikidata, wikipedia, openstreetmap];
  const conflated = withLastUpdated(
    'conflated',
    'Conflated',
    null,
    hashOf(...fullJoin.map((e) => `${e.paKey}:${e.protectedAreaType}`).sort()),
    conflatedCounts,
  );

  // Final ESZ / Draft ESZ / No notification: eszStatus split across the same
  // full conflated set (not just MoEF-sourced entries), so these three sum
  // exactly to Conflated's own total/type counts above -- and, since only an
  // entry with a MoEF notification can be "final" or "draft", the
  // final/draft figures come out identical whether computed over just the
  // MoEF-matched entries or the full set; only "no notification" picks up
  // the extra Wikidata-only entries with no MoEF notification joined at all.
  function statusRow(id, label, status) {
    const entries = fullJoin.filter((e) => e.eszStatus === status);
    return withLastUpdated(
      id,
      label,
      null,
      hashOf(...entries.map((e) => `${e.paKey}:${e.protectedAreaType}`).sort()),
      bucketByType(entries.map((e) => e.protectedAreaType)),
    );
  }
  const finalEsz = statusRow('final-esz', 'Final ESZ', 'final');
  const draftEsz = statusRow('draft-esz', 'Draft ESZ', 'draft');
  const noNotification = statusRow('no-notification', 'No notification', 'none');

  const sources = [conflated, finalEsz, draftEsz, noNotification];
  await writeFile(OUTPUT_PATH, JSON.stringify({ sources }, null, 2), 'utf8');
  console.log('Wrote data/source-stats.json:', sources.map((s) => `${s.label}=${s.counts.total}`).join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
