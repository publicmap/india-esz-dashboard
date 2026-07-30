// Cleans the parsed MoEF notification records (data/moef-esz-notifications.json)
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
const DATA_PATH = 'data/moef-esz-notifications.json';

async function loadCorrections() {
  const text = await readFile(CORRECTIONS_PATH, 'utf8');
  const rows = parse(text, { columns: true, skip_empty_lines: true });
  const map = new Map();
  const stateOnlyMap = new Map();
  for (const row of rows) {
    const { paName, state, correctPaName, correctState, correctPaType } = row;
    if (!state) continue;
    if (!paName) {
      // State-only correction: applies to every record with this state,
      // regardless of protected area name.
      stateOnlyMap.set(state, correctState || state);
      continue;
    }
    map.set(`${paName}${state}`, {
      correctPaName: correctPaName || paName,
      correctState: correctState || state,
      correctPaType: correctPaType || null,
    });
  }
  return { map, stateOnlyMap };
}

function applyCorrection(corrections, name, state) {
  const nameHit = corrections.map.get(`${name}${state}`);
  const stateOverride = corrections.stateOnlyMap.get(state);
  if (!nameHit && !stateOverride) return { name, state, type: null };
  return {
    name: nameHit ? nameHit.correctPaName : name,
    state: stateOverride ?? (nameHit ? nameHit.correctState : state),
    type: nameHit ? nameHit.correctPaType : null,
  };
}

function cleanRecord(record, corrections) {
  // Pass 1: whole-string correction/cleanup, then attempt a split.
  const corrected = applyCorrection(corrections, record.protectedAreaName, record.state);
  const cleanedName = cleanTrailingJunk(corrected.name);
  const parts = splitMultiPark(cleanedName);

  return parts.map((part) => {
    // Pass 2: per-fragment correction (for names only fixable once split out,
    // e.g. a truncated fragment like "Sonai-Rupai Wildlife").
    const fragmentCorrected = applyCorrection(corrections, part, corrected.state);
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

async function main() {
  const corrections = await loadCorrections();
  const records = JSON.parse(await readFile(DATA_PATH, 'utf8'));

  const cleaned = records.flatMap((r) => cleanRecord(r, corrections));

  await writeFile(DATA_PATH, JSON.stringify(cleaned, null, 2), 'utf8');
  const csvRows = cleaned.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef-esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');

  const splitCount = cleaned.length - records.length;
  const correctedCount = records.filter((r) => corrections.map.has(`${r.protectedAreaName}${r.state}`) || corrections.stateOnlyMap.has(r.state)).length;
  const remainingMultiLooking = cleaned.filter((r) => /\s+and\s+|,/i.test(r.protectedAreaName)).length;

  console.log(`Cleaned ${records.length} records -> ${cleaned.length} records (+${splitCount} from multi-park expansion).`);
  console.log(`Applied a whole-string correction to ${correctedCount} records.`);
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
