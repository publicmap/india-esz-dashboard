// Persistent cache of per-notification enrichment results (data/enrichment-cache.csv),
// keyed by S.O. (order) number, so repeat pipeline runs don't redo expensive
// archive.org lookups (or silently churn Wikidata matches) for notifications
// already resolved on a previous run.
//
// One row per (orderNumber, notificationDate, protectedAreaName): S.O.
// numbers reset every calendar year (so the same number can, rarely, refer to
// two different notifications in our own data) and a single multi-park
// notification covers several areas, each with its own Wikidata match, so
// all three fields together are needed to identify a row. The archive* columns
// are the same across every park row for a given (orderNumber, notificationDate),
// since the archive link is a property of the notification, not the park.
//
// archiveLink cell: empty = not yet looked up, "NONE" = looked up, confirmed
// no match, a URL = found. The other archive* columns carry a copy of the
// matched item's metadata (identifier, collection, creator, date, and the
// Ministry/Department/Subject/Gazette Source parsed out of its `description`
// field) purely so a human can QA a match from the cache CSV without having
// to re-open archive.org for every row.
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const COLUMNS = [
  'orderNumber', 'notificationDate', 'protectedAreaName', 'wikidataId',
  'archiveLink', 'archiveMatchMethod', 'archiveIdentifier', 'archiveCollection',
  'archiveCreator', 'archiveDate', 'archiveMinistry', 'archiveDepartment',
  'archiveSubject', 'archiveGazetteSource',
];
const NO_MATCH = 'NONE';
const EMPTY_ARCHIVE_FIELDS = {
  archiveMatchMethod: '', archiveIdentifier: '', archiveCollection: '', archiveCreator: '',
  archiveDate: '', archiveMinistry: '', archiveDepartment: '', archiveSubject: '', archiveGazetteSource: '',
};

export async function loadCache(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  if (!text.trim()) return [];
  return parse(text, { columns: true, skip_empty_lines: true });
}

export async function saveCache(path, cache) {
  const sorted = [...cache].sort((a, b) => (a.orderNumber + a.notificationDate).localeCompare(b.orderNumber + b.notificationDate));
  const csv = stringify(sorted, { header: true, columns: COLUMNS });
  await writeFile(path, csv, 'utf8');
}

function findRow(cache, orderNumber, notificationDate, protectedAreaName) {
  return cache.find((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate
    && (protectedAreaName === undefined || r.protectedAreaName === protectedAreaName));
}

export function getArchiveResult(cache, orderNumber, notificationDate) {
  const row = findRow(cache, orderNumber, notificationDate);
  if (!row || !row.archiveLink) return undefined; // not yet looked up
  if (row.archiveLink === NO_MATCH) return null;
  return {
    url: row.archiveLink,
    matchMethod: row.archiveMatchMethod || '',
    identifier: row.archiveIdentifier || '',
    collection: row.archiveCollection || '',
    creator: row.archiveCreator || '',
    date: row.archiveDate || '',
    ministry: row.archiveMinistry || '',
    department: row.archiveDepartment || '',
    subject: row.archiveSubject || '',
    gazetteSource: row.archiveGazetteSource || '',
  };
}

export function setArchiveResult(cache, orderNumber, notificationDate, result) {
  const fields = result
    ? {
      archiveLink: result.url,
      archiveMatchMethod: result.matchMethod || '',
      archiveIdentifier: result.identifier || '',
      archiveCollection: result.collection || '',
      archiveCreator: result.creator || '',
      archiveDate: result.date || '',
      archiveMinistry: result.ministry || '',
      archiveDepartment: result.department || '',
      archiveSubject: result.subject || '',
      archiveGazetteSource: result.gazetteSource || '',
    }
    : { archiveLink: NO_MATCH, ...EMPTY_ARCHIVE_FIELDS };

  const matching = cache.filter((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate);
  if (matching.length === 0) {
    cache.push({
      orderNumber, notificationDate, protectedAreaName: '', wikidataId: '', ...fields,
    });
    return;
  }
  for (const row of matching) Object.assign(row, fields);
}

export function getWikidataId(cache, orderNumber, notificationDate, protectedAreaName) {
  const row = findRow(cache, orderNumber, notificationDate, protectedAreaName);
  return row?.wikidataId || undefined;
}

export function setWikidataId(cache, orderNumber, notificationDate, protectedAreaName, wikidataId) {
  if (!orderNumber) return;
  const row = findRow(cache, orderNumber, notificationDate, protectedAreaName);
  if (row) {
    row.wikidataId = wikidataId || '';
    return;
  }
  cache.push({
    orderNumber, notificationDate, protectedAreaName, wikidataId: wikidataId || '', archiveLink: '', ...EMPTY_ARCHIVE_FIELDS,
  });
}
