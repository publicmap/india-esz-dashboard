// Loads the three structured Wikipedia protected-area lists written by
// parse-wikipedia-tables.js (data/wikipedia/*.json) for consumption by
// enrich-wikidata.js's Wikipedia cross-reference + QA pass.
import { readFile } from 'node:fs/promises';

const SOURCES = [
  { path: 'data/wikipedia/national-parks.json', source: 'national-parks' },
  { path: 'data/wikipedia/wildlife-sanctuaries.json', source: 'wildlife-sanctuaries' },
  { path: 'data/wikipedia/tiger-reserves.json', source: 'tiger-reserves' },
];

// Returns [] (rather than throwing) for a source that hasn't been generated
// yet (npm run fetch && npm run parse:wikipedia), so callers can skip
// Wikipedia cross-referencing gracefully instead of crashing.
export async function loadWikipediaRecords() {
  const all = [];
  for (const { path, source } of SOURCES) {
    let records;
    try {
      records = JSON.parse(await readFile(path, 'utf8'));
    } catch {
      continue;
    }
    for (const record of records) all.push({ ...record, wikipediaSource: source });
  }
  return all;
}
