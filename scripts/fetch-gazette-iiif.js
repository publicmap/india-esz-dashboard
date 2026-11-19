// Regular update step: for every gazette that enrich-archive-org.js matched
// (notificationArchiveLink in data/moef/esz-notifications.json), fetches its
// IIIF manifests and Allmaps georeferencing, then compiles a IIIF Collection
// of per-gazette map manifests plus a single mosaic layer of every
// georeferenced map. The gazette text and images are a separate, manual step:
// see dump-gazettes.js.
//
// Cached in .cache/gazettes/<id>/ (gitignored) and reused on later runs:
//   sok-manifest.json       gazettes.servantsofknowledge.in/.../manifest.json, one canvas
//                           per image embedded in the PDF (what /details/<id>/pymupdf/ shows)
//   archive-manifest.json   iiif.archive.org/iiif/<id>/manifest.json, one canvas per scanned page
// Fetched fresh on every run, so maps georeferenced since the last run are picked up:
//   allmaps-<sok|archive>.json   annotations.allmaps.org/manifests/<sha1(manifest url)[:16]>
//                                (the same maps as api.allmaps.org/manifests/<id>/maps, as
//                                georeference annotations)
//
// Compiled output (IIIF Presentation 3):
//   data/gazette-maps/collection.json        a Collection with one Manifest per gazette
//   data/gazette-maps/manifests/<id>.json    that gazette's manifest: one canvas per map
//                                            image, linked (seeAlso) to the source manifests
//   data/gazette-maps/mosaic.json            one Manifest of every georeferenced map, so all of
//                                            them load as a single layer (Allmaps Viewer)
//   data/gazette-maps/mosaic-annotations.json
//                                            the same maps' georeference annotations as one
//                                            AnnotationPage, for allmaps.xyz tiles and the
//                                            Allmaps MapLibre/Leaflet/OpenLayers plugins
// The source manifests can't carry our annotations, hence the per-gazette ones.
// The map candidates are:
//   - images embedded in the PDF, at least MIN_MAP_PX on each side;
//   - scanned archive.org pages, only once someone has georeferenced them in
//     Allmaps. A whole-page scan is otherwise indistinguishable from text pages.
//
// Usage:
//   node scripts/fetch-gazette-iiif.js [--limit N] [--ids id1,id2] [--refresh]
// --ids are taken first, then the newest matched gazettes until --limit is reached.
// --refresh re-downloads the cached manifests too.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateAllmapsId, manifestUrl as archiveManifestUrl } from './lib/allmaps.js';
import {
  CACHE_DIR, MIN_MAP_PX, archiveUrl, cachedJson, canvasImage, detailsUrl, get, iiifLabel as label,
  matchedGazettes, parseArgs, runPool, sokManifestUrl,
} from './lib/gazettes.js';

const OUT_DIR = 'data/gazette-maps';
const PUBLIC_BASE = 'https://publicmap.github.io/india-esz-dashboard/data/gazette-maps';
const COLLECTION_ID = `${PUBLIC_BASE}/collection.json`;
const manifestId = (id) => `${PUBLIC_BASE}/manifests/${id}.json`;
const CONCURRENCY = 8;

function gazetteMeta(id, records) {
  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  const names = uniq(records.map((r) => r.protectedAreaName));
  return {
    id,
    title: `${names.join(', ') || id} – ESZ notification`,
    published: id.split('.')[4],
    orderNumber: uniq(records.map((r) => r.orderNumber)).join(', '),
    status: uniq(records.map((r) => r.notificationStatus)).join(', '),
    states: uniq(records.map((r) => r.state)).join(', '),
    moefPdf: uniq(records.map((r) => r.notificationPdfLink))[0] ?? null,
    details: detailsUrl(id),
    archive: archiveUrl(id),
    sokManifest: sokManifestUrl(id),
    archiveManifest: archiveManifestUrl(id),
  };
}

async function fetchGazette(id, records, opts) {
  const dir = path.join(CACHE_DIR, id);
  await mkdir(dir, { recursive: true });
  const meta = gazetteMeta(id, records);

  const sok = meta.sokManifest ? await cachedJson(path.join(dir, 'sok-manifest.json'), meta.sokManifest, opts.refresh) : null;
  const archive = await cachedJson(path.join(dir, 'archive-manifest.json'), meta.archiveManifest, opts.refresh);
  if (!sok) meta.sokManifest = null;

  // Allmaps keys a manifest by the first 16 hex chars of sha1(manifest URL).
  // Always refreshed: these change as people georeference more maps.
  const annotations = [];
  for (const [key, url] of [['sok', meta.sokManifest], ['archive', meta.archiveManifest]]) {
    if (!url) continue;
    const page = await cachedJson(path.join(dir, `allmaps-${key}.json`), `https://annotations.allmaps.org/manifests/${generateAllmapsId(url)}`, true);
    annotations.push(...(page?.items ?? []));
  }

  // Embedded PDF images: keep the ones big enough to be maps.
  const images = [];
  for (const canvas of sok?.items ?? []) {
    if (Math.min(canvas.width, canvas.height) < MIN_MAP_PX) continue;
    const { serviceId } = canvasImage(canvas);
    if (serviceId) images.push({ source: 'sok', canvas, serviceId, page: label(canvas.label).replace(/^Page\s*/i, '') });
  }

  // Annotations can also be saved against a single image without its manifest
  // (Allmaps editor's "open image" route), so look embedded images up by
  // image id too.
  const byImage = new Map(annotations.map((a) => [a.target?.source?.id, a]));
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
    if (serviceId && byImage.has(serviceId)) pages.push({ source: 'archive', canvas, serviceId, page: label(canvas.label) });
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const matched = await matchedGazettes();
  const ids = [...new Set([...opts.ids, ...matched.keys()])].slice(0, opts.limit);
  console.log(`${matched.size} matched gazettes; fetching ${ids.length}.`);

  const gazettes = (await runPool(ids, async (id) => {
    try {
      const g = await fetchGazette(id, matched.get(id) ?? [], opts);
      const geo = g.maps.filter((m) => m.georeference).length;
      if (g.maps.length) console.log(`${id}: ${g.maps.length} maps (${geo} georeferenced) – ${g.meta.title}`);
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
  const mosaic = [];
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
        ['Published', meta.published],
        ['Order number', meta.orderNumber],
        ['Status', meta.status],
        ['State', meta.states],
        ['MoEFCC PDF', meta.moefPdf ? `<a href="${meta.moefPdf}">${meta.moefPdf}</a>` : ''],
        ['Archive.org', `<a href="${meta.archive}">${meta.archive}</a>`],
      ].filter(([, v]) => v).map(([k, v]) => ({ label: langMap(k), value: langMap(v) })),
      requiredStatement: attribution,
      homepage: [{ id: meta.details, type: 'Text', label: langMap('Gazette text (Servants of Knowledge)'), format: 'text/html' }],
      seeAlso: [meta.sokManifest, meta.archiveManifest].filter(Boolean)
        .map((id) => ({ id, type: 'Manifest', format: 'application/ld+json', profile: 'https://iiif.io/api/presentation/3/context.json' })),
      partOf: [{ id: COLLECTION_ID, type: 'Collection' }],
      items: canvases,
    };
    for (const c of canvases.filter((cv) => cv.annotations)) {
      mosaic.push({ ...c, label: langMap(`${meta.title || g.id} – ${c.label.en[0]}`), metadata: [...manifest.metadata, ...c.metadata] });
    }
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
  const mosaicManifest = {
    '@context': context,
    id: `${PUBLIC_BASE}/mosaic.json`,
    type: 'Manifest',
    label: langMap('India Eco-Sensitive Zone gazette maps – georeferenced mosaic'),
    summary: langMap(`All ${mosaic.length} georeferenced maps from the Eco-Sensitive Zone gazettes, as one layer.`),
    requiredStatement: attribution,
    homepage,
    partOf: [{ id: COLLECTION_ID, type: 'Collection' }],
    items: mosaic,
  };
  await writeFile(path.join(OUT_DIR, 'mosaic.json'), `${JSON.stringify(mosaicManifest, null, 2)}\n`);
  const annotationPage = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: `${PUBLIC_BASE}/mosaic-annotations.json`,
    type: 'AnnotationPage',
    items: mosaic.map((c) => ({ '@context': context, ...c.annotations[0].items[0] })),
  };
  await writeFile(path.join(OUT_DIR, 'mosaic-annotations.json'), `${JSON.stringify(annotationPage, null, 2)}\n`);

  console.log(`Wrote ${OUT_DIR}/mosaic.json and mosaic-annotations.json: ${mosaic.length} georeferenced maps.`);
  console.log(`Wrote ${OUT_DIR}/collection.json: ${refs.length} gazette manifests, ${mapCount} maps, ${georeferenced} georeferenced.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
