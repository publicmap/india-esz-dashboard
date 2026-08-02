// Parses the three combined Wikipedia protected-area list tables
// (data/raw/{national-parks,wildlife-sanctuaries,tiger-reserves}-table.html,
// produced by fetch-source.js) into one structured record per protected area,
// written to data/wikipedia/. Sibling to parse-moef-table.js, which does the
// analogous job for the MoEF ESZ notifications table.
//
// Each raw table already has a flat header row and one row per PA (fetch-
// source.js did the rowspan/colspan flattening and per-state column
// reconciliation), so this is just cell-by-cell extraction/cleanup -- no
// table-shape repair needed here.

import * as cheerio from 'cheerio';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import { classifyProtectedAreaType } from './lib/protected-area-type.js';

const OUTPUT_DIR = 'data/wikipedia';

// Wikipedia reference/footnote markers (numeric "[6]" or lettered "[a]",
// the latter used for table cells specifically) show up inside cell text
// wherever a <sup> citation sits next to the content -- never real data.
function cleanText(text) {
  return text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

function emptyToNull(text) {
  const t = cleanText(text);
  return t === '' || t === '–' || t === '-' ? null : t;
}

function cellText($, cell) {
  return cell ? emptyToNull($(cell).text()) : null;
}

function firstWikipediaHref($, cell) {
  if (!cell) return null;
  const a = $(cell).find('a[href*="en.wikipedia.org/wiki/"]').first();
  return a.length > 0 ? a.attr('href') : null;
}

function firstImageSrc($, cell) {
  if (!cell) return null;
  const img = $(cell).find('img').first();
  if (img.length === 0) return null;
  const src = img.attr('src');
  if (!src) return null;
  return src.startsWith('//') ? `https:${src}` : src;
}

// The visible coordinate link renders a DMS string, but Wikipedia's {{coord}}
// template also embeds a hidden "lat; lon" decimal-degrees span (used by tools
// like WikiMiniAtlas) -- much easier to parse than the DMS text next to it.
function extractLatLon($, cell) {
  if (!cell) return { latitude: null, longitude: null };
  const geoText = $(cell).find('span.geo').first().text().trim();
  const m = geoText.match(/(-?\d+\.\d+)\s*;\s*(-?\d+\.\d+)/);
  return m ? { latitude: Number(m[1]), longitude: Number(m[2]) } : { latitude: null, longitude: null };
}

async function loadRows(path) {
  const html = await readFile(path, 'utf8');
  const $ = cheerio.load(html);
  const headers = $('thead th').map((i, el) => cleanText($(el).text())).get();
  const rows = $('tbody tr').toArray().map((tr) => {
    const cells = $(tr).find('td').toArray();
    const byHeader = {};
    headers.forEach((h, i) => { byHeader[h] = cells[i]; });
    return byHeader;
  });
  return { $, rows };
}

async function writeRecords(records, basename) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/${basename}.json`, JSON.stringify(records, null, 2), 'utf8');
  await writeFile(`${OUTPUT_DIR}/${basename}.csv`, stringify(records, { header: true }), 'utf8');
  console.log(`Saved ${records.length} records to ${OUTPUT_DIR}/${basename}.{json,csv}`);
}

async function parseNationalParks() {
  const { $, rows } = await loadRows('data/raw/national-parks-table.html');
  const records = rows.map((c) => {
    const name = cellText($, c.Name);
    return {
      protectedAreaName: name,
      protectedAreaType: classifyProtectedAreaType(name) ?? 'National Park',
      state: cellText($, c.State),
      wikipediaUrl: firstWikipediaHref($, c.Name),
      imageUrl: firstImageSrc($, c.Image),
      location: cellText($, c.Location),
      formed: cellText($, c.Formed),
      area: cellText($, c.Area),
      notableFeatures: cellText($, c['Notable Features']),
      floraAndFauna: cellText($, c['Flora and Fauna']),
      flora: cellText($, c.Flora),
      fauna: cellText($, c.Fauna),
      riversAndLakes: cellText($, c['Rivers and lakes']),
      landmarks: cellText($, c.Landmarks),
    };
  }).filter((r) => r.protectedAreaName);
  await writeRecords(records, 'national-parks');
}

async function parseWildlifeSanctuaries() {
  const { $, rows } = await loadRows('data/raw/wildlife-sanctuaries-table.html');
  const records = rows.map((c) => {
    const name = cellText($, c.Sanctuary);
    return {
      protectedAreaName: name,
      protectedAreaType: classifyProtectedAreaType(name) ?? 'Wildlife Sanctuary',
      state: cellText($, c.State),
      wikipediaUrl: firstWikipediaHref($, c.Sanctuary),
      declared: cellText($, c.Declared),
      area: cellText($, c['Area (km2)']),
      district: cellText($, c.District),
    };
  }).filter((r) => r.protectedAreaName);
  await writeRecords(records, 'wildlife-sanctuaries');
}

// The source table names each reserve by its short place name (e.g.
// "Bandipur", "Corbett") rather than the full "<Name> Tiger Reserve" form
// used everywhere else in this dataset -- append the type so records are
// self-describing and comparable to MoEF/Wikidata names.
function tigerReserveName(rawName) {
  if (!rawName) return null;
  return /tiger reserve/i.test(rawName) ? rawName : `${rawName} Tiger Reserve`;
}

async function parseTigerReserves() {
  const { $, rows } = await loadRows('data/raw/tiger-reserves-table.html');
  const records = rows.map((c) => {
    const { latitude, longitude } = extractLatLon($, c.Location);
    return {
      protectedAreaName: tigerReserveName(cellText($, c.Name)),
      protectedAreaType: 'Tiger Reserve',
      state: cellText($, c.State),
      wikipediaUrl: firstWikipediaHref($, c.Name),
      inclusion: cellText($, c.Inclusion),
      lastNotified: cellText($, c['Last notified']),
      latitude,
      longitude,
      tigerPopulation2022: cellText($, c['Tiger population (2022)']),
      areaCoreKm2: cellText($, c.Core),
      areaBufferKm2: cellText($, c.Buffer),
      areaTotalKm2: cellText($, c.Total),
    };
  }).filter((r) => r.protectedAreaName);
  await writeRecords(records, 'tiger-reserves');
}

async function main() {
  await parseNationalParks();
  await parseWildlifeSanctuaries();
  await parseTigerReserves();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
