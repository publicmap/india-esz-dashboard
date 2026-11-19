// Downloads the Servants of Knowledge copy of every gazette that
// enrich-archive-org.js matched (notificationArchiveLink in
// data/moef/esz-notifications.json), then compiles a IIIF Collection of per-gazette
// manifests of the map images in those gazettes, with Allmaps georeferencing
// embedded.
//
// Per gazette, into .cache/gazettes/<id>/ (gitignored):
//   details.html, ocr.txt   egazette.servantsofknowledge.in/details/<id>/ (the OCR transcript)
//   meta.json               title, date, ministry, gazette id, source links
//   sok-manifest.json       gazettes.servantsofknowledge.in/.../manifest.json: one canvas
//                           per image embedded in the PDF (what /details/<id>/pymupdf/ shows)
//   archive-manifest.json   iiif.archive.org/iiif/<id>/manifest.json: one canvas per scanned page
//   allmaps-sok.json, allmaps-archive.json
//                           api.allmaps.org/manifests/<sha1(manifest url)[:16]>/maps
//   images/<name>.png       full-size copies of the embedded images
//
// Compiled output (IIIF Presentation 3):
//   data/gazette-maps/collection.json        a Collection with one Manifest per gazette
//   data/gazette-maps/manifests/<id>.json    that gazette's manifest: one canvas per map
//                                            image, linked (partOf) to the source manifest
// The source manifests can't carry our annotations, hence the per-gazette ones.
// Each canvas carries its Allmaps georeference annotation, if there is one, so
// Allmaps Viewer can lay the georeferenced maps over a basemap. The map
// candidates are:
//   - images embedded in the PDF, at least MIN_MAP_PX on each side (drops
//     logos and signatures);
//   - scanned archive.org pages, only once someone has georeferenced them in
//     Allmaps. A whole-page scan is otherwise indistinguishable from text pages.
//
// Usage:
//   node scripts/fetch-gazette-iiif.js [--limit N] [--ids id1,id2] [--no-images] [--refresh]
// --ids are taken first, then the newest matched gazettes until --limit is reached.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { generateAllmapsId, manifestUrl as archiveManifestUrl } from './lib/allmaps.js';

const CACHE_DIR = '.cache/gazettes';
const OUT_DIR = 'data/gazette-maps';
const PUBLIC_BASE = 'https://publicmap.github.io/india-esz-dashboard/data/gazette-maps';
const COLLECTION_ID = `${PUBLIC_BASE}/collection.json`;
const manifestId = (id) => `${PUBLIC_BASE}/manifests/${id}.json`;
const DETAILS = (id) => `https://egazette.servantsofknowledge.in/details/${id}/`;
const MIN_MAP_PX = 400;
const CONCURRENCY = 4;
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';

function parseArgs(argv) {
  const args = { limit: Infinity, ids: [], images: true, refresh: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--ids') args.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--no-images') args.images = false;
    else if (a === '--refresh') args.refresh = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

const exists = (p) => access(p).then(() => true, () => false);

async function get(url, { as = 'text', allow404 = false, tries = 3 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 404 && allow404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      if (as === 'json') return await res.json();
      if (as === 'buffer') return Buffer.from(await res.arrayBuffer());
      return await res.text();
    } catch (err) {
      if (attempt >= tries || /HTTP 4\d\d/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// Fetches url into file once; later runs read the cached copy unless --refresh.
// A cached "null" records a 404 so it isn't re-requested.
async function cachedJson(file, url, refresh) {
  if (!refresh && await exists(file)) return JSON.parse(await readFile(file, 'utf8'));
  const data = await get(url, { as: 'json', allow404: true });
  await writeFile(file, JSON.stringify(data, null, 2));
  return data;
}

function ocrText($) {
  const main = $('main').clone();
  main.find('script, style, .doc-header, nav').remove();
  main.find('br').replaceWith('\n');
  main.find('p, div, tr, li, h1, h2, h3, h4, h5, h6').each((_, el) => { $(el).append('\n'); });
  return main.text().split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => !/^(Gazette text|Alternate rendering|click here for IIIF manifest)$/i.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function detailsMeta($, id) {
  const meta = { id, title: $('h1.doc-title').text().trim(), published: $('.doc-subtitle').text().replace(/^Published\s*/, '').trim() };
  $('dl.doc-meta dt').each((_, dt) => {
    const key = $(dt).text().trim().toLowerCase().replace(/\s+/g, '_');
    meta[key] = $(dt).next('dd').text().replace(/\s+/g, ' ').trim();
  });
  meta.sokManifest = $('a[href*="/manifest.json"]').attr('href') || null;
  delete meta.published_at;
  meta.sourcePdf = $('a[href*="egazette.gov.in"]').attr('href') || null;
  meta.archive = `https://archive.org/details/${id}`;
  meta.details = DETAILS(id);
  return meta;
}

const label = (l) => (l?.none ?? l?.en ?? Object.values(l ?? {})[0] ?? [])[0] ?? '';

function canvasImage(canvas) {
  const body = canvas?.items?.[0]?.items?.[0]?.body;
  const service = [].concat(body?.service ?? [])[0];
  return { body, serviceId: service?.id ?? service?.['@id'] ?? null };
}

async function fetchGazette(id, opts) {
  const dir = path.join(CACHE_DIR, id);
  await mkdir(path.join(dir, 'images'), { recursive: true });

  let html;
  const detailsFile = path.join(dir, 'details.html');
  if (!opts.refresh && await exists(detailsFile)) html = await readFile(detailsFile, 'utf8');
  else {
    html = await get(DETAILS(id), { allow404: true }) ?? '';
    await writeFile(detailsFile, html);
  }
  const $ = cheerio.load(html);
  const meta = html ? detailsMeta($, id) : { id, archive: `https://archive.org/details/${id}`, details: DETAILS(id), sokManifest: null };
  meta.archiveManifest = archiveManifestUrl(id);
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  if (html) await writeFile(path.join(dir, 'ocr.txt'), ocrText($));

  const sok = meta.sokManifest ? await cachedJson(path.join(dir, 'sok-manifest.json'), meta.sokManifest, opts.refresh) : null;
  const archive = await cachedJson(path.join(dir, 'archive-manifest.json'), meta.archiveManifest, opts.refresh);

  // Allmaps keys a manifest by the first 16 hex chars of sha1(manifest URL).
  const allmaps = {};
  for (const [key, url] of [['sok', meta.sokManifest], ['archive', meta.archiveManifest]]) {
    if (!url) continue;
    const allmapsId = generateAllmapsId(url);
    allmaps[key] = {
      allmapsId,
      maps: await cachedJson(path.join(dir, `allmaps-${key}.json`), `https://api.allmaps.org/manifests/${allmapsId}/maps`, opts.refresh),
      annotations: await cachedJson(path.join(dir, `allmaps-${key}-annotations.json`), `https://annotations.allmaps.org/manifests/${allmapsId}`, opts.refresh),
    };
  }

  // Embedded PDF images: keep the ones big enough to be maps.
  const images = [];
  for (const canvas of sok?.items ?? []) {
    if (Math.min(canvas.width, canvas.height) < MIN_MAP_PX) continue;
    const { body, serviceId } = canvasImage(canvas);
    if (!serviceId) continue;
    const name = serviceId.split('/').pop();
    const file = path.join(dir, 'images', `${name}.png`);
    if (opts.images && (opts.refresh || !await exists(file))) {
      await writeFile(file, await get(body.id, { as: 'buffer' }));
    }
    images.push({ source: 'sok', canvas, serviceId, page: label(canvas.label).replace(/^Page\s*/i, ''), file: opts.images ? file : null });
  }

  // Annotations can also be saved against a single image without its manifest
  // (Allmaps editor's "open image" route), so look embedded images up by
  // image id too.
  const byImage = new Map();
  for (const key of Object.keys(allmaps)) {
    for (const ann of allmaps[key].annotations?.items ?? []) byImage.set(ann.target?.source?.id, ann);
  }
  for (const img of images) {
    if (byImage.has(img.serviceId)) continue;
    const ann = await get(`https://annotations.allmaps.org/images/${generateAllmapsId(img.serviceId)}`, { as: 'json', allow404: true });
    const item = ann?.items?.[0] ?? (ann?.type === 'Annotation' ? ann : null);
    if (item) byImage.set(img.serviceId, item);
  }

  // Scanned pages count only once they're georeferenced.
  const pages = [];
  for (const canvas of archive?.items ?? []) {
    const { serviceId } = canvasImage(canvas);
    if (serviceId && byImage.has(serviceId)) pages.push({ source: 'archive', canvas, serviceId, page: label(canvas.label), file: null });
  }

  const maps = [...images, ...pages].map((m) => ({ ...m, georeference: byImage.get(m.serviceId) ?? null }));
  return { id, meta, maps, counts: { sokCanvases: sok?.items?.length ?? 0, archivePages: archive?.items?.length ?? 0 } };
}

function langMap(s) { return { en: [s] }; }

function buildCanvas(gazette, map, index) {
  const { meta } = gazette;
  const base = `${manifestId(gazette.id).replace(/\.json$/, '')}/${map.source}-${map.page}-${index}`;
  const { body } = canvasImage(map.canvas);
  const canvasId = `${base}/canvas`;
  const pageNum = map.source === 'archive' ? Number(map.page) + 1 : map.page;
  const canvas = {
    id: canvasId,
    type: 'Canvas',
    label: langMap(`Page ${pageNum}${map.source === 'sok' ? ' (image in PDF)' : ' (page scan)'}`),
    width: map.canvas.width,
    height: map.canvas.height,
    metadata: [
      ['Page', String(pageNum)],
      ['Image source', map.source === 'sok' ? 'Image embedded in the gazette PDF (Servants of Knowledge)' : 'Page scan (archive.org)'],
      ['Georeferenced', map.georeference ? `<a href="${map.georeference.id}">Allmaps</a>` : 'No'],
    ].filter(([, v]) => v).map(([k, v]) => ({ label: langMap(k), value: langMap(v) })),
    thumbnail: [{ id: `${map.serviceId}/full/${map.source === 'sok' ? 'max' : '400,'}/0/default.${map.source === 'sok' ? 'png' : 'jpg'}`, type: 'Image', format: map.source === 'sok' ? 'image/png' : 'image/jpeg' }],
    partOf: [{ id: map.source === 'sok' ? meta.sokManifest : meta.archiveManifest, type: 'Manifest' }],
    items: [{
      id: `${base}/page`,
      type: 'AnnotationPage',
      items: [{ id: `${base}/painting`, type: 'Annotation', motivation: 'painting', body, target: canvasId }],
    }],
  };
  if (map.georeference) {
    // Allmaps' annotation as served; its target is the IIIF image service,
    // which is what Allmaps Viewer matches against.
    const { '@context': _ctx, ...annotation } = map.georeference;
    canvas.annotations = [{ id: `${base}/georeferencing`, type: 'AnnotationPage', items: [annotation] }];
  }
  return canvas;
}

async function runPool(items, worker, n) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await worker(items[i], i); }
  }));
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const records = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  const matched = [...new Set(records.map((r) => r.notificationArchiveLink).filter(Boolean)
    .map((l) => l.match(/archive\.org\/details\/([^/?#]+)/)?.[1]).filter(Boolean))].sort().reverse();
  const ids = [...new Set([...opts.ids, ...matched])].slice(0, opts.limit);
  console.log(`${matched.length} matched gazettes; fetching ${ids.length}.`);

  const gazettes = (await runPool(ids, async (id) => {
    try {
      const g = await fetchGazette(id, opts);
      const geo = g.maps.filter((m) => m.georeference).length;
      console.log(`${id}: ${g.counts.sokCanvases} embedded images, ${g.counts.archivePages} scanned pages -> ${g.maps.length} maps (${geo} georeferenced)${g.meta.title ? ` — ${g.meta.title}` : ''}`);
      return g;
    } catch (err) {
      console.error(`${id}: failed: ${err.message}`);
      return null;
    }
  }, CONCURRENCY)).filter(Boolean);

  const attribution = {
    label: langMap('Attribution'),
    value: langMap('Gazette of India (MoEFCC). Images via <a href="https://egazette.servantsofknowledge.in/">Servants of Knowledge</a> and <a href="https://archive.org">archive.org</a>; georeferencing via <a href="https://allmaps.org">Allmaps</a>.'),
  };
  const homepage = [{ id: 'https://publicmap.github.io/india-esz-dashboard/', type: 'Text', label: langMap('India ESZ Dashboard'), format: 'text/html' }];
  const context = ['http://iiif.io/api/extension/georef/1/context.json', 'http://iiif.io/api/presentation/3/context.json'];

  await mkdir(path.join(OUT_DIR, 'manifests'), { recursive: true });
  const refs = [];
  let mapCount = 0;
  let georeferenced = 0;
  for (const g of gazettes) {
    if (!g.maps.length) continue;
    const canvases = g.maps.map((m, i) => buildCanvas(g, m, i));
    const geo = canvases.filter((c) => c.annotations).length;
    mapCount += canvases.length;
    georeferenced += geo;
    const { meta } = g;
    const label = langMap(meta.title || g.id);
    const summary = langMap(`${canvases.length} map image(s), ${geo} georeferenced with Allmaps.`);
    const manifest = {
      '@context': context,
      id: manifestId(g.id),
      type: 'Manifest',
      label,
      summary,
      metadata: [
        ['Gazette', `<a href="${meta.details}">${g.id}</a>`],
        ['Published', meta.published || g.id.split('.')[3]],
        ['Gazette ID', meta.gazetteid || ''],
        ['Ministry', meta.ministry || ''],
        ['Original PDF', meta.sourcePdf ? `<a href="${meta.sourcePdf}">${meta.sourcePdf}</a>` : ''],
        ['Archive.org', `<a href="${meta.archive}">${meta.archive}</a>`],
      ].filter(([, v]) => v).map(([k, v]) => ({ label: langMap(k), value: langMap(v) })),
      requiredStatement: attribution,
      homepage: [{ id: meta.details, type: 'Text', label: langMap('Gazette text (Servants of Knowledge)'), format: 'text/html' }],
      seeAlso: [meta.sokManifest, meta.archiveManifest].filter(Boolean)
        .map((id) => ({ id, type: 'Manifest', format: 'application/ld+json', profile: 'https://iiif.io/api/presentation/3/context.json' })),
      partOf: [{ id: COLLECTION_ID, type: 'Collection' }],
      items: canvases,
    };
    await writeFile(path.join(OUT_DIR, 'manifests', `${g.id}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
    refs.push({ id: manifest.id, type: 'Manifest', label, summary, thumbnail: canvases[0].thumbnail });
  }

  const collection = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: COLLECTION_ID,
    type: 'Collection',
    label: langMap('India Eco-Sensitive Zone gazette maps'),
    summary: langMap(`Map images from ${refs.length} Gazette of India Eco-Sensitive Zone notifications, with Allmaps georeferencing where available (${georeferenced} of ${mapCount} maps).`),
    requiredStatement: attribution,
    homepage,
    items: refs,
  };
  await writeFile(path.join(OUT_DIR, 'collection.json'), `${JSON.stringify(collection, null, 2)}\n`);
  console.log(`Wrote ${OUT_DIR}/collection.json: ${refs.length} gazette manifests, ${mapCount} maps, ${georeferenced} georeferenced.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
