// Cross-references the Wikidata Indian-protected-area list against the three
// structured Wikipedia protected-area lists (data/wikipedia/*.json, written
// by parse-wikipedia-tables.js). Wikipedia's lists are actively maintained
// (e.g. a Wildlife Sanctuary upgraded to a Tiger Reserve shows up there
// quickly) while a Wikidata item's P31 type can lag behind for years, so:
//
//  1. For a Wikidata item matched to one or more Wikipedia entries, its
//     `protectedAreaType` is corrected to the most specific type among the
//     matches whenever it disagrees (Tiger Reserve > National Park > Bird
//     Sanctuary > Wildlife Sanctuary, see protected-area-type.js) -- this is
//     the "correct outdated categorization" half of the task.
//  2. A Wikipedia entry with no Wikidata match at all becomes a brand new
//     master-list entry (wikidataId set to a synthetic `WIKIPEDIA:...` id,
//     never a real QID), so the combined list is a superset of both
//     sources -- this is the "build a master PA list" half.
//
// Returns QA sections (rendered into data/wikidata/qa-log.md by qa-log.js,
// alongside osm-qa.js's sections) plus the new entries to append to the
// Wikidata item list, covering:
//   - Wikidata items whose protectedAreaType was corrected from Wikipedia
//   - Wikidata items matched by more than one Wikipedia entry (possible
//     reclassification, or a wrong fuzzy match -- flagged either way)
//   - Fuzzy (non-exact) Wikidata<->Wikipedia matches, for review
//   - Wikipedia entries with no Wikidata match (added to the master list)
//   - Wikidata items typed as National Park/Wildlife Sanctuary/Tiger Reserve
//     with no matching Wikipedia entry (possible gap on either side)
import { buildMatcher, normalizeState, statesAgree } from './wikidata-match.js';
import { normalizeName, compactName } from './name-match.js';
import { isMoreSpecificType } from './protected-area-type.js';
import {
  reviewOnlyDetails,
  protectedAreaTypeQuickStatements,
  newMasterListEntryQuickStatements,
  noWikipediaMatchQuickStatements,
} from './quickstatements.js';

// The three Wikipedia lists only cover these three type categories -- a
// Wikidata item typed e.g. "Bird Sanctuary" or "Biosphere Reserve" is
// expected to have no Wikipedia match and isn't a gap worth flagging.
const WIKIPEDIA_COVERED_TYPES = new Set(['National Park', 'Wildlife Sanctuary', 'Tiger Reserve']);

function slugify(text) {
  const slug = (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

// Never a real Wikidata QID (those are always "Q" + digits) -- distinguishable
// at a glance, and stable across runs since it's derived from the record's
// own state+name rather than array position.
function syntheticWikidataId(record) {
  return `WIKIPEDIA:${slugify(record.state)}:${slugify(record.protectedAreaName)}`;
}

function parseAreaKm2(text) {
  if (!text) return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Builds a brand-new master-list entry (same shape as a Wikidata-fetched
// item) for a Wikipedia record with no Wikidata match.
function toMasterListEntry(record) {
  const normalizedName = normalizeName(record.protectedAreaName);
  // record.nameAlias is the link's own display text when it differs from the
  // linked Wikipedia article name (e.g. "Nagarhole National Park(Rajiv
  // Gandhi)" for an article titled "Nagarhole National Park") -- carry it
  // forward as an alias so a later join (e.g. the MoEF matcher, which also
  // searches an item's aliases) can still match a record that uses this
  // display form instead of the article title.
  const aliases = record.nameAlias ? [record.nameAlias] : [];
  const normalizedAliases = aliases.map((a) => normalizeName(a)).filter(Boolean);
  const compactAliases = normalizedAliases.map((n) => compactName(n));
  return {
    wikidataId: syntheticWikidataId(record),
    wikidataUrl: null,
    wikidataLabel: record.protectedAreaName,
    aliases,
    normalizedName,
    compactName: compactName(normalizedName),
    normalizedAliases,
    compactAliases,
    protectedAreaType: record.protectedAreaType,
    partOf: [],
    image: record.imageUrl ?? null,
    iucnCategory: null,
    inception: record.formed ?? record.declared ?? record.inclusion ?? null,
    worldHeritageSiteId: null,
    locatedInAdminTerritorialEntity: [],
    state: record.state ? [record.state] : [],
    coordinateLatitude: record.latitude ?? null,
    coordinateLongitude: record.longitude ?? null,
    significantPlace: [],
    heritageDesignation: [],
    area: parseAreaKm2(record.area ?? record.areaTotalKm2),
    officialWebsite: [],
    pageBanner: null,
    commonsCategory: null,
    osmRelationIds: [],
    enwikiUrl: record.wikipediaUrl ?? null,
    wikipediaUrl: record.wikipediaUrl ?? null,
    wikipediaSource: record.wikipediaSource,
    dataSource: 'wikipedia',
  };
}

// Mutates wikidataItems in place (protectedAreaType correction + wikipedia*/
// dataSource fields). Returns { sections, newEntries, stats }; does not
// write anything itself.
export function crossReferenceWikipedia(wikidataItems, wikipediaRecords) {
  // Every item needs the same key set (dataSource/wikipediaUrl/
  // wikipediaSource) before writeWikidataTable's CSV export, whether or not
  // it ends up matched below -- otherwise csv-stringify (which infers
  // columns from the first row) silently drops these columns if the first
  // item happens to have no Wikipedia match.
  for (const item of wikidataItems) {
    if (!item.dataSource) item.dataSource = 'wikidata';
    if (item.wikipediaUrl === undefined) item.wikipediaUrl = null;
    if (item.wikipediaSource === undefined) item.wikipediaSource = null;
  }

  if (wikipediaRecords.length === 0) {
    return {
      sections: [],
      newEntries: [],
      stats: {
        totalWikipediaRecords: 0, matchedCount: 0, newEntryCount: 0, correctedTypeCount: 0,
      },
    };
  }

  const match = buildMatcher(wikidataItems);
  const matchesByItem = new Map(); // wikidataItem -> [{ record, matchConfidence }]
  const unmatchedWikipedia = [];

  for (const record of wikipediaRecords) {
    // record.protectedAreaName is the linked Wikipedia article's own name --
    // try that first. Only when it fails to match anything does the link's
    // display text (record.nameAlias, when it differs from the article name)
    // get tried as a fallback name -- see wikilinkName in
    // parse-wikipedia-tables.js.
    let { item, matchConfidence } = match(record.protectedAreaName, record.state);
    if (!item && record.nameAlias) {
      ({ item, matchConfidence } = match(record.nameAlias, record.state));
    }
    if (!item) {
      unmatchedWikipedia.push(record);
      continue;
    }
    if (!matchesByItem.has(item)) matchesByItem.set(item, []);
    matchesByItem.get(item).push({ record, matchConfidence });
  }

  const correctedType = [];
  const multiSourceMatches = [];
  const fuzzyMatches = [];

  for (const [item, matches] of matchesByItem) {
    // The most specific type among every matched Wikipedia entry wins (a
    // Tiger Reserve entry beats a stale Wildlife Sanctuary entry for the same
    // place), regardless of which source happened to be processed first.
    let winner = matches[0];
    for (const m of matches) {
      if (isMoreSpecificType(m.record.protectedAreaType, winner.record.protectedAreaType)) winner = m;
    }

    if (winner.record.protectedAreaType && winner.record.protectedAreaType !== item.protectedAreaType) {
      correctedType.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        oldType: item.protectedAreaType ?? '(none)',
        newType: winner.record.protectedAreaType,
        wikipediaSource: winner.record.wikipediaSource,
        wikipediaUrl: winner.record.wikipediaUrl ?? '',
        matchConfidence: winner.matchConfidence,
      });
      item.protectedAreaType = winner.record.protectedAreaType;
    }

    item.wikipediaUrl = winner.record.wikipediaUrl ?? item.wikipediaUrl ?? null;
    item.wikipediaSource = winner.record.wikipediaSource;
    if (!item.enwikiUrl) item.enwikiUrl = winner.record.wikipediaUrl ?? null;

    if (matches.length > 1) {
      multiSourceMatches.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        matchedEntries: matches.map((m) => `${m.record.protectedAreaName} [${m.record.wikipediaSource}] (${m.record.protectedAreaType})`).join('; '),
        detail: 'More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review).',
      });
    }

    for (const m of matches) {
      if (m.matchConfidence !== 'fuzzy') continue;
      fuzzyMatches.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        wikipediaName: m.record.protectedAreaName,
        wikipediaSource: m.record.wikipediaSource,
        wikipediaState: m.record.state ?? '',
      });
    }
  }

  const newEntries = unmatchedWikipedia.map(toMasterListEntry);

  // Index every Wikipedia record (matched or not) by normalized name, so a
  // "no Wikipedia match" Wikidata item can be checked for a same-name entry
  // under a *different* state -- a strong, common signal of a stale P131
  // chain on the Wikidata side (see the "Wikidata items with no Wikipedia
  // match" section below), rather than the name genuinely being absent from
  // Wikipedia.
  const wikipediaRecordsByNormName = new Map();
  for (const record of wikipediaRecords) {
    const key = normalizeName(record.protectedAreaName);
    if (!key) continue;
    if (!wikipediaRecordsByNormName.has(key)) wikipediaRecordsByNormName.set(key, []);
    wikipediaRecordsByNormName.get(key).push(record);
  }

  const matchedItemTypes = new Set(matchesByItem.keys());
  const wikidataGaps = wikidataItems
    .filter((item) => WIKIPEDIA_COVERED_TYPES.has(item.protectedAreaType) && !matchedItemTypes.has(item))
    .map((item) => {
      const itemStates = (item.state || []).map(normalizeState);
      const sameNameDifferentState = (wikipediaRecordsByNormName.get(item.normalizedName) || [])
        .find((r) => r.state && !itemStates.some((s) => statesAgree(s, normalizeState(r.state))));
      return {
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        protectedAreaType: item.protectedAreaType,
        state: (item.state || []).join('; '),
        wikipediaNameMatchState: sameNameDifferentState?.state ?? '',
        wikipediaNameMatchUrl: sameNameDifferentState?.wikipediaUrl ?? '',
      };
    });

  const newEntryRows = unmatchedWikipedia.map((r) => ({
    protectedAreaName: r.protectedAreaName,
    protectedAreaType: r.protectedAreaType,
    state: r.state ?? '',
    wikipediaSource: r.wikipediaSource,
    wikipediaUrl: r.wikipediaUrl ?? '',
  }));

  const sections = [
    {
      title: 'Wikidata protectedAreaType corrected from Wikipedia',
      description: 'Wikidata\'s P31-derived type disagreed with the matched Wikipedia entry\'s -- corrected in favor of Wikipedia (more actively maintained for these three categories).',
      columns: ['wikidataId', 'wikidataLabel', 'oldType', 'newType', 'wikipediaSource', 'wikipediaUrl', 'matchConfidence'],
      rows: correctedType,
      quickStatements: protectedAreaTypeQuickStatements(correctedType),
    },
    {
      title: 'Wikidata item matched by multiple Wikipedia entries',
      description: 'More than one Wikipedia entry (possibly from different lists) matched the same Wikidata item.',
      columns: ['wikidataId', 'wikidataLabel', 'matchedEntries', 'detail'],
      rows: multiSourceMatches,
      quickStatements: reviewOnlyDetails(
        'No single correct edit -- this is either a genuine reclassification (the Wikidata item legitimately covers what Wikipedia now splits across multiple articles/types, in which case the protectedAreaType correction above already handles it) or a wrong fuzzy match pulling an unrelated Wikipedia entry onto this item (in which case the fix is on the *matching* side, not a Wikidata edit -- see the "Fuzzy Wikidata<->Wikipedia matches" and "Wikidata items with no Wikipedia match" sections, since a wrongly-absorbed entry usually shows up there as the real item\'s missed match).',
      ),
    },
    {
      title: 'Fuzzy Wikidata<->Wikipedia matches',
      description: 'Matched by fuzzy name/state similarity rather than an exact name match -- worth a human sanity check.',
      columns: ['wikidataId', 'wikidataLabel', 'wikipediaName', 'wikipediaSource', 'wikipediaState'],
      rows: fuzzyMatches,
      quickStatements: reviewOnlyDetails(
        'No mechanical fix -- the type/URL correction from this match (if any) is already reflected in the "protectedAreaType corrected" section above. If a row here turns out to be the *wrong* Wikidata item for this Wikipedia entry, the correct item is often sitting in the "Wikidata items with no Wikipedia match" section below (unmatched because this fuzzy match took its Wikipedia entry) -- fix it there instead of here.',
      ),
    },
    {
      title: 'Wikipedia entries with no Wikidata match (added to master list)',
      description: 'No Wikidata item matched this Wikipedia entry by name/state -- added to the master protected-area list as a new entry with a synthetic `WIKIPEDIA:...` id instead of a Wikidata QID.',
      columns: ['protectedAreaName', 'protectedAreaType', 'state', 'wikipediaSource', 'wikipediaUrl'],
      rows: newEntryRows,
      quickStatements: newMasterListEntryQuickStatements(newEntryRows),
    },
    {
      title: 'Wikidata items with no Wikipedia match',
      description: 'Wikidata item is typed as National Park / Wildlife Sanctuary / Tiger Reserve (categories the three Wikipedia lists cover) but no Wikipedia entry matched it -- possible naming mismatch, or genuinely absent from Wikipedia. `wikipediaNameMatchState`/`wikipediaNameMatchUrl`, when filled in, point at a Wikipedia entry with the exact same name under a different state (see the QuickStatements note below).',
      columns: ['wikidataId', 'wikidataLabel', 'protectedAreaType', 'state', 'wikipediaNameMatchState', 'wikipediaNameMatchUrl'],
      rows: wikidataGaps,
      quickStatements: noWikipediaMatchQuickStatements(wikidataGaps),
    },
  ];

  return {
    sections,
    newEntries,
    stats: {
      totalWikipediaRecords: wikipediaRecords.length,
      matchedCount: matchesByItem.size,
      newEntryCount: newEntries.length,
      correctedTypeCount: correctedType.length,
    },
  };
}
