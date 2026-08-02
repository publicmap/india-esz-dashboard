// Fetches the full Wikidata protected-area list for India, cross-references
// it against the three structured Wikipedia protected-area lists (data/
// wikipedia/*.json, more actively maintained than Wikidata's own P31 typing)
// to correct outdated categorization and add any protected area Wikipedia
// knows about that Wikidata doesn't, and writes the result as the master
// protected-area table (data/wikidata/protected-areas.{json,csv}). Separately
// links each MoEF notification record to its Wikidata/master-list item by
// adding a wikidataId + matchConfidence column to
// data/moef/esz-notifications.{json,csv} (rather than merging the two into
// one combined table). QA output from both cross-reference passes (Wikidata
// <-> Wikipedia, Wikidata <-> OSM) is written to data/wikidata/qa-log.md.

import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { classifyProtectedAreaType } from './lib/protected-area-type.js';
import { loadCache, saveCache, setWikidataId } from './lib/enrichment-cache.js';
import { normalizeName, compactName } from './lib/name-match.js';
import { buildMatcher } from './lib/wikidata-match.js';
import { loadOsmCache } from './lib/osm-cache.js';
import { crossReferenceOsm } from './lib/osm-qa.js';
import { loadWikipediaRecords } from './lib/wikipedia-cache.js';
import { crossReferenceWikipedia } from './lib/wikipedia-qa.js';
import { renderQaLog } from './lib/qa-log.js';

const CACHE_PATH = 'data/enrichment-cache.csv';
const WIKIDATA_JSON_PATH = 'data/wikidata/protected-areas.json';
const WIKIDATA_CSV_PATH = 'data/wikidata/protected-areas.csv';
const QA_LOG_PATH = 'data/wikidata/qa-log.md';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';

// Most individual Indian protected areas are NOT typed as a direct instance of
// "protected area" (Q473972) itself -- they use a more specific subclass
// (Q46169 national park, Q1377575 wildlife refuge -- used for wildlife
// sanctuaries, Q2714144 bird sanctuary, etc). A transitive wdt:P31/wdt:P279*
// walk up to Q473972 finds those, but it also drags in a handful of garbage
// (lake, caste, village in India...) via unrelated subclass chains, and is
// too slow for the query service to evaluate directly. So instead this is an
// explicit, curated allowlist of the P31 types actually observed among
// Indian Q473972-descendant items (checked via a one-off exploratory query),
// expressed as a UNION so each branch can use the P31 index.
//
// Deliberately excluded (not protected areas of interest for this dashboard,
// even though they're Q473972 descendants): Q7315273 (forest reserve),
// Q16966008 (protected forest), Q3427688 (Reserved forests and protected
// forests of India), Q158454 (biosphere reserve), Q126476600 (Biodiversity
// Heritage Site), Q5162999 (conservation reserve), Q19683138 (Ramsar site --
// a wetland designation, not itself a protected-area category; the
// underlying site is already covered via its own type, e.g. national
// park/sanctuary). An item typed *only* as one of these is dropped from the
// list entirely; one also typed as e.g. national park/sanctuary still comes
// in via that other branch.
const PROTECTED_AREA_TYPES = [
  'Q473972', // protected area
  'Q1377575', // wildlife refuge (used for Indian wildlife sanctuaries)
  'Q46169', // national park
  'Q2714144', // bird sanctuary
  'Q179049', // nature reserve
  'Q5533772', // Tiger reserve of India
  'Q1533036', // animal sanctuary
  'Q2828718', // protected area of India
  'Q108059873', // wildlife conservation area
  'Q1125269', // Indian National Parks and Wildlife Sanctuaries
  'Q29553', // sanctuary
];
const PROTECTED_AREA_TYPE_UNION = PROTECTED_AREA_TYPES
  .map((qid) => `{ ?item wdt:P31 wd:${qid} }`)
  .join(' UNION\n    ');

// Wikidata's "located in the administrative territorial entity" (P131) is
// often a district, taluka, or even a village-level block rather than the
// state -- so it can't be used directly as "state". Instead walk up the P131
// chain (however many hops it takes) until hitting an ancestor that is
// itself an instance of "state of India" or "union territory of India".
// Many individual protected areas (e.g. a range/block within a larger
// sanctuary) have no P131 at all, only a "part of" (P361) link to the
// larger area -- and it's that larger area that carries the P131 chain. So
// as a fallback, when the direct P131 walk finds nothing, also try one
// P361 hop followed by a P131 walk from there. This fallback is fetched as
// a *separate* binding (?resolvedStateViaPartOf) rather than folded into
// the same path, because some P361 targets (e.g. "Western Ghats", which
// Wikidata links via P131 to all 6 states it physically spans) resolve to
// several genuinely different states -- that's correct for the mountain
// range but useless/misleading as "the state" of one specific sanctuary
// inside it, so buildMatcher's caller only accepts the fallback when it is
// unambiguous (exactly one distinct state).
//
// A district/taluk reorganized into a new state (Uttarakhand out of Uttar
// Pradesh in 2000, Telangana out of Andhra Pradesh in 2014, the 2019 J&K/
// Ladakh split, ...) typically ends up with *two* P131 statements: the old
// state (now superseded, usually qualified with a P582 end-time) and the
// new one. A plain `wdt:P131+` walk uses Wikidata's "truthy" statement
// selection, which only drops the superseded one when an editor has also
// gone back and demoted its rank below the current statement's -- easy to
// forget, since adding the end-time qualifier is the part editors actually
// do when recording a reorg. Relying on rank alone silently lets the stale
// state slip through as if it still applied (see e.g.
// https://www.wikidata.org/wiki/Q1773437, Uttarkashi district, which
// carries both a `preferred`-rank current P131 and a `normal`-rank P582-
// qualified historical one -- the qualifier is the actual signal, the rank
// happening to differ is not something every item's editors bother with).
//
// Checking every hop of every item's chain against qualifiers (rather than
// just trusting `wdt:P131+`'s rank-based "truthy" shortcut) is too expensive
// to do for all ~600 items in the single main SPARQL_QUERY below -- tried
// that, WDQS 504-timed-out. Since an ambiguous chain (more than one
// resolved state) is rare (one genuinely-multi-state case in the current
// data, plus however many stale-reorg ones this is meant to catch), it's
// far cheaper to run the main query as before (fast, rank-only) and then
// re-resolve *only* the handful of items whose `state` came back ambiguous
// through STATE_HOP_PATTERN, scoped to just those ids via a `VALUES`
// clause -- see refineAmbiguousStates below.
const STATE_TYPES = ['Q12443800', 'Q467745'];

// Walks zero-or-more ordinary (fast, truthy) P131 hops from `startVar`, then
// one *explicit*, statement-level final hop into `resultVar` that's dropped
// whenever it carries a P582 (end time) qualifier or a deprecated rank --
// i.e. whenever it's been superseded. `startVar` is never itself
// state-typed for either of this function's two call sites (an item is
// never its own state; see refineAmbiguousStates below), so unlike the
// original wdt:P131+/wdt:P131* walk this deliberately does NOT also treat
// `startVar` itself as a candidate result -- tried that as a `UNION` arm,
// but combining a `BIND(startVar AS resultVar)` arm with the hop arm here
// tickles what looks like a Blazegraph (Wikidata Query Service) planner bug
// when `startVar` comes from an outer `VALUES` clause: instead of yielding
// zero rows for the BIND arm (correct, since an item is never state-typed),
// it spuriously joined in *every* state/UT-typed item in Wikidata. Isolating
// each UNION arm individually confirmed both are correct alone; only the
// combination misbehaves, so the union'd BIND arm was dropped rather than
// worked around.
function stateHopPattern(startVar, resultVar) {
  const v = resultVar.slice(1);
  return `
    ${startVar} wdt:P131* ?${v}Mid_ .
    ?${v}Mid_ p:P131 ?${v}Stmt_ .
    ?${v}Stmt_ ps:P131 ${resultVar} ;
      wikibase:rank ?${v}Rank_ .
    FILTER(?${v}Rank_ != wikibase:DeprecatedRank)
    FILTER NOT EXISTS { ?${v}Stmt_ pq:P582 ?${v}End_ }`;
}

// Re-resolves `state` for just the given wikidataIds, using the same
// STATE_TYPES walk as the main query but through STATE_HOP_PATTERN's
// qualifier/rank-aware final hop instead of a plain `wdt:P131+`. Scoped to
// a small `VALUES ?item {...}` list, so -- unlike folding this into
// SPARQL_QUERY itself -- it stays cheap regardless of how expensive the
// per-hop qualifier check is. Returns a Map(wikidataId -> string[] of
// distinct current state/UT labels); an id with no entry means the
// qualifier-aware walk found nothing (caller should keep its original
// value rather than treat that as "no state").
async function refineAmbiguousStates(wikidataIds) {
  if (wikidataIds.length === 0) return new Map();
  const query = `
SELECT ?item (GROUP_CONCAT(DISTINCT ?resolvedStateLabel; separator="; ") AS ?states) WHERE {
  VALUES ?item { wd:${wikidataIds.join(' wd:')} }
  ${stateHopPattern('?item', '?resolvedState_')}
  ?resolvedState_ wdt:P31 ?stateType .
  VALUES ?stateType { wd:${STATE_TYPES.join(' wd:')} }
  ?resolvedState_ rdfs:label ?resolvedStateLabel .
  FILTER(LANG(?resolvedStateLabel)="en")
}
GROUP BY ?item
`;
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`refineAmbiguousStates: SPARQL query failed (${res.status}), keeping original ambiguous state values for ${wikidataIds.length} item(s).`);
    return new Map();
  }
  const json = await res.json();
  const result = new Map();
  for (const b of json.results.bindings) {
    const qid = b.item.value.replace('http://www.wikidata.org/entity/', '');
    const states = b.states?.value ? b.states.value.split('; ').filter(Boolean) : [];
    if (states.length > 0) result.set(qid, states);
  }
  return result;
}

const SPARQL_QUERY = `
SELECT ?item ?itemLabel
  (SAMPLE(?image) AS ?image)
  (SAMPLE(?coord) AS ?coord)
  (SAMPLE(?area) AS ?area)
  (SAMPLE(?banner) AS ?banner)
  (SAMPLE(?commonsCategory) AS ?commonsCategory)
  (SAMPLE(?iucnLabel) AS ?iucnCategory)
  (SAMPLE(?inception) AS ?inception)
  (SAMPLE(?worldHeritageSiteId) AS ?worldHeritageSiteId)
  (GROUP_CONCAT(DISTINCT ?osmRelation; separator="; ") AS ?osmRelations)
  (GROUP_CONCAT(DISTINCT ?website; separator="; ") AS ?websites)
  (GROUP_CONCAT(DISTINCT ?partOfLabel; separator="; ") AS ?partOf)
  (GROUP_CONCAT(DISTINCT ?adminEntityLabel; separator="; ") AS ?adminEntity)
  (GROUP_CONCAT(DISTINCT ?resolvedStateLabel; separator="; ") AS ?resolvedState)
  (GROUP_CONCAT(DISTINCT ?resolvedStateViaPartOfLabel; separator="; ") AS ?resolvedStateViaPartOf)
  (GROUP_CONCAT(DISTINCT ?significantPlaceLabel; separator="; ") AS ?significantPlace)
  (GROUP_CONCAT(DISTINCT ?heritageLabel; separator="; ") AS ?heritageDesignation)
  (SAMPLE(?enwiki) AS ?enwikiUrl)
  (GROUP_CONCAT(DISTINCT ?alias; separator="; ") AS ?aliases)
WHERE {
  {
    ${PROTECTED_AREA_TYPE_UNION}
  }
  ?item wdt:P17 wd:Q668 .
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P2046 ?area }
  OPTIONAL { ?item wdt:P948 ?banner }
  OPTIONAL { ?item wdt:P373 ?commonsCategory }
  OPTIONAL { ?item wdt:P402 ?osmRelation }
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P814 ?iucn . ?iucn rdfs:label ?iucnLabel . FILTER(LANG(?iucnLabel)="en") }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P757 ?worldHeritageSiteId }
  OPTIONAL { ?item wdt:P361 ?partOf_ . ?partOf_ rdfs:label ?partOfLabel . FILTER(LANG(?partOfLabel)="en") }
  OPTIONAL { ?item wdt:P131 ?adminEntity_ . ?adminEntity_ rdfs:label ?adminEntityLabel . FILTER(LANG(?adminEntityLabel)="en") }
  OPTIONAL {
    ?item wdt:P131+ ?resolvedState_ .
    ?resolvedState_ wdt:P31 ?stateType .
    VALUES ?stateType { wd:${STATE_TYPES.join(' wd:')} }
    ?resolvedState_ rdfs:label ?resolvedStateLabel .
    FILTER(LANG(?resolvedStateLabel)="en")
  }
  OPTIONAL {
    ?item wdt:P361 ?partOfState_ .
    ?partOfState_ wdt:P131* ?resolvedStateViaPartOf_ .
    ?resolvedStateViaPartOf_ wdt:P31 ?stateTypeViaPartOf .
    VALUES ?stateTypeViaPartOf { wd:${STATE_TYPES.join(' wd:')} }
    ?resolvedStateViaPartOf_ rdfs:label ?resolvedStateViaPartOfLabel .
    FILTER(LANG(?resolvedStateViaPartOfLabel)="en")
  }
  OPTIONAL { ?item wdt:P7153 ?significantPlace_ . ?significantPlace_ rdfs:label ?significantPlaceLabel . FILTER(LANG(?significantPlaceLabel)="en") }
  OPTIONAL { ?item wdt:P1435 ?heritage_ . ?heritage_ rdfs:label ?heritageLabel . FILTER(LANG(?heritageLabel)="en") }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias)="en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}
GROUP BY ?item ?itemLabel
`;

function parseWktPoint(wkt) {
  if (!wkt) return null;
  const m = wkt.match(/Point\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
  if (!m) return null;
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

function splitConcat(value) {
  return value ? value.split('; ').filter(Boolean) : [];
}

async function fetchWikidataProtectedAreas() {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(SPARQL_QUERY)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`SPARQL query failed: ${res.status} ${await res.text()}`);
  const json = await res.json();

  const items = json.results.bindings.map((b) => {
    const coord = parseWktPoint(b.coord?.value);
    const wikidataLabel = b.itemLabel?.value ?? null;
    const directState = splitConcat(b.resolvedState?.value);
    const partOfState = splitConcat(b.resolvedStateViaPartOf?.value);
    // Only fall back to the "part of" state resolution when the direct P131
    // walk found nothing AND the fallback itself is unambiguous -- a P361
    // target that spans multiple states (e.g. "Western Ghats") is correct
    // Wikidata data, but useless/misleading as a single "state" value here.
    const state = directState.length > 0
      ? directState
      : (partOfState.length === 1 ? partOfState : []);
    const wikidataId = b.item.value.replace('http://www.wikidata.org/entity/', '');
    const aliases = splitConcat(b.aliases?.value);
    const normalizedAliases = aliases.map((a) => normalizeName(a)).filter(Boolean);
    const compactAliases = normalizedAliases.map((n) => compactName(n));
    return {
      wikidataId,
      wikidataUrl: `https://www.wikidata.org/wiki/${wikidataId}`,
      wikidataLabel,
      aliases,
      normalizedName: normalizeName(wikidataLabel),
      compactName: compactName(normalizeName(wikidataLabel)),
      normalizedAliases,
      compactAliases,
      protectedAreaType: classifyProtectedAreaType(wikidataLabel),
      partOf: splitConcat(b.partOf?.value),
      image: b.image?.value ?? null,
      iucnCategory: b.iucnCategory?.value ?? null,
      inception: b.inception?.value ?? null,
      worldHeritageSiteId: b.worldHeritageSiteId?.value ?? null,
      locatedInAdminTerritorialEntity: splitConcat(b.adminEntity?.value),
      state,
      // Ambiguous (>1) only ever comes from the direct P131 walk -- the
      // partOf-fallback branch above already refuses to assign a state at
      // all when it's ambiguous, so there's nothing there to refine.
      directStateAmbiguous: directState.length > 1,
      coordinateLatitude: coord?.lat ?? null,
      coordinateLongitude: coord?.lon ?? null,
      significantPlace: splitConcat(b.significantPlace?.value),
      heritageDesignation: splitConcat(b.heritageDesignation?.value),
      area: b.area?.value ? Number(b.area.value) : null,
      officialWebsite: splitConcat(b.websites?.value),
      pageBanner: b.banner?.value ?? null,
      commonsCategory: b.commonsCategory?.value ?? null,
      osmRelationIds: splitConcat(b.osmRelations?.value),
      enwikiUrl: b.enwikiUrl?.value ?? null,
    };
  });

  // See the comment above refineAmbiguousStates: re-check just the items
  // whose fast/rank-only resolution above found more than one state, since
  // that's exactly the shape a reorganized-but-not-rank-cleaned-up P131
  // chain produces. Most surviving ambiguity is genuine (a protected area
  // that really does span more than one state), so this only narrows
  // `state` down when the qualifier-aware re-check disagrees with the fast
  // pass -- it never invents a state the fast pass didn't already find.
  const ambiguousItems = items.filter((item) => item.directStateAmbiguous);
  if (ambiguousItems.length > 0) {
    console.log(`Re-checking ${ambiguousItems.length} item(s) with an ambiguous P131 state chain for a superseded (reorganized) value...`);
    const refined = await refineAmbiguousStates(ambiguousItems.map((item) => item.wikidataId));
    let narrowedCount = 0;
    for (const item of ambiguousItems) {
      const refinedState = refined.get(item.wikidataId);
      if (refinedState && refinedState.length < item.state.length) narrowedCount += 1;
      if (refinedState) item.state = refinedState;
    }
    console.log(`  narrowed ${narrowedCount} of ${ambiguousItems.length} to a single current state (rest are genuinely multi-state, or the re-check found nothing so the original value was kept).`);
  }

  for (const item of items) delete item.directStateAmbiguous;
  return items;
}

function writeWikidataTable(wikidataItems) {
  const rows = wikidataItems.map(({
    normalizedName, compactName: _compactName, normalizedAliases, compactAliases, ...item
  }) => item);
  const jsonPromise = writeFile(WIKIDATA_JSON_PATH, JSON.stringify(rows, null, 2), 'utf8');

  const csvRows = rows.map((r) => ({
    ...r,
    aliases: r.aliases.join('; '),
    partOf: r.partOf.join('; '),
    locatedInAdminTerritorialEntity: r.locatedInAdminTerritorialEntity.join('; '),
    state: r.state.join('; '),
    significantPlace: r.significantPlace.join('; '),
    heritageDesignation: r.heritageDesignation.join('; '),
    officialWebsite: r.officialWebsite.join('; '),
    osmRelationIds: r.osmRelationIds.join('; '),
    osmId: r.osmId ?? '',
    osmType: r.osmType ?? '',
    osmUrl: r.osmUrl ?? '',
    osmName: r.osmName ?? '',
    osmMatchSource: r.osmMatchSource ?? '',
    wikipediaUrl: r.wikipediaUrl ?? '',
    wikipediaSource: r.wikipediaSource ?? '',
    dataSource: r.dataSource ?? '',
  }));
  const csvPromise = writeFile(WIKIDATA_CSV_PATH, stringify(csvRows, { header: true }), 'utf8');

  return Promise.all([jsonPromise, csvPromise]);
}

async function writeMoefTable(moefRecords, match, cache) {
  const linked = moefRecords.map((record) => {
    const { item, matchConfidence } = match(record.protectedAreaName, record.state);
    // MoEF notification text is the primary source for type; fall back to the
    // matched Wikidata label (e.g. "... National Park") when it's still blank.
    const protectedAreaType = record.protectedAreaType ?? item?.protectedAreaType ?? null;
    const wikidataId = item?.wikidataId ?? null;
    setWikidataId(cache, record.orderNumber, record.notificationDate, record.protectedAreaName, wikidataId);
    return {
      ...record,
      protectedAreaType,
      wikidataId,
      matchConfidence,
    };
  });

  await writeFile('data/moef/esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef/esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');
  return linked;
}

async function main() {
  const moefRecords = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  const cache = await loadCache(CACHE_PATH);
  const wikidataItems = await fetchWikidataProtectedAreas();
  console.log(`Fetched ${wikidataItems.length} Indian protected areas from Wikidata.`);

  // Wikipedia cross-reference first (may append new master-list entries and
  // correct protectedAreaType in place), so the OSM cross-reference and the
  // MoEF matcher below both see the fully merged master list.
  const wikipediaRecords = await loadWikipediaRecords();
  let wikipediaGroup;
  if (wikipediaRecords.length > 0) {
    console.log(`Loaded ${wikipediaRecords.length} Wikipedia protected-area records from data/wikipedia/.`);
    const wp = crossReferenceWikipedia(wikidataItems, wikipediaRecords);
    wikidataItems.push(...wp.newEntries);
    console.log(`Wikipedia cross-reference: ${wp.stats.matchedCount} Wikidata items matched, ${wp.stats.correctedTypeCount} protectedAreaType corrections, ${wp.stats.newEntryCount} new master-list entries added.`);
    wikipediaGroup = {
      title: 'Wikidata ↔ Wikipedia joins',
      description: `Cross-referenced against ${wp.stats.totalWikipediaRecords} records from \`data/wikipedia/{national-parks,wildlife-sanctuaries,tiger-reserves}.json\`.`,
      sections: wp.sections,
    };
  } else {
    console.warn('No Wikipedia records found under data/wikipedia/ -- run `npm run fetch && npm run parse:wikipedia` first to enable Wikipedia cross-reference. Skipping.');
    wikipediaGroup = {
      title: 'Wikidata ↔ Wikipedia joins',
      description: 'Skipped -- no records found under `data/wikipedia/`. Run `npm run fetch && npm run parse:wikipedia` first.',
      sections: [],
    };
  }

  const osmCache = await loadOsmCache();
  let osmGroup;
  if (osmCache) {
    console.log(`Loaded ${osmCache.features.length} OSM protected-area features from data/osm/protected-areas.csv.`);
    const osm = await crossReferenceOsm(wikidataItems, osmCache);
    console.log(`OSM cross-reference: ${osm.matchedCount} matched, ${osm.unmatchedWikidataCount} Wikidata items with no OSM match.`);
    osmGroup = {
      title: 'Wikidata ↔ OSM joins',
      description: `Cross-referenced against \`data/osm/protected-areas.csv\` (${osm.issueCount} issues flagged).`,
      sections: osm.sections,
    };
  } else {
    console.warn('OSM cache not found at data/osm/protected-areas.csv -- run `npm run enrich:osm` first to enable OSM cross-reference. Skipping.');
    osmGroup = {
      title: 'Wikidata ↔ OSM joins',
      description: 'Skipped -- no cache found at `data/osm/protected-areas.csv`. Run `npm run enrich:osm` first.',
      sections: [],
    };
  }

  await writeFile(QA_LOG_PATH, renderQaLog([wikipediaGroup, osmGroup], new Date().toISOString()), 'utf8');
  console.log(`QA log written to ${QA_LOG_PATH}.`);

  await writeWikidataTable(wikidataItems);

  const match = buildMatcher(wikidataItems);
  const linked = await writeMoefTable(moefRecords, match, cache);
  await saveCache(CACHE_PATH, cache);

  const exact = linked.filter((r) => r.matchConfidence === 'exact').length;
  const fuzzy = linked.filter((r) => r.matchConfidence === 'fuzzy').length;
  const none = linked.filter((r) => r.matchConfidence === 'none').length;
  console.log(`Linked ${linked.length} MoEF notification records to ${wikidataItems.length} master protected-area records.`);
  console.log(`  matchConfidence exact: ${exact}`);
  console.log(`  matchConfidence fuzzy: ${fuzzy}`);
  console.log(`  matchConfidence none: ${none}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
