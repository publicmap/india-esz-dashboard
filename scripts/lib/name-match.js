// Shared fuzzy protected-area-name matching helpers, used both to link MoEF
// notification records to Wikidata items (enrich-wikidata.js) and to score
// OSM <-> Wikidata name agreement for the OSM QA log (enrich-osm-qa.js).
import { INDIAN_STATE_AND_UT_NAMES } from './indian-states.js';

const GENERIC_PA_WORDS = [
  'wildlife sanctuary', 'wild life sanctuary', 'wildlife', 'national park', 'tiger reserve',
  'bird sanctuary', 'biosphere reserve', 'conservation reserve',
  'community reserve', 'sanctuary', 'santuary', 'reserve forest', 'reserve', 'forest',
  'wls', 'np', 'esz', 'eco sensitive zone', 'eco-sensitive zone',
];

export function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase();
  n = n.replace(/&/g, ' and ');
  n = n.replace(/[-.,()'"]/g, ' ');
  // Collapse whitespace before phrase-stripping: "&" -> " and " combined with
  // spacing already around "&" produces double spaces, which breaks the
  // literal single-space phrases below (e.g. "andaman and nicobar islands").
  n = n.replace(/\s+/g, ' ').trim();
  for (const word of GENERIC_PA_WORDS) {
    n = n.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ');
  }
  n = n.replace(/\s+/g, ' ').trim();
  for (const word of INDIAN_STATE_AND_UT_NAMES) {
    const stripped = n.replace(new RegExp(`\\b${word}\\b`, 'g'), ' ').replace(/\s+/g, ' ').trim();
    // Some protected areas are named directly after their state/UT (e.g.
    // "Dadra and Nagar Haveli Wildlife Sanctuary") -- once the generic
    // PA-type suffix is gone, the state/UT name IS the whole identifying
    // name. Stripping it too would empty the string and make the item
    // unmatchable, so skip the removal whenever it would wipe everything out.
    if (stripped) n = stripped;
  }
  return n.replace(/\s+/g, ' ').trim();
}

export function compactName(normalizedName) {
  return normalizedName.replace(/\s+/g, '');
}

// Plain Levenshtein edit distance, used to tolerate the source data's
// frequent single-letter typos/transpositions (Kambalakonda/Kambalkonda,
// Venkateswara/Venkateshwara, Narasimha/Narsimha, Nagarjunsagar/Nagarjunasagar...).
export function levenshtein(a, b) {
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

export function similarity(a, b) {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
