// Adds a `notificationArchiveLink` column to data/moef-esz-notifications.json
// (and .csv) by looking up each record's S.O. order number + date against
// archive.org's "gazetteofindia" collection. See scripts/lib/archive-org.js
// for why both the number and the date are needed.

import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { findGazetteArchiveLink } from './lib/archive-org.js';

const CONCURRENCY = 6;

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
  const records = JSON.parse(await readFile('data/moef-esz-notifications.json', 'utf8'));

  const cache = new Map();
  let lookups = 0;
  let failures = 0;

  const linked = await runWithConcurrency(records, async (record) => {
    if (!record.orderNumber || !record.notificationDate) {
      return { ...record, notificationArchiveLink: null };
    }
    const key = `${record.orderNumber}|${record.notificationDate}`;
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        lookups += 1;
        try {
          return await findGazetteArchiveLink(record.orderNumber, record.notificationDate);
        } catch (err) {
          failures += 1;
          console.error(`Archive.org lookup failed for ${key}: ${err.message}`);
          return null;
        }
      })());
    }
    const notificationArchiveLink = await cache.get(key);
    return { ...record, notificationArchiveLink };
  }, CONCURRENCY);

  await writeFile('data/moef-esz-notifications.json', JSON.stringify(linked, null, 2), 'utf8');
  const csvRows = linked.map((r) => ({ ...r, maps: JSON.stringify(r.maps) }));
  await writeFile('data/moef-esz-notifications.csv', stringify(csvRows, { header: true }), 'utf8');

  const found = linked.filter((r) => r.notificationArchiveLink).length;
  console.log(`Looked up ${lookups} unique order numbers (${failures} failed after retries).`);
  console.log(`Archive link found for ${found} / ${linked.length} records.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
