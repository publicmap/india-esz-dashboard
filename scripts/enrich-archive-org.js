// Adds a `notificationArchiveLink` column to data/moef/esz-notifications.json
// (and .csv) by looking up each record's S.O. order number + date against
// archive.org's "gazetteofindia" collection. See scripts/lib/archive-org.js
// for why both the number and the date are needed.
//
// Results are persisted in data/enrichment-cache.csv, keyed by order number,
// so a repeat run only looks up notifications that weren't already resolved
// (archive.org's search API is slow -- several seconds per request under
// sustained load -- so re-fetching ~900 unmoved records every run is wasted
// work once most of them are already cached).

import { readFile, rm, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { findGazetteArchiveLink } from './lib/archive-org.js';
import { loadCache, saveCache, getArchiveResult, setArchiveResult } from './lib/enrichment-cache.js';
import { diffByKey, logDiff } from './lib/diff-log.js';

const CONCURRENCY = 6;
const CACHE_PATH = 'data/enrichment-cache.csv';
const RETRY_NONE = process.argv.includes('--retry-none');
const CHECKPOINT_EVERY = 5;
const RETRY_PROGRESS_PATH = 'data/.retry-none-progress.json';

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function recordKey(r) {
  return `${r.orderNumber}|${r.notificationDate}|${r.protectedAreaName}|${r.state}`;
}

function describeRecord(r) {
  const links = [r.notificationPdfLink, r.notificationArchiveLink].filter(Boolean);
  return `${r.protectedAreaName} (${r.state}) -- ${links.join(' | ') || 'no links'}`;
}

async function runWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function runNext() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runNext));
  return results;
}

async function main() {
  const records = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  const cache = await loadCache(CACHE_PATH);

  const pending = new Map(); // in-flight/completed lookups this run, keyed by orderNumber|date
  let lookups = 0;
  let cacheHits = 0;
  let failures = 0;

  // --retry-none resume state: keys already re-checked by an interrupted
  // --retry-none run. A re-check that still misses stays "NONE" in the cache,
  // indistinguishable from one never re-checked, so this sidecar is the only
  // way a restarted pass can skip them. Deleted once a pass completes.
  const retried = new Set(RETRY_NONE ? await readJson(RETRY_PROGRESS_PATH, []) : []);
  if (retried.size) console.log(`Resuming --retry-none: ${retried.size} order numbers already re-checked.`);

  // Checkpoint every few lookups so a killed/crashed run (a full --retry-none
  // pass can take hours) keeps what it found. Saves are chained so two never
  // overlap, and saveCache() writes atomically.
  let saveChain = Promise.resolve();
  let sinceSave = 0;
  const save = () => {
    saveChain = saveChain.then(async () => {
      await saveCache(CACHE_PATH, cache);
      if (RETRY_NONE) await writeFile(RETRY_PROGRESS_PATH, JSON.stringify([...retried]), 'utf8');
    });
    return saveChain;
  };
  const checkpoint = () => {
    sinceSave += 1;
    if (sinceSave >= CHECKPOINT_EVERY) {
      sinceSave = 0;
      save();
    }
  };

  const linked = await runWithConcurrency(records, async (record) => {
    if (!record.orderNumber || !record.notificationDate) {
      return { ...record, notificationArchiveLink: null };
    }

    const key = `${record.orderNumber}|${record.notificationDate}`;
    const cached = getArchiveResult(cache, record.orderNumber, record.notificationDate);
    // --retry-none re-looks-up cached "NONE" misses: many were cached before
    // the full-text OCR fallback existed (2026-08-04) and now resolve.
    const retryThis = RETRY_NONE && cached === null && !retried.has(key);
    if (cached !== undefined && !retryThis) {
      cacheHits += 1;
      return { ...record, notificationArchiveLink: cached ? cached.url : null };
    }

    if (!pending.has(key)) {
      pending.set(key, (async () => {
        lookups += 1;
        try {
          const found = await findGazetteArchiveLink(record.orderNumber, record.notificationDate, record.protectedAreaName);
          setArchiveResult(cache, record.orderNumber, record.notificationDate, found);
          if (RETRY_NONE) retried.add(key);
          console.log(`[${lookups}] ${key} -> ${found ? `${found.identifier} (${found.matchMethod})` : 'NONE'}`);
          checkpoint();
          return found;
        } catch (err) {
          // Not cached: a network failure isn't a confirmed miss, so leave the
          // row as it was (unlooked-up, or its old NONE) for the next run.
          failures += 1;
          console.error(`Archive.org lookup failed for ${key}: ${err.message}`);
          return undefined;
        }
      })());
    }
    const result = await pending.get(key);
    if (result !== undefined) setArchiveResult(cache, record.orderNumber, record.notificationDate, result);
    const final = result === undefined ? cached : result;
    return { ...record, notificationArchiveLink: final ? final.url : null };
  }, CONCURRENCY);

  const diff = diffByKey(records, linked, recordKey);

  await writeFile('data/moef/esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef/esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');
  await save();
  if (RETRY_NONE) await rm(RETRY_PROGRESS_PATH, { force: true });

  const found = linked.filter((r) => r.notificationArchiveLink).length;
  console.log(`${cacheHits} records served from cache; looked up ${lookups} new order numbers (${failures} failed after retries).`);
  console.log(`Archive link found for ${found} / ${linked.length} records.`);
  logDiff('Archive-link records', diff, describeRecord);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
