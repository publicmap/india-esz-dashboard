// Builds Allmaps (https://allmaps.org) IIIF georeferencing URLs for an
// archive.org gazette scan, so a human can jump straight from the cache CSV
// to viewing/georeferencing a topo map/annexure embedded in the scan.
//
// - "allmaps images" needs only the manifest -- it works for any archive.org
//   item, with or without a specific page picked out.
// - "toposheet page"/"toposheet thumbnail"/"allmaps editor"/"tms" all need a
//   specific *page* (IIIF canvas), since a gazette PDF has many pages and only
//   one usually has the toposheet/annexure map. The page comes from either a
//   manual "toposheet page" cache value or a `/page/nNN/` segment on the
//   archive.org URL -- see selectPage().
import { createHash } from 'node:crypto';

const BG_PRESET = 'osm';
const BG_URL = 'https://indianopenmaps.fly.dev/soi/osm/{z}/{x}/{y}.webp';
const THUMBNAIL_WIDTH = 200;

export function manifestUrl(identifier) {
  return `https://iiif.archive.org/iiif/${identifier}/manifest.json`;
}

// Deliberately not percent-encoded, matching the plain query-string form
// Allmaps' own "Add image(s)" viewer link uses.
export function buildImagesUrl(identifier) {
  return `https://editor.allmaps.org/images?url=${manifestUrl(identifier)}&bg-preset=${BG_PRESET}&bg-url=${BG_URL}`;
}

export function buildEditorUrl(identifier, imageServiceId) {
  const params = [
    `url=${encodeURIComponent(manifestUrl(identifier))}`,
    `bg-preset=${BG_PRESET}`,
    `bg-url=${encodeURIComponent(BG_URL)}`,
    `image=${encodeURIComponent(imageServiceId)}`,
  ];
  return `https://editor.allmaps.org/georeference?${params.join('&')}`;
}

export function buildThumbnailUrl(imageServiceId) {
  return `${imageServiceId}/full/${THUMBNAIL_WIDTH},/0/default.jpg`;
}

// Allmaps' id for a IIIF resource is the first 16 hex chars of the SHA-1
// hash of its URI (@allmaps/id's generateId()) -- this is how the tile
// server (allmaps.xyz) and API (api.allmaps.org) key georeferenced images,
// so it can be computed locally without calling either service.
export function generateAllmapsId(uri) {
  return createHash('sha1').update(uri).digest('hex').slice(0, 16);
}

export function buildTmsUrl(imageServiceId) {
  const id = generateAllmapsId(imageServiceId);
  return `https://allmaps.xyz/images/${id}/{z}/{x}/{y}@2x.png`;
}

// The Allmaps Annotations API keys georeferencing results by the same id --
// a 200 here means this exact IIIF image has been georeferenced somewhere,
// a 404 means it hasn't.
export function buildAnnotationUrl(allmapsId) {
  return `https://annotations.allmaps.org/images/${allmapsId}`;
}

// Archive.org book-reader URLs encode the page as a 0-based leaf index,
// e.g. .../page/n27/mode/2up -- this lines up with the IIIF manifest's
// canvas order (canvas label "27" == items[27]) for the scans checked so
// far, but we match on label first and only fall back to raw index in case
// a manifest ever has non-sequential labels.
export function extractPageFromArchiveLink(archiveLink) {
  const m = archiveLink && archiveLink.match(/\/page\/n(\d+)(?:\/|$)/);
  return m ? m[1] : null;
}

export function extractIdentifierFromArchiveLink(archiveLink) {
  const m = archiveLink && archiveLink.match(/archive\.org\/details\/([^/?#]+)/);
  return m ? m[1] : null;
}

function canvasLabel(canvas) {
  const labels = canvas?.label?.none ?? canvas?.label?.en ?? [];
  return labels[0];
}

function canvasImageServiceId(canvas) {
  const body = canvas?.items?.[0]?.items?.[0]?.body;
  const service = Array.isArray(body?.service) ? body.service[0] : body?.service;
  return service?.id ?? service?.['@id'] ?? null;
}

// Finds the IIIF Image API service @id (the base URI later used both for
// the Allmaps editor `image=` param and to derive its Allmaps id) for the
// canvas matching `page`.
export function findImageServiceIdForPage(manifest, page) {
  const items = manifest?.items ?? [];
  const byLabel = items.find((c) => canvasLabel(c) === String(page));
  const canvas = byLabel ?? items[Number(page)];
  return canvas ? canvasImageServiceId(canvas) : null;
}

// Every canvas's label + IIIF Image API service id, in manifest order --
// used to scan a whole scan for which page(s) have been georeferenced,
// rather than looking up a single page already known ahead of time.
export function listCanvases(manifest) {
  const items = manifest?.items ?? [];
  return items.map((canvas) => ({
    label: canvasLabel(canvas),
    imageServiceId: canvasImageServiceId(canvas),
  }));
}
