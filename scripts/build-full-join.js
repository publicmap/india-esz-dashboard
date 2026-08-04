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
//
// Also builds data/iiif-manifest.json -- a single IIIF Presentation API 3.0
// Manifest (https://iiif.io/api/presentation/3.0/) composed of every
// toposheet/annexure boundary map we've pinned down to a specific page (i.e.
// every notification with a resolved "allmaps editor" link in
// enrichment-cache.csv -- see scripts/enrich-allmaps.js), one Canvas per map,
// so the whole collection can be browsed/georeferenced as a single item in
// the Allmaps editor (like https://editor.allmaps.org/images?url=<manifest>)
// instead of jumping between one per-notification archive.org manifest at a
// time. Canvas width/height requires a live info.json lookup per image --
// the set is small (a couple dozen resolved pages today) so this is done
// inline at build time rather than added to the enrichment cache.

import { readFile, writeFile } from 'node:fs/promises';
import { loadCache } from './lib/enrichment-cache.js';
import { buildThumbnailUrl } from './lib/allmaps.js';

const DASHBOARD_URL = 'https://publicmap.github.io/india-esz-dashboard/';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/publicmap/india-esz-dashboard/main';
const MANIFEST_URL = `${DASHBOARD_URL}data/iiif-manifest.json`;
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const FETCH_CONCURRENCY = 6;

async function runWithConcurrency(items, worker, concurrency) {
  let next = 0;
  async function runNext() {
    while (next < items.length) {
      const i = next;
      next += 1;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
}

// The `image=` query param on an "allmaps editor" URL (see buildEditorUrl in
// lib/allmaps.js) is the IIIF Image API service @id for that exact canvas --
// URLSearchParams hands it back already percent-decoded.
function imageServiceIdFromEditorLink(georeferencingLink) {
  return new URL(georeferencingLink).searchParams.get('image');
}

async function fetchImageDimensions(imageServiceId) {
  const res = await fetch(`${imageServiceId}/info.json`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const info = await res.json();
  return { width: info.width, height: info.height };
}

function metadataEntry(label, value) {
  return { label: { en: [label] }, value: { en: [value] } };
}

function link(href, text = href) {
  return `<a href="${href}">${text}</a>`;
}

async function buildIiifManifest(entries) {
  // A single boundary map page can end up attached to more than one
  // `notification` record when a gazette lists the same protected area under
  // several name aliases (e.g. "Valmiki Wildlife Sanctuary" / "... National
  // Park" / "... Tiger Reserve" all resolved to the same Wikidata item and
  // the same page) -- dedupe on the underlying image so it gets one canvas.
  const seenImages = new Set();
  const candidates = [];
  for (const entry of entries) {
    for (const notification of entry.notifications) {
      if (!notification.georeferencingLink) continue;
      const imageServiceId = imageServiceIdFromEditorLink(notification.georeferencingLink);
      if (seenImages.has(imageServiceId)) continue;
      seenImages.add(imageServiceId);
      candidates.push({ entry, notification, imageServiceId });
    }
  }

  const canvases = [];
  let failures = 0;

  await runWithConcurrency(candidates, async ({ entry, notification, imageServiceId }, i) => {
    let dimensions;
    try {
      dimensions = await fetchImageDimensions(imageServiceId);
    } catch (err) {
      failures += 1;
      console.error(`iiif-manifest: info.json fetch failed for ${imageServiceId}: ${err.message}`);
      return;
    }

    const canvasId = `${MANIFEST_URL}/canvas/${i}`;
    const { width, height } = dimensions;

    canvases[i] = {
      id: canvasId,
      type: 'Canvas',
      label: { en: [`${entry.name} (${notification.notificationDate})`] },
      width,
      height,
      metadata: [
        metadataEntry('Protected Area', entry.name),
        metadataEntry('State', (entry.state || []).join(', ') || 'Unknown'),
        entry.protectedAreaType && metadataEntry('Protected Area Type', entry.protectedAreaType),
        metadataEntry('ESZ Notification', [notification.orderNumber, notification.notificationStatus, notification.notificationDate].filter(Boolean).join(' · ')),
        entry.wikidataUrl && metadataEntry('Wikidata', link(entry.wikidataUrl)),
        entry.enwikiUrl && metadataEntry('Wikipedia', link(entry.enwikiUrl)),
        notification.notificationArchiveLink && metadataEntry('Gazette scan (archive.org)', link(notification.notificationArchiveLink)),
        notification.notificationPdfLink && metadataEntry('Gazette PDF (egazette.nic.in)', link(notification.notificationPdfLink)),
        metadataEntry('Explore on India ESZ Dashboard', link(DASHBOARD_URL)),
      ].filter(Boolean),
      thumbnail: [{ id: buildThumbnailUrl(imageServiceId), type: 'Image', format: 'image/jpeg' }],
      rendering: [{ id: notification.georeferencingLink, type: 'Text', label: { en: ['Open in Allmaps editor'] }, format: 'text/html' }],
      items: [{
        id: `${canvasId}/page`,
        type: 'AnnotationPage',
        items: [{
          id: `${canvasId}/page/annotation`,
          type: 'Annotation',
          motivation: 'painting',
          target: canvasId,
          body: {
            id: `${imageServiceId}/full/max/0/default.jpg`,
            type: 'Image',
            format: 'image/jpeg',
            width,
            height,
            service: [{ id: imageServiceId, type: 'ImageService3', profile: 'level2' }],
          },
        }],
      }],
    };
  }, FETCH_CONCURRENCY);

  const items = canvases.filter(Boolean);

  const manifest = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: MANIFEST_URL,
    type: 'Manifest',
    label: { en: ['India Eco-Sensitive Zone (ESZ) Notification Toposheet Maps'] },
    summary: {
      en: [
        'Georeferenced boundary/annexure toposheet maps for Indian protected areas, extracted from Gazette of India Eco-Sensitive Zone (ESZ) notifications and compiled by the India ESZ Dashboard project. Each canvas is one protected area’s boundary map, pinpointed to its exact page within the notification’s scanned Gazette of India entry on archive.org.',
      ],
    },
    metadata: [
      metadataEntry('Project', `${link(DASHBOARD_URL, 'India ESZ Dashboard')} – explore Eco-Sensitive Zone notification status for every protected area in India`),
      metadataEntry('Source', `Gazette of India notifications, Ministry of Environment, Forest and Climate Change (MoEFCC), digitized on ${link('https://archive.org')}`),
      metadataEntry('Georeferencing', link('https://allmaps.org', 'Allmaps')),
      metadataEntry('Maps in this manifest', String(items.length)),
    ],
    requiredStatement: {
      label: { en: ['Attribution'] },
      value: { en: [`Compiled by the ${link(DASHBOARD_URL, 'India ESZ Dashboard')} project from Gazette of India notifications digitized by archive.org. Georeferenced with ${link('https://allmaps.org', 'Allmaps')}.`] },
    },
    homepage: [{
      id: DASHBOARD_URL, type: 'Text', label: { en: ['India ESZ Dashboard – explore'] }, format: 'text/html',
    }],
    provider: [{
      id: 'https://github.com/publicmap/india-esz-dashboard',
      type: 'Agent',
      label: { en: ['India ESZ Dashboard'] },
      homepage: [{
        id: DASHBOARD_URL, type: 'Text', label: { en: ['India ESZ Dashboard'] }, format: 'text/html',
      }],
    }],
    seeAlso: [{
      id: `${GITHUB_RAW_BASE}/data/full-join.json`, type: 'Dataset', format: 'application/json', label: { en: ['Underlying structured dataset (full-join.json)'] },
    }],
    items,
  };

  return { manifest, failures };
}

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

  const { manifest, failures } = await buildIiifManifest(entries);
  await writeFile('data/iiif-manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${manifest.items.length} canvases to data/iiif-manifest.json${failures ? ` (${failures} info.json lookups failed and were skipped)` : ''}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
