// Cleans the parsed MoEF notification records (data/moef/esz-notifications.json)
// before the Wikidata join: expands notifications that actually cover
// multiple protected areas into one record per area, and canonicalizes
// inconsistent names/types for the same area across draft vs final
// notifications. Run after scripts/parse-table.js and before
// scripts/enrich-wikidata.js.

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { classifyProtectedAreaType } from './lib/protected-area-type.js';
import { cleanTrailingJunk } from './lib/clean-pa-name.js';
import { splitMultiPark } from './lib/split-multi-park.js';

const CORRECTIONS_PATH = 'data/corrections.csv';
const DATA_PATH = 'data/moef/esz-notifications.json';

async function loadCorrections() {
  const text = await readFile(CORRECTIONS_PATH, 'utf8');
  const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const map = new Map();
  const stateOnlyMap = new Map();
  const orderNumberMap = new Map();
  for (const row of rows) {
    const { paName, state, correctPaName, correctState, correctPaType, orderNumber, correctOrderNumber } = row;
    if (orderNumber && correctOrderNumber) {
      // MoEF's own table has the wrong S.O. number for this notification
      // (verified against the actual gazette) -- keyed by the exact
      // `orderNumber` as it currently appears, independent of paName/state.
      // Safe as long as that string is unique to one PA in the real data --
      // enforced below in main() rather than by scoping the key itself,
      // since this row has no reliable paName/state of its own to scope by
      // (the correction exists precisely because the source row is wrong).
      orderNumberMap.set(orderNumber, correctOrderNumber);
    }
    if (!state) continue;
    if (!paName) {
      // State-only correction: applies to every record with this state,
      // regardless of protected area name.
      stateOnlyMap.set(state, correctState || state);
      continue;
    }
    map.set(`${paName}${state}`, {
      correctPaName: correctPaName || paName,
      correctState: correctState || state,
      correctPaType: correctPaType || null,
    });
  }
  return { map, stateOnlyMap, orderNumberMap };
}

// MoEF's table occasionally has a mis-typed S.O./order number (confirmed
// against the actual gazette on archive.org) -- fix it, and the same literal
// number embedded in the free-text `notificationSummary`, before enrichment
// so `enrich-archive-org.js` searches for the correct number.
function applyOrderNumberCorrection(record, corrections) {
  const correctOrderNumber = corrections.orderNumberMap.get(record.orderNumber);
  if (!correctOrderNumber) return record;
  return {
    ...record,
    orderNumber: correctOrderNumber,
    notificationSummary: record.notificationSummary
      ? record.notificationSummary.split(record.orderNumber).join(correctOrderNumber)
      : record.notificationSummary,
  };
}

// A pair of notifications -- draft S.O 1498(E) and final S.O. 3099(E) --
// each declare a single ESZ around all 97 Island PAs of A&N at once instead
// of naming them individually, so both need expanding into one record per
// area. The draft's cell embeds a map link per area (used to derive the area
// names below); the final's cell has no such links, so its expansion just
// repeats the same 97 names with no maps attached.
const ANDAMAN_DRAFT_NAME = 'Union Territory of Andaman and Nicobar Islands';
const ANDAMAN_FINAL_NAME = 'Areas in the Union Territory of Andaman and Nicobar Island';

const ANDAMAN_BUTTON_ISLAND_NPS = [
  'North Button Island National Park',
  'Middle Button Island National Park',
  'South Button Island National Park',
];
const ANDAMAN_RANI_JHANSI_NP = 'Rani Jhansi Marine National Park';

// Order matches the numbered list (1. Arial ... 93. White Cliff) in the
// draft notification's "Individual maps of 93 WLS" section.
const ANDAMAN_WLS_TITLES = [
  'Arial', 'Bamboo', 'Barren', 'Batti Malv', 'Belle', 'Bennette', 'Bingham', 'Blister', 'Bluff', 'Bondoville',
  'Brush', 'Buchanan', 'Channel', 'Cinque Island', 'Clyde', 'Cone', 'Curlew Bp', 'Curlew', 'Defence', 'Dot',
  'Dotrell', 'Duncan', 'East', 'Egg', 'Entrance', 'Flat', 'Gander', 'Goose', 'Gurjan', 'Hump',
  'Inglis', 'Interview', 'James', 'Jungle', 'Kwang Tung', 'Kyd', 'Landfall', 'Latouche', 'Mangrove', 'Mask',
  'Mayo', 'Megapode', 'Montgomery', 'Narcondam', 'North Brother', 'North Reef', 'North', 'Oliver', 'Orchid', 'Ox',
  'Oyester I', 'Oyester II', 'Paget', 'Parkinson', 'Passage', 'Petric', 'Pitman', 'Peacock', 'Point', 'Potanma',
  'Ranger', 'Reef', 'Roper', 'Ross', 'Rowe', 'Sandy', 'Sea Serpent', 'Shark', 'Shearme', 'Sir Hugh Rose',
  'Sisters', 'Snake Island', 'Snake-I', 'South Brother', 'South Reef', 'South Sentinel', 'Spike II', 'Spike-I', 'Stoat', 'Surat',
  'Swamp', 'Table Dalgarno', 'Table(Excelsior)', 'Talabaicha', 'Temple', 'Tillongchong', 'Tree', 'Trilby', 'Tuft', 'Turtle',
  'West', 'Wharf', 'White Cliff',
];

const ANDAMAN_ISLAND_PA_NAMES = [
  ...ANDAMAN_BUTTON_ISLAND_NPS,
  ANDAMAN_RANI_JHANSI_NP,
  ...ANDAMAN_WLS_TITLES.map((t) => `${t} Wildlife Sanctuary`),
];

const ANDAMAN_REDUNDANT_MAP_TITLES = new Set([
  'Andman Group of Island PAs',
  'Nicobar Group of Island PAs',
]);

function expandAndamanIslandPasDraft(record, state) {
  return record.maps
    .filter((m) => !ANDAMAN_REDUNDANT_MAP_TITLES.has(m.title))
    .flatMap((m) => {
      if (m.title === 'Buttons NP') return ANDAMAN_BUTTON_ISLAND_NPS.map((name) => ({ name, map: m }));
      if (m.title === 'Rani Jhansi NP') return [{ name: ANDAMAN_RANI_JHANSI_NP, map: m }];
      return [{ name: `${m.title} Wildlife Sanctuary`, map: m }];
    })
    .map(({ name, map }) => ({
      ...record,
      protectedAreaName: name,
      protectedAreaType: classifyProtectedAreaType(name),
      state,
      maps: [map],
    }));
}

function expandAndamanIslandPasFinal(record, state) {
  return ANDAMAN_ISLAND_PA_NAMES.map((name) => ({
    ...record,
    protectedAreaName: name,
    protectedAreaType: classifyProtectedAreaType(name),
    state,
    maps: [],
  }));
}

function applyCorrection(corrections, name, state) {
  const nameHit = corrections.map.get(`${name}${state}`);
  const stateOverride = corrections.stateOnlyMap.get(state);
  if (!nameHit && !stateOverride) return { name, state, type: null };
  return {
    name: nameHit ? nameHit.correctPaName : name,
    state: stateOverride ?? (nameHit ? nameHit.correctState : state),
    type: nameHit ? nameHit.correctPaType : null,
  };
}

function cleanRecord(record, corrections) {
  record = applyOrderNumberCorrection(record, corrections);
  if (record.protectedAreaName === ANDAMAN_DRAFT_NAME || record.protectedAreaName === ANDAMAN_FINAL_NAME) {
    // These two branches skip the normal per-fragment correction pass below
    // (there's no PA name to key a correction on yet -- it's assigned during
    // expansion), so the state-only correction has to be applied here instead.
    const state = corrections.stateOnlyMap.get(record.state) ?? record.state;
    return record.protectedAreaName === ANDAMAN_DRAFT_NAME
      ? expandAndamanIslandPasDraft(record, state)
      : expandAndamanIslandPasFinal(record, state);
  }

  // Pass 1: whole-string correction/cleanup, then attempt a split.
  const pass1Hit = corrections.map.has(`${record.protectedAreaName}${record.state}`);
  const corrected = applyCorrection(corrections, record.protectedAreaName, record.state);
  const cleanedName = cleanTrailingJunk(corrected.name);
  const parts = splitMultiPark(cleanedName);

  return parts.map((part) => {
    // Pass 2: per-fragment correction (for names only fixable once split out,
    // e.g. a truncated fragment like "Sonai-Rupai Wildlife"). Skipped when
    // Pass 1 already matched -- otherwise a fragment that happens to equal
    // Pass 1's own trigger name (e.g. a PA whose corrected form is "<same
    // name>, <second PA>") would re-match that same rule and get re-inflated
    // back into the full multi-park string instead of staying split.
    const fragmentCorrected = pass1Hit
      ? { name: part, state: corrected.state, type: null }
      : applyCorrection(corrections, part, corrected.state);
    const finalName = cleanTrailingJunk(fragmentCorrected.name);
    const finalType = fragmentCorrected.type
      ?? (parts.length === 1 ? corrected.type : null)
      ?? classifyProtectedAreaType(finalName)
      ?? record.protectedAreaType;
    return {
      ...record,
      protectedAreaName: finalName,
      protectedAreaType: finalType,
      state: fragmentCorrected.state,
    };
  });
}

// Guards against an order-number correction silently over-applying: if the
// wrong `orderNumber` string it's keyed on turns out to match more than one
// distinct (protectedAreaName, state) pair in the real data, scoping by that
// string alone isn't safe and the correction needs a narrower key instead.
function assertOrderNumberCorrectionsAreScoped(records, orderNumberMap) {
  for (const wrongOrderNumber of orderNumberMap.keys()) {
    const matches = records.filter((r) => r.orderNumber === wrongOrderNumber);
    const distinctPas = new Set(matches.map((r) => `${r.protectedAreaName}|${r.state}`));
    if (distinctPas.size > 1) {
      throw new Error(
        `Order-number correction for ${JSON.stringify(wrongOrderNumber)} matches ${distinctPas.size} ` +
        `different PAs (${[...distinctPas].join(', ')}) -- refine data/corrections.csv so it only hits the intended one.`
      );
    }
  }
}

async function main() {
  const corrections = await loadCorrections();
  const records = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  assertOrderNumberCorrectionsAreScoped(records, corrections.orderNumberMap);

  const cleaned = records.flatMap((r) => cleanRecord(r, corrections));

  await writeFile(DATA_PATH, JSON.stringify(cleaned, null, 2), 'utf8');
  const csvRows = cleaned.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef/esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');

  const splitCount = cleaned.length - records.length;
  const correctedCount = records.filter((r) => corrections.map.has(`${r.protectedAreaName}${r.state}`) || corrections.stateOnlyMap.has(r.state)).length;
  const orderNumberCorrectedCount = records.filter((r) => corrections.orderNumberMap.has(r.orderNumber)).length;
  const remainingMultiLooking = cleaned.filter((r) => /\s+and\s+|,/i.test(r.protectedAreaName)).length;

  console.log(`Cleaned ${records.length} records -> ${cleaned.length} records (+${splitCount} from multi-park expansion).`);
  console.log(`Applied a whole-string correction to ${correctedCount} records.`);
  console.log(`Applied an order-number correction to ${orderNumberCorrectedCount} records.`);
  if (remainingMultiLooking > 0) {
    console.log(`${remainingMultiLooking} names still contain "and"/"," after cleanup -- review these:`);
    cleaned
      .filter((r) => /\s+and\s+|,/i.test(r.protectedAreaName))
      .forEach((r) => console.log(`  [${r.state}] ${JSON.stringify(r.protectedAreaName)}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
