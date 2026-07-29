// Fetches the full Wikidata protected-area list for India as its own
// standalone table (data/wikidata-protected-areas.{json,csv}), and separately
// links each MoEF notification record to its Wikidata item by adding a
// wikidataId + matchConfidence column to data/moef-esz-notifications.{json,csv}
// (rather than merging the two into one combined table).

import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { classifyProtectedAreaType } from './lib/protected-area-type.js';
import { INDIAN_STATE_AND_UT_NAMES } from './lib/indian-states.js';
import { loadCache, saveCache, setWikidataId } from './lib/enrichment-cache.js';

const CACHE_PATH = 'data/enrichment-cache.csv';

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
  (GROUP_CONCAT(DISTINCT ?resolvedStateViaPartOfLabel; separator="; ") AS ?resolvedStateViaPartOf)
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
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?item ?itemLabel
`;

const GENERIC_PA_WORDS = [
  'wildlife sanctuary', 'wild life sanctuary', 'wildlife', 'national park', 'tiger reserve',
  'bird sanctuary', 'biosphere reserve', 'conservation reserve',
  'community reserve', 'sanctuary', 'santuary', 'reserve forest', 'reserve', 'forest',
  'wls', 'np', 'esz', 'eco sensitive zone', 'eco-sensitive zone',
];

function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase();
  n = n.replace(/&/g, ' and ');
  n = n.replace(/[-.,()'"]/g, ' ');
  // Collapse whitespace before phrase-stripping: "&" -> " and " combined with
  // spacing already around "&" produces double spaces, which breaks the
  // literal single-space phrases below (e.g. "andaman and nicobar islands").
  n = n.replace(/\s+/g, ' ').trim();
  for (const word of [...GENERIC_PA_WORDS, ...INDIAN_STATE_AND_UT_NAMES]) {
    n = n.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ');
  }
  return n.replace(/\s+/g, ' ').trim();
}

function compactName(normalizedName) {
  return normalizedName.replace(/\s+/g, '');
}

// Plain Levenshtein edit distance, used to tolerate the source data's
// frequent single-letter typos/transpositions (Kambalakonda/Kambalkonda,
// Venkateswara/Venkateshwara, Narasimha/Narsimha, Nagarjunsagar/Nagarjunasagar...).
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost);
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
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
    return {
      wikidataId,
      wikidataUrl: `https://www.wikidata.org/wiki/${wikidataId}`,
      wikidataLabel,
      normalizedName: normalizeName(wikidataLabel),
      compactName: compactName(normalizeName(wikidataLabel)),
      protectedAreaType: classifyProtectedAreaType(wikidataLabel),
      partOf: splitConcat(b.partOf?.value),
      image: b.image?.value ?? null,
      iucnCategory: b.iucnCategory?.value ?? null,
      locatedInAdminTerritorialEntity: splitConcat(b.adminEntity?.value),
      state,
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

function pickByState(candidates, normMoefState) {
  return candidates.find((c) => c.state.some((a) => statesAgree(normalizeState(a), normMoefState))) ?? candidates[0];
}

function buildMatcher(wikidataItems) {
  const byNormName = new Map();
  const byCompactName = new Map();
  for (const item of wikidataItems) {
    if (item.normalizedName) {
      if (!byNormName.has(item.normalizedName)) byNormName.set(item.normalizedName, []);
      byNormName.get(item.normalizedName).push(item);
    }
    if (item.compactName) {
      if (!byCompactName.has(item.compactName)) byCompactName.set(item.compactName, []);
      byCompactName.get(item.compactName).push(item);
    }
  }

  return function match(moefName, moefState) {
    const normMoefName = normalizeName(moefName);
    const compactMoefName = compactName(normMoefName);
    const normMoefState = normalizeState(moefState);
    if (!normMoefName) return { item: null, matchConfidence: 'none' };

    const exact = byNormName.get(normMoefName) ?? [];
    if (exact.length > 0) {
      return { item: pickByState(exact, normMoefState), matchConfidence: 'exact' };
    }
    // Same name once whitespace/hyphens are ignored (e.g. "Eaglenest" vs
    // "Eagle Nest") -- still an exact match, just a spacing variant.
    const compactExact = byCompactName.get(compactMoefName) ?? [];
    if (compactExact.length > 0) {
      return { item: pickByState(compactExact, normMoefState), matchConfidence: 'exact' };
    }

    // Fuzzy tier. Two structurally different kinds of near-match need two
    // different bars:
    //  - Containment (one name is a clean, whole substring of the other --
    //    e.g. "Pulicat" in "Pulicat Lake Bird Sanctuary", "Sri Penusila" in
    //    "Sri Penusila Narasimha ...") is strong structural evidence even at
    //    a fairly low length ratio, since the shorter name appears verbatim.
    //  - A same-length-ish edit-distance match with NO containment (typos:
    //    Kambalakonda/Kambalkonda, Venkateswara/Venkateshwara) needs a much
    //    higher similarity bar, because short unrelated words can coincidentally
    //    score just as "similar" this way -- e.g. "Tale"/"Kane" and
    //    "Ramnagar"/"Ramsagar" both score >=0.5 despite being different places.
    // A confirmed state disagreement is a hard veto either way (MoEF's own
    // state column is independent, reliable ground truth); when Wikidata has
    // no resolved state for the item at all, both bars are raised instead.
    // Both kinds of candidate are pooled into one ranking by score (not
    // "containment always wins"): a containment match can still be a worse
    // candidate than an edit-distance one when it only explains a weak
    // fraction of the name (e.g. "Cauvery" contained in "Talacauvery" scores
    // lower than "Talacauvery" ~ "Talakaveri" by edit distance, correctly).
    let best = null;
    let bestScore = 0;
    for (const item of wikidataItems) {
      if (!item.normalizedName) continue;
      const stateKnown = item.state.length > 0;
      const stateAgrees = stateKnown && item.state.some((a) => statesAgree(normalizeState(a), normMoefState));
      if (stateKnown && !stateAgrees) continue;

      const shorterLen = Math.min(normMoefName.length, item.normalizedName.length);
      const isContainment = item.normalizedName.includes(normMoefName) || normMoefName.includes(item.normalizedName);
      let nameScore;
      if (isContainment) {
        // No length floor: a short name (e.g. "Nagi" in "Nagi Dam Bird
        // Sanctuary") appearing verbatim as a whole prefix/suffix of the
        // other is meaningful regardless of length.
        nameScore = shorterLen / Math.max(normMoefName.length, item.normalizedName.length);
        if (nameScore < (stateAgrees ? 0.5 : 0.7)) continue;
      } else {
        // Edit-distance-only matches on short strings are exactly the
        // coincidence risk ("Tale"/"Kane" scores 0.5, a hypothetical
        // single-letter-typo 4-letter pair would score 0.75) -- require
        // enough length that a passing score reflects a real typo, not luck.
        if (shorterLen < 6) continue;
        nameScore = similarity(normMoefName, item.normalizedName);
        if (nameScore < (stateAgrees ? 0.7 : 0.85)) continue;
      }

      const score = nameScore + (stateAgrees ? 0.25 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best ? { item: best, matchConfidence: 'fuzzy' } : { item: null, matchConfidence: 'none' };
  };
}

function writeWikidataTable(wikidataItems) {
  const rows = wikidataItems.map(({ normalizedName, compactName: _compactName, ...item }) => item);
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

  await writeFile('data/moef-esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef-esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');
  return linked;
}

async function main() {
  const moefRecords = JSON.parse(await readFile('data/moef-esz-notifications.json', 'utf8'));
  const cache = await loadCache(CACHE_PATH);
  const wikidataItems = await fetchWikidataProtectedAreas();
  console.log(`Fetched ${wikidataItems.length} Indian protected areas from Wikidata.`);
  await writeWikidataTable(wikidataItems);

  const match = buildMatcher(wikidataItems);
  const linked = await writeMoefTable(moefRecords, match, cache);
  await saveCache(CACHE_PATH, cache);

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
