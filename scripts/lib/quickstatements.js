// Builds QuickStatements V1 (tab-separated) suggestions for the corrective
// Wikidata edits implied by each qa-log.js section, so a human reviewer can
// paste a batch straight into https://quickstatements.toolforge.org/ instead
// of re-deriving the property/QID/reference for every flagged row by hand.
// These are suggestions for a human to review and run, never applied
// automatically -- every function here only ever returns data (a `{ note,
// lines }` pair); qa-log.js is solely responsible for turning that into the
// <details> markdown block.
//
// Every added statement carries a source reference so the provenance
// travels with the edit: S143 (imported from Wikimedia project) + S854
// (reference URL) for anything justified by a Wikipedia article -- matching
// the convention already used by
// scripts/plugins/quickstatements-from-wikilinks.js -- or S248 (stated in)
// OpenStreetMap + S854 for anything justified by the OSM cache.
import { resolveStateQid } from './india-states.js';

const ENWIKI_QID = 'Q328'; // English Wikipedia
const OSM_QID = 'Q936'; // OpenStreetMap

// Wikidata QIDs for the four protectedAreaType values this dashboard uses
// (same items enrich-wikidata.js's PROTECTED_AREA_TYPES SPARQL query reads
// from -- see the comment there for why these four and not e.g. a generic
// "protected area").
export const PROTECTED_AREA_TYPE_QIDS = {
  'National Park': 'Q46169',
  'Wildlife Sanctuary': 'Q1377575',
  'Bird Sanctuary': 'Q2714144',
  'Tiger Reserve': 'Q5533772',
};

function qsQuote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function wikipediaSource(url) {
  return url ? `\tS143\t${ENWIKI_QID}\tS854\t${qsQuote(url)}` : `\tS143\t${ENWIKI_QID}`;
}

function osmSource(url) {
  return url ? `\tS248\t${OSM_QID}\tS854\t${qsQuote(url)}` : `\tS248\t${OSM_QID}`;
}

function enwikiTitleFromUrl(url) {
  const m = String(url ?? '').match(/\/wiki\/([^#?]+)/);
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
}

// A section with nothing mechanically fixable on Wikidata (the correction is
// on the OSM side, or the row genuinely needs human judgement) -- still
// rendered as a <details> block, just with an explanation and no batch.
export function reviewOnlyDetails(text) {
  return { note: [text], lines: [] };
}

// "Wikidata protectedAreaType corrected from Wikipedia" -- adds the
// Wikipedia-confirmed P31 value already applied to the in-memory master
// list; does not remove the old P31 (an item can legitimately hold more
// than one, e.g. a Tiger Reserve that's also a National Park).
export function protectedAreaTypeQuickStatements(rows) {
  const lines = [];
  for (const row of rows) {
    const qid = PROTECTED_AREA_TYPE_QIDS[row.newType];
    if (!qid) continue;
    lines.push(`${row.wikidataId}\tP31\t${qid}${wikipediaSource(row.wikipediaUrl)}`);
  }
  return {
    note: [
      'Adds the Wikipedia-confirmed `instance of` (P31) value. Does **not** remove the old P31 value -- some items legitimately hold more than one (e.g. a Tiger Reserve that is also a National Park); remove the stale one by hand only if it truly no longer applies.',
      'Lines are in table order -- cross-check each against the `matchConfidence` column above before running; a `fuzzy` row is less certain than an `exact` one and deserves a closer look first.',
    ],
    lines,
  };
}

// "Wikipedia entries with no Wikidata match (added to master list)" -- one
// CREATE block per new master-list entry.
export function newMasterListEntryQuickStatements(rows) {
  const lines = [];
  let skippedNoState = 0;
  for (const row of rows) {
    const typeQid = PROTECTED_AREA_TYPE_QIDS[row.protectedAreaType];
    if (!typeQid) continue;
    const stateQid = resolveStateQid(row.state);
    const title = enwikiTitleFromUrl(row.wikipediaUrl);
    lines.push('CREATE');
    lines.push(`LAST\tLen\t${qsQuote(row.protectedAreaName)}`);
    lines.push(`LAST\tP31\t${typeQid}${wikipediaSource(row.wikipediaUrl)}`);
    lines.push('LAST\tP17\tQ668');
    if (stateQid) {
      lines.push(`LAST\tP131\t${stateQid}${wikipediaSource(row.wikipediaUrl)}`);
    } else if (row.state) {
      skippedNoState += 1;
    }
    if (title) lines.push(`LAST\tSenwiki\t${qsQuote(title)}`);
  }
  const note = [
    'One `CREATE` block per new master-list entry -- makes a brand-new Wikidata item (label, instance-of, country, state, and the enwiki sitelink) sourced to the Wikipedia article that had no Wikidata item at all. **Search by name on Wikidata first before running any of these** -- this list comes from name/state matching against the fetched Indian-protected-area set, which can miss an existing item that\'s simply typed/labelled outside that set (e.g. missing `P17` India, or a P31 subclass this dashboard doesn\'t query for).',
  ];
  if (skippedNoState > 0) {
    note.push(`${skippedNoState} row(s) have a state name that didn't resolve to a known state/UT QID (see \`scripts/lib/india-states.js\`) -- P131 omitted for those, add it by hand.`);
  }
  return { note, lines };
}

// "Wikidata items with no Wikipedia match" -- most rows here need human
// judgement (naming mismatch vs. a genuine Wikipedia gap), but when the
// caller has found a same-name Wikipedia entry under a *different* state
// (see wikipedia-qa.js), that's a concrete, common root cause worth
// surfacing: a stale Wikidata P131 chain (e.g. still resolving to a
// pre-2000 undivided state) rather than two distinct, coincidentally-named
// places.
export function noWikipediaMatchQuickStatements(rows) {
  const lines = [];
  for (const row of rows) {
    if (!row.wikipediaNameMatchState) continue;
    const qid = resolveStateQid(row.wikipediaNameMatchState);
    if (!qid) continue;
    lines.push(`${row.wikidataId}\tP131\t${qid}${wikipediaSource(row.wikipediaNameMatchUrl)}`);
  }
  const note = [
    'Where `wikipediaNameMatchState` is filled in, a Wikipedia entry with the *exact same name* exists under a different state -- often because Wikidata\'s P131 chain is stale (e.g. it still resolves to a pre-2000 undivided state) rather than because these are genuinely two different, coincidentally-named places. This repo\'s own matcher treats a disagreeing state as a hard veto for exactly that reason (see `scripts/lib/wikidata-match.js`), so confirm the same district/coordinates before applying anything below.',
    'Adds a direct P131 to the state the mismatch points at, rather than removing the existing chain -- if the wrong value is inherited from an intermediate district/tehsil-level P131 rather than set directly on the item, that link needs separate correction by hand.',
  ];
  if (lines.length === 0) {
    note.push('None of the rows above had a resolvable same-name/different-state Wikipedia hint, so no statement could be auto-derived here.');
  }
  return { note, lines };
}

// "Wikidata P402 (OSM relation) outdated" -- removes the stale identifier.
export function p402RemovalQuickStatements(rows) {
  const lines = rows.map((row) => `${row.wikidataId}\t-P402\t${qsQuote(row.osmRelationId)}`);
  return {
    note: [
      'Removes the stale P402 (OpenStreetMap Relation identifier) value. If the detail column shows the relation now belongs to a different OSM object entirely, add the corrected relation id by hand instead of just removing this one (`Qid\tP402\t"<new-relation-id>"`).',
    ],
    lines,
  };
}

// "Wikidata coordinate outside OSM polygon" -- moves P625 to the OSM
// boundary's centroid. `rows` must carry the raw `centroidLat`/`centroidLon`
// numbers (not just the formatted distance columns rendered in the table).
export function coordinateCorrectionQuickStatements(rows) {
  const lines = [];
  for (const row of rows) {
    if (row.centroidLat == null || row.centroidLon == null) continue;
    lines.push(`${row.wikidataId}\tP625\t@${row.centroidLat.toFixed(6)}/${row.centroidLon.toFixed(6)}${osmSource(row.osmUrl)}`);
  }
  return {
    note: [
      'Moves P625 to the OSM boundary\'s centroid. Check the `distanceToBoundary`/`distanceToCentroid` columns first -- a large distance can mean the Wikidata coordinate is simply wrong (apply this), or that it correctly points at one specific feature/landmark inside a much larger OSM-mapped boundary, in which case OSM is right and this statement should be skipped.',
    ],
    lines,
  };
}
