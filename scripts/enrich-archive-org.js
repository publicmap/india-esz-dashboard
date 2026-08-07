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

import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { findGazetteArchiveLink } from './lib/archive-org.js';
import { loadCache, saveCache, getArchiveResult, setArchiveResult } from './lib/enrichment-cache.js';
import { diffByKey, logDiff } from './lib/diff-log.js';

const CONCURRENCY = 6;
const CACHE_PATH = 'data/enrichment-cache.csv';

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

  const linked = await runWithConcurrency(records, async (record) => {
    if (!record.orderNumber || !record.notificationDate) {
      return { ...record, notificationArchiveLink: null };
    }

    const cached = getArchiveResult(cache, record.orderNumber, record.notificationDate);
    if (cached !== undefined) {
      cacheHits += 1;
      return { ...record, notificationArchiveLink: cached ? cached.url : null };
    }

    const key = `${record.orderNumber}|${record.notificationDate}`;
    if (!pending.has(key)) {
      pending.set(key, (async () => {
        lookups += 1;
        try {
          return await findGazetteArchiveLink(record.orderNumber, record.notificationDate, record.protectedAreaName);
        } catch (err) {
          failures += 1;
          console.error(`Archive.org lookup failed for ${key}: ${err.message}`);
          return null;
        }
      })());
    }
    const result = await pending.get(key);
    setArchiveResult(cache, record.orderNumber, record.notificationDate, result);
    return { ...record, notificationArchiveLink: result ? result.url : null };
  }, CONCURRENCY);

  const diff = diffByKey(records, linked, recordKey);

  await writeFile('data/moef/esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef/esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');
  await saveCache(CACHE_PATH, cache);

  const found = linked.filter((r) => r.notificationArchiveLink).length;
  console.log(`${cacheHits} records served from cache; looked up ${lookups} new order numbers (${failures} failed after retries).`);
  console.log(`Archive link found for ${found} / ${linked.length} records.`);
  logDiff('Archive-link records', diff, describeRecord);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
