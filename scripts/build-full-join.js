// Builds data/full-join.json -- the single file the dashboard (index.html)
// loads to render both the table and the map. It's a full outer join,
// computed once at build time, between the Wikidata protected area list and
// the MoEF ESZ notification records, keyed by wikidataId (falling back to
// state+name for MoEF records that couldn't be matched to a Wikidata item).
//
// Each entry is one protected area with its notification history nested,
// plus every Wikidata field the map/popups need and a precomputed
// "representative" notification (same logic as build-geojson.js) so the
// client never has to cross-reference three separate payloads to render.

import { readFile, writeFile } from 'node:fs/promises';
import { loadCache } from './lib/enrichment-cache.js';

function pickLatest(notifications, status) {
  const relevant = notifications.filter((n) => n.notificationStatus === status);
  return relevant.sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''))[0] || null;
}

// Same composite key enrich-allmaps.js keys "allmaps editor" (the Allmaps
// georeferencing-editor link) by -- a multi-park notification is one gazette
// PDF but each park's toposheet/annexure can sit on a different page, so the
// georeferencing link is per (orderNumber, notificationDate, protectedAreaName),
// not per notification alone.
function findGeoreferencingLink(cache, orderNumber, notificationDate, protectedAreaName) {
  const row = cache.find((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate
    && r.protectedAreaName === protectedAreaName);
  return row?.['allmaps editor'] || null;
}

// Fallback for when a scan hasn't been georeferenced yet (no "allmaps
// editor" link): the plain Allmaps image viewer for the matched archive.org
// scan, so a user can at least locate the boundary map page and georeference
// it themselves.
function findAllmapsImagesLink(cache, orderNumber, notificationDate, protectedAreaName) {
  const row = cache.find((r) => r.orderNumber === orderNumber && r.notificationDate === notificationDate
    && r.protectedAreaName === protectedAreaName);
  return row?.['allmaps images'] || null;
}

async function main() {
  const wikidataPAs = JSON.parse(await readFile('data/wikidata/protected-areas.json', 'utf8'));
  const moefRecords = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  const enrichmentCache = await loadCache('data/enrichment-cache.csv');

  const notificationsByWikidataId = new Map();
  const unmatchedByKey = new Map();

  for (const r of moefRecords) {
    const notification = {
      moefSNo: r.moefSNo,
      protectedAreaName: r.protectedAreaName,
      protectedAreaType: r.protectedAreaType,
      state: r.state,
      notificationStatus: r.notificationStatus,
      notificationDate: r.notificationDate,
      orderNumber: r.orderNumber,
      notificationPdfLink: r.notificationPdfLink,
      notificationArchiveLink: r.notificationArchiveLink,
      georeferencingLink: findGeoreferencingLink(enrichmentCache, r.orderNumber, r.notificationDate, r.protectedAreaName),
      allmapsImagesLink: findAllmapsImagesLink(enrichmentCache, r.orderNumber, r.notificationDate, r.protectedAreaName),
    };
    if (r.wikidataId) {
      const list = notificationsByWikidataId.get(r.wikidataId) || [];
      list.push(notification);
      notificationsByWikidataId.set(r.wikidataId, list);
    } else {
      const key = `${r.state}::${r.protectedAreaName}`;
      const entry = unmatchedByKey.get(key) || {
        paKey: key,
        wikidataId: null,
        name: r.protectedAreaName,
        protectedAreaType: r.protectedAreaType,
        state: [r.state].filter(Boolean),
        wikidataUrl: null,
        iucnCategory: null,
        area: null,
        pageBanner: null,
        image: null,
        enwikiUrl: null,
        osmRelationIds: [],
        coordinateLatitude: null,
        coordinateLongitude: null,
        notifications: [],
      };
      entry.notifications.push(notification);
      unmatchedByKey.set(key, entry);
    }
  }

  function summarize(notifications) {
    const hasFinal = notifications.some((n) => n.notificationStatus === 'Final');
    const hasDraft = notifications.some((n) => n.notificationStatus === 'Draft');
    const eszStatus = hasFinal ? 'final' : hasDraft ? 'draft' : 'none';
    const latestRecord = hasFinal ? pickLatest(notifications, 'Final') : hasDraft ? pickLatest(notifications, 'Draft') : null;
    const latest = latestRecord && {
      status: latestRecord.notificationStatus,
      date: latestRecord.notificationDate,
      orderNumber: latestRecord.orderNumber,
      pdfLink: latestRecord.notificationPdfLink,
      archiveLink: latestRecord.notificationArchiveLink,
    };
    return { hasFinal, hasDraft, eszStatus, latest };
  }

  const entries = [];

  for (const pa of wikidataPAs) {
    const notifications = notificationsByWikidataId.get(pa.wikidataId) || [];
    entries.push({
      paKey: pa.wikidataId,
      wikidataId: pa.wikidataId,
      name: pa.wikidataLabel,
      protectedAreaType: pa.protectedAreaType,
      state: pa.state || [],
      wikidataUrl: pa.wikidataUrl,
      iucnCategory: pa.iucnCategory || null,
      area: pa.area || null,
      pageBanner: pa.pageBanner || null,
      image: pa.image || null,
      enwikiUrl: pa.enwikiUrl || null,
      osmRelationIds: pa.osmRelationIds || [],
      coordinateLatitude: pa.coordinateLatitude ?? null,
      coordinateLongitude: pa.coordinateLongitude ?? null,
      ...summarize(notifications),
      notifications,
    });
  }

  for (const entry of unmatchedByKey.values()) {
    entry.notifications.sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''));
    Object.assign(entry, summarize(entry.notifications));
    entries.push(entry);
  }

  await writeFile('data/full-join.json', JSON.stringify(entries), 'utf8');

  const withCoords = entries.filter((e) => e.coordinateLatitude != null).length;
  const byStatus = { final: 0, draft: 0, none: 0 };
  for (const e of entries) byStatus[e.eszStatus] += 1;
  console.log(`Wrote ${entries.length} protected areas to data/full-join.json (${withCoords} with coordinates, ${entries.length - wikidataPAs.length} unmatched-to-Wikidata).`);
  console.log('By ESZ status:', byStatus);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
