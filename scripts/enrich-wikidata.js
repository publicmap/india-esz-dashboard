// Fetches the full Wikidata protected-area list for India as its own
// standalone table (data/wikidata-protected-areas.{json,csv}), and separately
// links each MoEF notification record to its Wikidata item by adding a
// wikidataId + matchConfidence column to data/moef-esz-notifications.{json,csv}
// (rather than merging the two into one combined table).

import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { classifyProtectedAreaType } from './lib/protected-area-type.js';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'moef-esz-notifications-bot/1.0 (https://github.com/publicmap/moef-esz-notifications)';

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
const PROTECTED_AREA_TYPES = [
  'Q473972', // protected area
  'Q1377575', // wildlife refuge (used for Indian wildlife sanctuaries)
  'Q46169', // national park
  'Q2714144', // bird sanctuary
  'Q7315273', // forest reserve
  'Q179049', // nature reserve
  'Q158454', // biosphere reserve
  'Q5533772', // Tiger reserve of India
  'Q1533036', // animal sanctuary
  'Q126476600', // Biodiversity Heritage Site
  'Q5162999', // conservation reserve
  'Q2828718', // protected area of India
  'Q19683138', // Ramsar site
  'Q16966008', // protected forest
  'Q108059873', // wildlife conservation area
  'Q728904', // nature park
  'Q3427688', // Reserved forests and protected forests of India
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
const STATE_TYPES = ['Q12443800', 'Q467745'];

const SPARQL_QUERY = `
SELECT ?item ?itemLabel
  (SAMPLE(?image) AS ?image)
  (SAMPLE(?coord) AS ?coord)
  (SAMPLE(?area) AS ?area)
  (SAMPLE(?banner) AS ?banner)
  (SAMPLE(?commonsCategory) AS ?commonsCategory)
  (SAMPLE(?iucnLabel) AS ?iucnCategory)
  (GROUP_CONCAT(DISTINCT ?osmRelation; separator="; ") AS ?osmRelations)
  (GROUP_CONCAT(DISTINCT ?website; separator="; ") AS ?websites)
  (GROUP_CONCAT(DISTINCT ?partOfLabel; separator="; ") AS ?partOf)
  (GROUP_CONCAT(DISTINCT ?adminEntityLabel; separator="; ") AS ?adminEntity)
  (GROUP_CONCAT(DISTINCT ?resolvedStateLabel; separator="; ") AS ?resolvedState)
  (GROUP_CONCAT(DISTINCT ?significantPlaceLabel; separator="; ") AS ?significantPlace)
  (GROUP_CONCAT(DISTINCT ?heritageLabel; separator="; ") AS ?heritageDesignation)
  (SAMPLE(?enwiki) AS ?enwikiUrl)
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
  OPTIONAL { ?item wdt:P361 ?partOf_ . ?partOf_ rdfs:label ?partOfLabel . FILTER(LANG(?partOfLabel)="en") }
  OPTIONAL { ?item wdt:P131 ?adminEntity_ . ?adminEntity_ rdfs:label ?adminEntityLabel . FILTER(LANG(?adminEntityLabel)="en") }
  OPTIONAL {
    ?item wdt:P131+ ?resolvedState_ .
    ?resolvedState_ wdt:P31 ?stateType .
    VALUES ?stateType { wd:${STATE_TYPES.join(' wd:')} }
    ?resolvedState_ rdfs:label ?resolvedStateLabel .
    FILTER(LANG(?resolvedStateLabel)="en")
  }
  OPTIONAL { ?item wdt:P7153 ?significantPlace_ . ?significantPlace_ rdfs:label ?significantPlaceLabel . FILTER(LANG(?significantPlaceLabel)="en") }
  OPTIONAL { ?item wdt:P1435 ?heritage_ . ?heritage_ rdfs:label ?heritageLabel . FILTER(LANG(?heritageLabel)="en") }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?item ?itemLabel
`;

const GENERIC_PA_WORDS = [
  'wildlife sanctuary', 'wild life sanctuary', 'national park', 'tiger reserve',
  'bird sanctuary', 'biosphere reserve', 'conservation reserve',
  'community reserve', 'sanctuary', 'reserve forest', 'reserve', 'forest',
  'wls', 'np', 'esz', 'eco sensitive zone', 'eco-sensitive zone',
];

function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase();
  n = n.replace(/&/g, ' and ');
  n = n.replace(/[.,()'"]/g, ' ');
  for (const word of GENERIC_PA_WORDS) {
    n = n.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ');
  }
  return n.replace(/\s+/g, ' ').trim();
}

function normalizeState(state) {
  if (!state) return '';
  let s = state.toLowerCase();
  s = s.replace(/&/g, ' and ');
  s = s.replace(/\b(district|division|state|ut|taluka|block|islands?|community development block|grama panchayat)\b/g, ' ');
  s = s.replace(/[.,()'"]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function statesAgree(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

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

  return json.results.bindings.map((b) => {
    const coord = parseWktPoint(b.coord?.value);
    const wikidataLabel = b.itemLabel?.value ?? null;
    return {
      wikidataId: b.item.value.replace('http://www.wikidata.org/entity/', ''),
      wikidataLabel,
      normalizedName: normalizeName(wikidataLabel),
      protectedAreaType: classifyProtectedAreaType(wikidataLabel),
      partOf: splitConcat(b.partOf?.value),
      image: b.image?.value ?? null,
      iucnCategory: b.iucnCategory?.value ?? null,
      locatedInAdminTerritorialEntity: splitConcat(b.adminEntity?.value),
      state: splitConcat(b.resolvedState?.value),
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
}

function buildMatcher(wikidataItems) {
  const byNormName = new Map();
  for (const item of wikidataItems) {
    if (!item.normalizedName) continue;
    if (!byNormName.has(item.normalizedName)) byNormName.set(item.normalizedName, []);
    byNormName.get(item.normalizedName).push(item);
  }

  return function match(moefName, moefState) {
    const normMoefName = normalizeName(moefName);
    const normMoefState = normalizeState(moefState);
    if (!normMoefName) return { item: null, matchConfidence: 'none' };

    const exact = byNormName.get(normMoefName) ?? [];
    if (exact.length === 1) {
      return { item: exact[0], matchConfidence: 'exact' };
    }
    if (exact.length > 1) {
      const disambiguated = exact.find((c) =>
        c.state.some((a) => statesAgree(normalizeState(a), normMoefState)));
      return { item: disambiguated ?? exact[0], matchConfidence: 'exact' };
    }

    let best = null;
    let bestScore = 0;
    for (const item of wikidataItems) {
      if (!item.normalizedName) continue;
      const contains = item.normalizedName.includes(normMoefName) || normMoefName.includes(item.normalizedName);
      if (!contains) continue;
      const overlap = Math.min(item.normalizedName.length, normMoefName.length)
        / Math.max(item.normalizedName.length, normMoefName.length);
      if (overlap < 0.6) continue;
      const stateBonus = item.state.some((a) => statesAgree(normalizeState(a), normMoefState)) ? 0.25 : 0;
      const score = overlap + stateBonus;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best ? { item: best, matchConfidence: 'fuzzy' } : { item: null, matchConfidence: 'none' };
  };
}

function writeWikidataTable(wikidataItems) {
  const rows = wikidataItems.map(({ normalizedName, ...item }) => item);
  const jsonPromise = writeFile('data/wikidata-protected-areas.json', JSON.stringify(rows, null, 2), 'utf8');

  const csvRows = rows.map((r) => ({
    ...r,
    partOf: r.partOf.join('; '),
    locatedInAdminTerritorialEntity: r.locatedInAdminTerritorialEntity.join('; '),
    state: r.state.join('; '),
    significantPlace: r.significantPlace.join('; '),
    heritageDesignation: r.heritageDesignation.join('; '),
    officialWebsite: r.officialWebsite.join('; '),
    osmRelationIds: r.osmRelationIds.join('; '),
  }));
  const csvPromise = writeFile('data/wikidata-protected-areas.csv', stringify(csvRows, { header: true }), 'utf8');

  return Promise.all([jsonPromise, csvPromise]);
}

async function writeMoefTable(moefRecords, match) {
  const linked = moefRecords.map((record) => {
    const { item, matchConfidence } = match(record.protectedAreaName, record.state);
    // MoEF notification text is the primary source for type; fall back to the
    // matched Wikidata label (e.g. "... National Park") when it's still blank.
    const protectedAreaType = record.protectedAreaType ?? item?.protectedAreaType ?? null;
    return {
      ...record,
      protectedAreaType,
      wikidataId: item?.wikidataId ?? null,
      matchConfidence,
    };
  });

  await writeFile('data/moef-esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef-esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');
  return linked;
}

async function main() {
  const moefRecords = JSON.parse(await readFile('data/moef-esz-notifications.json', 'utf8'));
  const wikidataItems = await fetchWikidataProtectedAreas();
  console.log(`Fetched ${wikidataItems.length} Indian protected areas from Wikidata.`);
  await writeWikidataTable(wikidataItems);

  const match = buildMatcher(wikidataItems);
  const linked = await writeMoefTable(moefRecords, match);

  const exact = linked.filter((r) => r.matchConfidence === 'exact').length;
  const fuzzy = linked.filter((r) => r.matchConfidence === 'fuzzy').length;
  const none = linked.filter((r) => r.matchConfidence === 'none').length;
  console.log(`Linked ${linked.length} MoEF notification records to ${wikidataItems.length} Wikidata protected areas.`);
  console.log(`  matchConfidence exact: ${exact}`);
  console.log(`  matchConfidence fuzzy: ${fuzzy}`);
  console.log(`  matchConfidence none: ${none}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
