// Wikidata QIDs for India's current 28 states + 8 union territories, used to
// fill in a P131 (located in admin entity) value when generating
// QuickStatements suggestions from a plain state-name string. Verified
// 2026-08 via a `wdt:P31 wd:Q12443800` (state of India) / `wd:Q467745`
// (union territory) SPARQL query, then hand-disambiguated against
// historical/duplicate items that also matched:
//  - Jammu and Kashmir: Q1180 is the pre-2019 princely-state/state item
//    ("Jammu and Kashmir (state)"); Q66278313 is the current union
//    territory ("Jammu and Kashmir (union territory)") -- used here.
//  - Chandigarh: Q120971341 is a little-used duplicate ("Union Territory of
//    Chandigarh"); Q43433 is the main, widely-sitelinked item -- used here.
// Any other historical state (Bombay State, Madras State, etc.) that also
// matched the same query is deliberately omitted -- this table is
// current-day-only.
import { normalizeState } from './wikidata-match.js';

const STATE_QIDS = {
  'andhra pradesh': 'Q1159',
  'arunachal pradesh': 'Q1162',
  assam: 'Q1164',
  bihar: 'Q1165',
  chhattisgarh: 'Q1168',
  goa: 'Q1171',
  gujarat: 'Q1061',
  haryana: 'Q1174',
  'himachal pradesh': 'Q1177',
  jharkhand: 'Q1184',
  karnataka: 'Q1185',
  kerala: 'Q1186',
  'madhya pradesh': 'Q1188',
  maharashtra: 'Q1191',
  manipur: 'Q1193',
  meghalaya: 'Q1195',
  mizoram: 'Q1502',
  nagaland: 'Q1599',
  odisha: 'Q22048',
  punjab: 'Q22424',
  rajasthan: 'Q1437',
  sikkim: 'Q1505',
  'tamil nadu': 'Q1445',
  telangana: 'Q677037',
  tripura: 'Q1363',
  'uttar pradesh': 'Q1498',
  uttarakhand: 'Q1499',
  'west bengal': 'Q1356',
  'andaman and nicobar': 'Q40888', // normalizeState strips the trailing "Islands"
  chandigarh: 'Q43433',
  'dadra and nagar haveli and daman and diu': 'Q77997266',
  'dadra nagar haveli and daman and diu': 'Q77997266',
  'national capital territory of delhi': 'Q9357528',
  'nct of delhi': 'Q9357528',
  delhi: 'Q9357528',
  'jammu and kashmir': 'Q66278313',
  ladakh: 'Q200667',
  lakshadweep: 'Q26927',
  puducherry: 'Q66743',
  pondicherry: 'Q66743',
};

// Returns the Wikidata QID for a state/UT name, or null if the name (after
// the same normalization the fuzzy matcher uses -- lowercased, "&"->"and",
// district/state/ut suffixes stripped) isn't a recognized current state/UT.
export function resolveStateQid(stateName) {
  if (!stateName) return null;
  return STATE_QIDS[normalizeState(stateName)] ?? null;
}
