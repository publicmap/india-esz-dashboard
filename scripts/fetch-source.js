// Fetches the MoEF ESZ notifications table, plus three Wikipedia protected-area
// list pages, and saves each as a raw table HTML fragment in data/raw/ for a
// later parse step to turn into structured records (mirrors parse-table.js's
// relationship to the MoEF table).
//
// The MoEF site (moef.gov.in, not www.moef.gov.in -- the www cert doesn't
// match) defaults to Hindi and only serves English after a session cookie is
// set via a POST to /set-locale carrying a CSRF token scraped from the page.
// There is no query-param shortcut, so we do the two-request dance below.

import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';
import { expandTableGrid, countHeaderRows } from './lib/html-table-grid.js';

const SOURCE_URL = 'https://moef.gov.in/esz-notifications';
const SET_LOCALE_URL = 'https://moef.gov.in/set-locale';
const OUTPUT_PATH = 'data/raw/moef-esz-notifications-table.html';
const USER_AGENT = 'Mozilla/5.0 (compatible; india-esz-dashboard-bot/1.0; +https://github.com/publicmap/india-esz-dashboard)';

const NATIONAL_PARKS_URL = 'https://en.wikipedia.org/wiki/List_of_national_parks_of_India';
const WILDLIFE_SANCTUARIES_URL = 'https://en.wikipedia.org/wiki/List_of_wildlife_sanctuaries_of_India';
const TIGER_RESERVES_URL = 'https://en.wikipedia.org/wiki/Tiger_reserves_of_India';

const NATIONAL_PARKS_OUTPUT_PATH = 'data/raw/national-parks-table.html';
const WILDLIFE_SANCTUARIES_OUTPUT_PATH = 'data/raw/wildlife-sanctuaries-table.html';
const TIGER_RESERVES_OUTPUT_PATH = 'data/raw/tiger-reserves-table.html';

function mergeCookies(jar, setCookieHeaders) {
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchEnglishHtml() {
  const jar = new Map();

  const firstResponse = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!firstResponse.ok) {
    throw new Error(`Initial fetch of ${SOURCE_URL} failed: ${firstResponse.status}`);
  }
  mergeCookies(jar, firstResponse.headers.getSetCookie());
  const firstHtml = await firstResponse.text();

  const tokenMatch = firstHtml.match(/name="_token"\s+value="([^"]+)"/);
  if (!tokenMatch) {
    throw new Error('Could not find CSRF _token on the ESZ notifications page');
  }

  const setLocaleResponse = await fetch(SET_LOCALE_URL, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ _token: tokenMatch[1], locale: 'en' }),
  });
  if (![200, 302].includes(setLocaleResponse.status)) {
    throw new Error(`set-locale POST failed: ${setLocaleResponse.status}`);
  }
  mergeCookies(jar, setLocaleResponse.headers.getSetCookie());

  const secondResponse = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': USER_AGENT, Cookie: cookieHeader(jar) },
  });
  if (!secondResponse.ok) {
    throw new Error(`English fetch of ${SOURCE_URL} failed: ${secondResponse.status}`);
  }
  return secondResponse.text();
}

async function saveMoefEszNotifications() {
  const html = await fetchEnglishHtml();
  const $ = cheerio.load(html);

  const table = $('div.table-responsive').first();
  if (table.length === 0) {
    throw new Error('Could not find div.table-responsive on the fetched page');
  }
  const headingText = table.find('thead').text();
  if (!/ESZ Notifications/i.test(headingText)) {
    throw new Error(`Fetched table does not look like the ESZ notifications table (got heading: ${headingText.slice(0, 80)})`);
  }

  await mkdir('data/raw', { recursive: true });
  await writeFile(OUTPUT_PATH, $.html(table), 'utf8');
  console.log(`Saved table (${table.find('tbody > tr').length} rows) to ${OUTPUT_PATH}`);
}

async function fetchWikipediaHtml(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Fetch of ${url} failed: ${response.status}`);
  }
  return response.text();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Header cells occasionally carry a trailing citation marker (e.g. "Tiger
// population (2022)[6]") picked up from the reference superscript's text.
function cleanHeaderText(text) {
  return text.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
}

// These list-of-PA Wikipedia pages open with a state-wise summary/aggregate
// table (totals per state, not individual PAs) before the per-state tables
// that actually enumerate protected areas -- skip it.
function isSummaryTable(columns) {
  return !columns.includes('Name') && !columns.includes('Sanctuary');
}

// The section heading (h2/h3) immediately containing a table is that table's
// state/UT -- e.g. "Andhra Pradesh(3)[edit]" for a National Parks sub-table.
// Newer MediaWiki skins wrap the heading in a <div class="mw-heading">, so we
// search descendants of the section rather than assuming <h2> is a direct
// child.
function stateFromSectionHeading($, table) {
  const heading = table.closest('section').find('h2, h3').first().clone();
  heading.find('.mw-editsection, sup').remove();
  return cleanHeaderText(heading.text()).replace(/\(\d+\)$/, '').trim();
}

// Wildlife-sanctuary sub-tables instead name their state in a <caption>
// ("Wildlife Sanctuaries in Andaman and Nicobar Islands[10][11]"); prefer that
// over the section heading since a state can span multiple headings/tables.
function stateFromCaption($, table, prefixPattern) {
  const caption = table.find('caption').first().clone();
  caption.find('sup, style').remove();
  const text = cleanHeaderText(caption.text());
  const stripped = prefixPattern ? text.replace(prefixPattern, '').trim() : text;
  return stripped || stateFromSectionHeading($, table);
}

// Walks every table.wikitable.sortable on the page (skipping the leading
// summary table and any other table that doesn't look like a PA list),
// expands each one's rowspan/colspan into a flat grid, and maps its header
// row through `canonicalize` so differently-shaped per-state tables (missing
// an Image column here, an extra Area column there) can be merged into one
// consistent set of columns.
function extractProtectedAreaSections($, { canonicalize, stateExtractor }) {
  const sections = [];

  $('table.wikitable.sortable').each((index, tableEl) => {
    if (index === 0) return;
    const table = $(tableEl);
    const grid = expandTableGrid($, tableEl);
    const headerRowCount = countHeaderRows($, tableEl);
    if (headerRowCount === 0 || grid.length <= headerRowCount) return;

    const headerRow = grid[headerRowCount - 1];
    const columns = headerRow.map((cell) => canonicalize(cleanHeaderText(cell?.text ?? '')));
    if (isSummaryTable(columns)) return;

    const state = stateExtractor($, table);
    const rows = grid.slice(headerRowCount).map((row) => {
      const record = {};
      row.forEach((cell, i) => {
        const col = columns[i];
        if (col) record[col] = cell?.html ?? '';
      });
      return record;
    });
    sections.push({ state, rows });
  });

  return sections;
}

function sectionsToTableHtml(sourceUrl, sections, canonicalColumns) {
  const columns = ['State', ...canonicalColumns];
  const headCells = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const bodyRows = sections.flatMap(({ state, rows }) => rows.map((record) => {
    const tds = columns.map((col) => `<td>${col === 'State' ? escapeHtml(state) : (record[col] ?? '')}</td>`);
    return `<tr>${tds.join('')}</tr>`;
  }));
  return `<!-- Source: ${sourceUrl} -->\n<!-- Combined from ${sections.length} per-state tables on the page -->\n<table>\n<thead><tr>${headCells}</tr></thead>\n<tbody>\n${bodyRows.join('\n')}\n</tbody>\n</table>\n`;
}

function canonicalizeNationalParkColumn(header) {
  const t = header.toLowerCase();
  if (t === 'name') return 'Name';
  if (t === 'image') return 'Image';
  if (/^location/.test(t)) return 'Location';
  if (t === 'formed' || t === 'year') return 'Formed';
  if (/^area/.test(t)) return 'Area';
  if (t === 'notable features') return 'Notable Features';
  if (t === 'flora and fauna') return 'Flora and Fauna';
  if (t === 'flora') return 'Flora';
  if (t === 'fauna') return 'Fauna';
  if (/^rivers and lakes/.test(t)) return 'Rivers and lakes';
  if (/^important landmarks/.test(t)) return 'Landmarks';
  return null;
}

const NATIONAL_PARK_COLUMNS = [
  'Name', 'Image', 'Location', 'Formed', 'Area', 'Notable Features',
  'Flora and Fauna', 'Flora', 'Fauna', 'Rivers and lakes', 'Landmarks',
];

function canonicalizeWildlifeSanctuaryColumn(header) {
  const t = header.toLowerCase();
  if (t === 'sanctuary') return 'Sanctuary';
  if (t === 'declared') return 'Declared';
  if (/^area/.test(t)) return 'Area (km2)';
  if (t === 'district') return 'District';
  return null;
}

const WILDLIFE_SANCTUARY_COLUMNS = ['Sanctuary', 'Declared', 'Area (km2)', 'District'];
const WILDLIFE_SANCTUARY_CAPTION_PREFIX = /^wildlife sanctuaries (in|of)\s+/i;

async function saveProtectedAreaListTable({
  url, outputPath, label, canonicalize, canonicalColumns, stateExtractor,
}) {
  const html = await fetchWikipediaHtml(url);
  const $ = cheerio.load(html);

  const sections = extractProtectedAreaSections($, { canonicalize, stateExtractor });
  if (sections.length === 0) {
    throw new Error(`Could not find any per-state ${label} tables on ${url}`);
  }

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
  const out = sectionsToTableHtml(url, sections, canonicalColumns);

  await mkdir('data/raw', { recursive: true });
  await writeFile(outputPath, out, 'utf8');
  console.log(`Saved ${label} table (${totalRows} rows from ${sections.length} states) to ${outputPath}`);
}

async function saveNationalParks() {
  await saveProtectedAreaListTable({
    url: NATIONAL_PARKS_URL,
    outputPath: NATIONAL_PARKS_OUTPUT_PATH,
    label: 'national parks',
    canonicalize: canonicalizeNationalParkColumn,
    canonicalColumns: NATIONAL_PARK_COLUMNS,
    stateExtractor: stateFromSectionHeading,
  });
}

async function saveWildlifeSanctuaries() {
  await saveProtectedAreaListTable({
    url: WILDLIFE_SANCTUARIES_URL,
    outputPath: WILDLIFE_SANCTUARIES_OUTPUT_PATH,
    label: 'wildlife sanctuaries',
    canonicalize: canonicalizeWildlifeSanctuaryColumn,
    canonicalColumns: WILDLIFE_SANCTUARY_COLUMNS,
    stateExtractor: ($, table) => stateFromCaption($, table, WILDLIFE_SANCTUARY_CAPTION_PREFIX),
  });
}

async function saveTigerReserves() {
  const html = await fetchWikipediaHtml(TIGER_RESERVES_URL);
  const $ = cheerio.load(html);

  const table = $('table.wikitable').first();
  if (table.length === 0) {
    throw new Error(`Could not find a wikitable on ${TIGER_RESERVES_URL}`);
  }

  const grid = expandTableGrid($, table.get(0));
  const headerRowCount = countHeaderRows($, table.get(0));
  if (headerRowCount === 0) {
    throw new Error('Could not find a header row in the tiger reserves table');
  }

  const headers = grid[headerRowCount - 1].map((cell) => cleanHeaderText(cell?.text ?? ''));
  const bodyRows = grid.slice(headerRowCount);

  const headCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyHtml = bodyRows.map((row) => {
    const tds = headers.map((_, i) => `<td>${row[i]?.html ?? ''}</td>`);
    return `<tr>${tds.join('')}</tr>`;
  }).join('\n');
  const out = `<!-- Source: ${TIGER_RESERVES_URL} -->\n<table>\n<thead><tr>${headCells}</tr></thead>\n<tbody>\n${bodyHtml}\n</tbody>\n</table>\n`;

  await mkdir('data/raw', { recursive: true });
  await writeFile(TIGER_RESERVES_OUTPUT_PATH, out, 'utf8');
  console.log(`Saved tiger reserves table (${bodyRows.length} rows) to ${TIGER_RESERVES_OUTPUT_PATH}`);
}

async function main() {
  const tasks = [
    ['MoEF ESZ notifications', saveMoefEszNotifications],
    ['national parks', saveNationalParks],
    ['wildlife sanctuaries', saveWildlifeSanctuaries],
    ['tiger reserves', saveTigerReserves],
  ];

  let failed = false;
  for (const [label, task] of tasks) {
    try {
      await task();
    } catch (err) {
      failed = true;
      console.error(`Failed to fetch ${label}:`, err);
    }
  }

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
