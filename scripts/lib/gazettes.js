// Shared helpers for the Servants of Knowledge / archive.org gazette copies
// used by fetch-gazette-iiif.js (regular update) and dump-gazettes.js (manual
// text and image dump).
import { readFile, writeFile, access } from 'node:fs/promises';

export const CACHE_DIR = '.cache/gazettes';
export const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
export const MIN_MAP_PX = 400; // smaller embedded images are logos and signatures

export const detailsUrl = (id) => `https://egazette.servantsofknowledge.in/details/${id}/`;
export const archiveUrl = (id) => `https://archive.org/details/${id}`;

// in.gazette.central.e.<date>.<number> -> the manifest of images extracted from
// the PDF. This is the same URL the details page links to; checked against
// 92 gazettes.
export function sokManifestUrl(id) {
  const m = id.match(/^in\.gazette\.central\.e\.(\d{4}-\d{2}-\d{2})\.(\d+)$/);
  return m ? `https://gazettes.servantsofknowledge.in/gzdl/html/central_extraordinary/${m[1]}/manifest/${m[2]}/manifest.json` : null;
}

export const exists = (p) => access(p).then(() => true, () => false);

export async function get(url, { as = 'text', allow404 = false, tries = 3 } = {}) {
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

// Fetches url into file unless it is already cached (or refresh is set).
// A 404 is cached as null so it isn't requested again.
export async function cachedJson(file, url, refresh) {
  if (!refresh && await exists(file)) return JSON.parse(await readFile(file, 'utf8'));
  const data = await get(url, { as: 'json', allow404: true });
  await writeFile(file, JSON.stringify(data));
  return data;
}

export const iiifLabel = (l) => (l?.none ?? l?.en ?? Object.values(l ?? {})[0] ?? [])[0] ?? '';

export function canvasImage(canvas) {
  const body = canvas?.items?.[0]?.items?.[0]?.body;
  const service = [].concat(body?.service ?? [])[0];
  return { body, serviceId: service?.id ?? service?.['@id'] ?? null };
}

// Archive.org gazette identifiers matched by enrich-archive-org.js, with the
// notification records for each, newest first.
export async function matchedGazettes() {
  const records = JSON.parse(await readFile('data/moef/esz-notifications.json', 'utf8'));
  const byId = new Map();
  for (const r of records) {
    const id = r.notificationArchiveLink?.match(/archive\.org\/details\/([^/?#]+)/)?.[1];
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(r);
  }
  return new Map([...byId].sort(([a], [b]) => (a < b ? 1 : -1)));
}

export function parseArgs(argv, extra = {}) {
  const args = { limit: Infinity, ids: [], refresh: false, ...extra };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--ids') args.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--refresh') args.refresh = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

export async function runPool(items, worker, n) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await worker(items[i], i); }
  }));
  return out;
}
