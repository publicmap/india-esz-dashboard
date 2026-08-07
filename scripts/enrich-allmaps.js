// Adds Allmaps IIIF georeferencing links to data/enrichment-cache.csv for
// every row with a matched archive.org gazette scan: 'allmaps images' (the
// whole scan), and, when a specific toposheet/annexure page is known,
// 'toposheet page', 'toposheet thumbnail', 'allmaps editor', 'tms',
// 'allmaps annotation' and 'georeferencing timestamp'.
// See prompt.md "Allmaps IIIF URLs" and scripts/lib/allmaps.js.
//
// A page is known from, in priority order: a manually-entered 'toposheet
// page' cache value (kept as-is -- it's a human correction), a `/page/nNN/`
// archiveLink (e.g. from pasting an archive.org book-reader URL open to the
// right page), or -- new -- auto-discovery: every canvas in the scan's IIIF
// manifest is checked against the Allmaps Annotations API
// (https://annotations.allmaps.org/images/<id>, keyed by the same
// sha1-prefix id scripts/lib/allmaps.js already computes locally), and if
// exactly one canvas comes back georeferenced, that's used as the page.
//
// If a scan has *more than one* georeferenced canvas, we don't guess which
// one belongs to which park row in a multi-park notification -- that's
// noted in 'allmaps remarks' for a human to resolve instead of silently
// picking one.
//
// 'allmaps annotation' doubles as the per-row "already processed" marker
// (empty = not yet checked, 'NONE' = checked, no match for this row's page,
// a URL = found) so repeat runs (this script runs on every `npm run
// update`) don't re-scan a scan's full page count again -- an Allmaps-side
// georeferencing added after a row was marked 'NONE' won't be picked up
// until that row is cleared by hand, the same tradeoff the archive.org
// enrichment cache already makes for its own NONE rows.
import { loadCache, saveCache, setAllmapsFields } from './lib/enrichment-cache.js';
import {
  buildImagesUrl, buildEditorUrl, buildThumbnailUrl, buildTmsUrl, buildAnnotationUrl, generateAllmapsId,
  extractPageFromArchiveLink, extractIdentifierFromArchiveLink, findImageServiceIdForPage, listCanvases,
} from './lib/allmaps.js';
import { diffByKey, logDiff } from './lib/diff-log.js';

const CACHE_PATH = 'data/enrichment-cache.csv';
const CONCURRENCY = 6;
const CANVAS_CHECK_CONCURRENCY = 20;
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';

function rowKey(r) {
  return `${r.orderNumber}|${r.notificationDate}|${r.protectedAreaName}`;
}

function describeRow(r) {
  const link = r['allmaps editor'] || r['toposheet thumbnail'] || r['allmaps images'] || r.archiveLink || 'no link';
  return `${r.protectedAreaName || '(no PA name)'} -- ${link}`;
}

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

async function fetchManifest(identifier, manifestCache) {
  if (manifestCache.has(identifier)) return manifestCache.get(identifier);
  const promise = (async () => {
    const res = await fetch(`https://iiif.archive.org/iiif/${identifier}/manifest.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })();
  manifestCache.set(identifier, promise);
  return promise;
}

// A 404 means this exact IIIF image has no georeferencing annotation; any
// other non-OK response is a real error, not "not found".
async function fetchAnnotationStatus(allmapsId) {
  const res = await fetch(buildAnnotationUrl(allmapsId), { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const item = json?.items?.[0];
  if (!item) return null;
  return { modified: item.modified || item.created || '' };
}

// Scans every canvas in a manifest and returns the ones Allmaps has a
// georeferencing annotation for, memoized per identifier so rows sharing a
// multi-park notification's single gazette scan only pay for this once.
function makeGeoreferenceDiscoverer() {
  const discoveryCache = new Map(); // identifier -> in-flight/resolved Promise<results>
  return function discoverGeoreferencedPages(identifier, manifest) {
    if (discoveryCache.has(identifier)) return discoveryCache.get(identifier);
    const promise = (async () => {
      const canvases = listCanvases(manifest).filter((c) => c.imageServiceId);
      const found = [];
      await runWithConcurrency(canvases, async (canvas) => {
        const allmapsId = generateAllmapsId(canvas.imageServiceId);
        let status;
        try {
          status = await fetchAnnotationStatus(allmapsId);
        } catch {
          return; // treat a lookup failure as "not found", not fatal
        }
        if (status) found.push({ label: canvas.label, allmapsId, modified: status.modified });
      }, CANVAS_CHECK_CONCURRENCY);
      found.sort((a, b) => Number(a.label) - Number(b.label));
      return found;
    })();
    discoveryCache.set(identifier, promise);
    return promise;
  };
}

async function main() {
  const cache = await loadCache(CACHE_PATH);
  const previousCache = cache.map((r) => ({ ...r }));
  const manifestCache = new Map(); // identifier -> in-flight/resolved manifest.json
  const discoverGeoreferencedPages = makeGeoreferenceDiscoverer();

  let withImages = 0;
  let withPage = 0;
  let matched = 0;
  let ambiguous = 0;
  let skipped = 0;
  let manifestFailures = 0;
  let pageNotFound = 0;

  await runWithConcurrency(cache, async (row) => {
    const identifier = row.archiveIdentifier || extractIdentifierFromArchiveLink(row.archiveLink);
    if (!identifier) {
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, {});
      return;
    }

    if ((row['allmaps annotation'] || '').trim()) {
      skipped += 1;
      return; // already checked by a previous run -- leave its fields as-is
    }

    const allmapsImages = buildImagesUrl(identifier);
    withImages += 1;

    const manualPage = (row['toposheet page'] || '').trim();
    const urlPage = extractPageFromArchiveLink(row.archiveLink);

    let manifest;
    try {
      manifest = await fetchManifest(identifier, manifestCache);
    } catch (err) {
      manifestFailures += 1;
      console.error(`Manifest fetch failed for ${identifier}: ${err.message}`);
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, { allmapsImages, toposheetPage: manualPage || urlPage || '' });
      return;
    }

    const georeferenced = await discoverGeoreferencedPages(identifier, manifest);
    const page = manualPage || urlPage || (georeferenced.length === 1 ? georeferenced[0].label : '');

    if (!page) {
      const remarks = georeferenced.length > 1
        ? `${georeferenced.length} pages georeferenced (labels: ${georeferenced.map((g) => g.label).join(', ')}) -- pick one manually`
        : '';
      if (remarks) ambiguous += 1;
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, {
        allmapsImages, allmapsAnnotation: 'NONE', allmapsRemarks: remarks,
      });
      return;
    }

    const imageServiceId = findImageServiceIdForPage(manifest, page);
    if (!imageServiceId) {
      pageNotFound += 1;
      console.error(`No canvas found for ${identifier} page ${page}`);
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, { allmapsImages, toposheetPage: page, allmapsAnnotation: 'NONE' });
      return;
    }

    const match = georeferenced.find((g) => g.label === String(page));
    const otherPages = georeferenced.filter((g) => g.label !== String(page));
    const remarks = otherPages.length > 0
      ? `${otherPages.length} additional page(s) georeferenced (labels: ${otherPages.map((g) => g.label).join(', ')})`
      : '';
    if (match) matched += 1;
    if (remarks) ambiguous += 1;

    withPage += 1;
    setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, {
      allmapsImages,
      toposheetPage: page,
      toposheetThumbnail: buildThumbnailUrl(imageServiceId),
      allmapsEditor: buildEditorUrl(identifier, imageServiceId),
      tms: buildTmsUrl(imageServiceId),
      allmapsAnnotation: match ? buildAnnotationUrl(match.allmapsId) : 'NONE',
      georeferencingTimestamp: match ? match.modified : '',
      allmapsRemarks: remarks,
    });
  }, CONCURRENCY);

  const diff = diffByKey(previousCache, cache, rowKey);

  await saveCache(CACHE_PATH, cache);

  console.log(`allmaps images URL set for ${withImages} rows (${skipped} rows already checked, skipped).`);
  console.log(`toposheet page resolved for ${withPage} rows (${manifestFailures} manifest fetch failures, ${pageNotFound} page-not-found).`);
  console.log(`georeferencing annotation matched for ${matched} rows; ${ambiguous} rows flagged with multiple georeferenced pages for manual review.`);
  logDiff('Allmaps cache rows', diff, describeRow);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
