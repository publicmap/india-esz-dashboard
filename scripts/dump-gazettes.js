// Manual dump step (not part of `npm run update`): saves the OCR text and the
// embedded map images for every gazette that enrich-archive-org.js matched.
//
// Per gazette, into .cache/gazettes/<id>/ (gitignored):
//   details.html, ocr.txt   egazette.servantsofknowledge.in/details/<id>/ (the OCR transcript)
//   meta.json               title, date, ministry, gazette id, source links from that page
//   images/<name>.png       full-size images embedded in the PDF, at least MIN_MAP_PX on
//                           each side (what /details/<id>/pymupdf/ shows), taken from the
//                           Servants of Knowledge IIIF manifest
// Files already on disk are skipped unless --refresh is given.
//
// Usage: node scripts/dump-gazettes.js [--limit N] [--ids id1,id2] [--refresh] [--no-images] [--no-text]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import {
  CACHE_DIR, MIN_MAP_PX, archiveUrl, cachedJson, canvasImage, detailsUrl, exists, get,
  matchedGazettes, runPool, sokManifestUrl,
} from './lib/gazettes.js';

const CONCURRENCY = 4;

function parseDumpArgs(argv) {
  const args = { limit: Infinity, ids: [], refresh: false, text: true, images: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--ids') args.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--no-images') args.images = false;
    else if (a === '--no-text') args.text = false;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

function ocrText($) {
  const main = $('main').clone();
  main.find('script, style, .doc-header, nav').remove();
  main.find('br').replaceWith('\n');
  main.find('p, div, tr, li, h1, h2, h3, h4, h5, h6').each((_, el) => { $(el).append('\n'); });
  return main.text().split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => !/^(Gazette text|Alternate rendering|click here for IIIF manifest)$/i.test(l))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function detailsMeta($, id) {
  const meta = { id, title: $('h1.doc-title').text().trim(), published: $('.doc-subtitle').text().replace(/^Published\s*/, '').trim() };
  $('dl.doc-meta dt').each((_, dt) => {
    const key = $(dt).text().trim().toLowerCase().replace(/\s+/g, '_');
    meta[key] = $(dt).next('dd').text().replace(/\s+/g, ' ').trim();
  });
  delete meta.published_at;
  meta.sourcePdf = $('a[href*="egazette.gov.in"]').attr('href') || null;
  meta.sokManifest = $('a[href*="/manifest.json"]').attr('href') || null;
  meta.details = detailsUrl(id);
  meta.archive = archiveUrl(id);
  return meta;
}

async function dumpText(id, dir, refresh) {
  const file = path.join(dir, 'details.html');
  let html;
  if (!refresh && await exists(file)) html = await readFile(file, 'utf8');
  else {
    html = await get(detailsUrl(id), { allow404: true }) ?? '';
    await writeFile(file, html);
  }
  if (!html) return false;
  const $ = cheerio.load(html);
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify(detailsMeta($, id), null, 2));
  await writeFile(path.join(dir, 'ocr.txt'), ocrText($));
  return true;
}

async function dumpImages(id, dir, refresh) {
  const url = sokManifestUrl(id);
  // Shares the manifest cache with fetch-gazette-iiif.js.
  const manifest = url ? await cachedJson(path.join(dir, 'sok-manifest.json'), url, refresh) : null;
  let saved = 0;
  for (const canvas of manifest?.items ?? []) {
    if (Math.min(canvas.width, canvas.height) < MIN_MAP_PX) continue;
    const { body, serviceId } = canvasImage(canvas);
    if (!body?.id || !serviceId) continue;
    const file = path.join(dir, 'images', `${serviceId.split('/').pop()}.png`);
    if (!refresh && await exists(file)) { saved += 1; continue; }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await get(body.id, { as: 'buffer' }));
    saved += 1;
  }
  return saved;
}

async function main() {
  const opts = parseDumpArgs(process.argv.slice(2));
  const matched = await matchedGazettes();
  const ids = [...new Set([...opts.ids, ...matched.keys()])].slice(0, opts.limit);
  console.log(`${matched.size} matched gazettes; dumping ${ids.length}.`);

  let texts = 0; let images = 0; let failed = 0;
  await runPool(ids, async (id) => {
    const dir = path.join(CACHE_DIR, id);
    await mkdir(dir, { recursive: true });
    try {
      if (opts.text && await dumpText(id, dir, opts.refresh)) texts += 1;
      if (opts.images) images += await dumpImages(id, dir, opts.refresh);
    } catch (err) {
      failed += 1;
      console.error(`${id}: ${err.message}`);
    }
  }, CONCURRENCY);
  console.log(`Text for ${texts} gazettes, ${images} images, ${failed} failed. Saved under ${CACHE_DIR}/.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
