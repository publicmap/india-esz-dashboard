// Adds Allmaps IIIF georeferencing links to data/enrichment-cache.csv for
// every row with a matched archive.org gazette scan: 'allmaps images' (the
// whole scan), and, when a specific toposheet/annexure page is known,
// 'toposheet page', 'toposheet thumbnail', 'allmaps editor' and 'tms'.
// See prompt.md "Allmaps IIIF URLs" and scripts/lib/allmaps.js.
//
// A page is known either from a manually-entered 'toposheet page' cache
// value (kept as-is -- it's a human correction) or parsed off a
// `/page/nNN/` archiveLink (e.g. from pasting an archive.org book-reader
// URL open to the right page). The manual value always wins when the two
// disagree.
import { loadCache, saveCache, setAllmapsFields } from './lib/enrichment-cache.js';
import {
  buildImagesUrl, buildEditorUrl, buildThumbnailUrl, buildTmsUrl,
  extractPageFromArchiveLink, extractIdentifierFromArchiveLink, findImageServiceIdForPage,
} from './lib/allmaps.js';

const CACHE_PATH = 'data/enrichment-cache.csv';
const CONCURRENCY = 6;
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';

async function runWithConcurrency(items, worker, concurrency) {
  let next = 0;
  async function runNext() {
    while (next < items.length) {
      const i = next;
      next += 1;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runNext));
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

async function main() {
  const cache = await loadCache(CACHE_PATH);
  const manifestCache = new Map(); // identifier -> in-flight/resolved manifest.json

  let withImages = 0;
  let withPage = 0;
  let manifestFailures = 0;
  let pageNotFound = 0;

  await runWithConcurrency(cache, async (row) => {
    const identifier = row.archiveIdentifier || extractIdentifierFromArchiveLink(row.archiveLink);
    if (!identifier) {
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, {});
      return;
    }

    const allmapsImages = buildImagesUrl(identifier);
    withImages += 1;

    const manualPage = (row['toposheet page'] || '').trim();
    const urlPage = extractPageFromArchiveLink(row.archiveLink);
    const page = manualPage || urlPage;

    if (!page) {
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, { allmapsImages });
      return;
    }

    let manifest;
    try {
      manifest = await fetchManifest(identifier, manifestCache);
    } catch (err) {
      manifestFailures += 1;
      console.error(`Manifest fetch failed for ${identifier}: ${err.message}`);
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, { allmapsImages, toposheetPage: page });
      return;
    }

    const imageServiceId = findImageServiceIdForPage(manifest, page);
    if (!imageServiceId) {
      pageNotFound += 1;
      console.error(`No canvas found for ${identifier} page ${page}`);
      setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, { allmapsImages, toposheetPage: page });
      return;
    }

    withPage += 1;
    setAllmapsFields(cache, row.orderNumber, row.notificationDate, row.protectedAreaName, {
      allmapsImages,
      toposheetPage: page,
      toposheetThumbnail: buildThumbnailUrl(imageServiceId),
      allmapsEditor: buildEditorUrl(identifier, imageServiceId),
      tms: buildTmsUrl(imageServiceId),
    });
  }, CONCURRENCY);

  await saveCache(CACHE_PATH, cache);

  console.log(`allmaps images URL set for ${withImages} rows.`);
  console.log(`toposheet page resolved for ${withPage} rows (${manifestFailures} manifest fetch failures, ${pageNotFound} page-not-found).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
