// Parses the raw MoEF ESZ notifications table (data/raw/moef-esz-notifications-table.html)
// into structured records, one per Draft or Final notification.
//
// Source table shape: each state/UT starts a run of <tr>s via a rowspan'd first
// <td>; the remaining 4 cells per row are [draft cell, draft upload-date,
// final cell, final upload-date]. Either pair can be empty if that stage
// hasn't happened yet. This is real-world government-site markup: numbering
// is inconsistent, some anchors have no href, some cells hold multiple PDFs
// (original + amendment), and a few embed lists of map image links.

import * as cheerio from 'cheerio';
import { readFile, writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';

const INPUT_PATH = 'data/raw/moef-esz-notifications-table.html';
const BASE_URL = 'https://moef.gov.in';

const PA_TYPE_KEYWORDS = [
  'Tiger Reserve',
  'Biosphere Reserve',
  'Conservation Reserve',
  'Community Reserve',
  'National Park',
  'Bird Sanctuary',
  'Wildlife Sanctuary',
  'Wild Life Sanctuary',
  'Sanctuary',
];

const CLICK_TITLE_PREFIX = /^click here to view or download\s*-\s*/i;
// The site's own anchor titles/text occasionally contain the whole notification
// phrase instead of just the protected area name (e.g. "Draft ESZ Notification
// on Bandipur National Park") -- strip that boilerplate wherever it appears.
const NOTIFICATION_BOILERPLATE_PREFIX = /^(re-?draft\s+)?(draft|final)?\s*(esz\s+)?(notif\w*\s*(of|on|for)?\s*(declaring\s+)?(eco[\s-]?sensitive\s+zone\s+)?(around|on|for|of)?\s*)?(the\s+)?/i;
const ORDER_NUMBER_RE = /S\s*\.?\s*O\s*\.?\s*(?:No\s*\.?)?\s*\d+\s*(?:\(E\))?/i;
const NOTIFICATION_DATE_RE = /\[\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})\s*\]/;
const LEADING_INDEX_RE = /^(\d+)\s*\.\s*/;

function cleanText(text) {
  return text
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEffectivelyEmpty(text) {
  const t = cleanText(text);
  return t === '' || t === '–' || t === '-' || t === '.';
}

function resolveUrl(href) {
  if (!href) return null;
  try {
    return new URL(href, BASE_URL).toString();
  } catch {
    return href;
  }
}

function extractOrderNumber(text) {
  const m = text.match(ORDER_NUMBER_RE);
  return m ? cleanText(m[0]) : null;
}

function extractNotificationDate(text) {
  const m = text.match(NOTIFICATION_DATE_RE);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function extractMoefSNo(text) {
  const m = text.match(LEADING_INDEX_RE);
  return m ? Number(m[1]) : null;
}

function extractProtectedAreaType(text) {
  for (const keyword of PA_TYPE_KEYWORDS) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) return keyword;
  }
  return null;
}

function stripBoilerplate(name) {
  return cleanText(name.replace(NOTIFICATION_BOILERPLATE_PREFIX, ''));
}

function extractProtectedAreaName($, cell, fallbackText) {
  const anchors = $(cell).find('a[title]').toArray();
  for (const a of anchors) {
    const title = cleanText($(a).attr('title') || '');
    if (CLICK_TITLE_PREFIX.test(title)) {
      const name = stripBoilerplate(title.replace(CLICK_TITLE_PREFIX, ''));
      if (name) return name;
    }
  }
  const firstAnchorWithHref = $(cell).find('a[href]').toArray()
    .find((a) => !/\.pdf$/i.test($(a).attr('href') || ''));
  const firstPdfAnchorText = stripBoilerplate(cleanText($(cell).find('a[href$=".pdf" i]').first().text()));
  if (firstPdfAnchorText) return firstPdfAnchorText;
  if (firstAnchorWithHref) {
    const t = stripBoilerplate(cleanText($(firstAnchorWithHref).text()));
    if (t) return t;
  }
  // Last resort: strip the boilerplate lead-in phrasing and take what's left.
  return stripBoilerplate(
    cleanText(
      fallbackText
        .replace(LEADING_INDEX_RE, '')
        .replace(ORDER_NUMBER_RE, '')
        .replace(/\[[^\]]*\]/, ''),
    ).slice(0, 80),
  );
}

function extractPdfLinks($, cell) {
  return $(cell)
    .find('a[href$=".pdf" i]')
    .toArray()
    .map((a) => resolveUrl($(a).attr('href')))
    .filter(Boolean);
}

function extractMaps($, cell) {
  return $(cell)
    .find('a[href]')
    .toArray()
    .filter((a) => !/\.pdf$/i.test($(a).attr('href') || ''))
    .map((a) => ({
      title: cleanText($(a).text()) || null,
      link: resolveUrl($(a).attr('href')),
    }))
    .filter((m) => m.link);
}

function looksLikeNotificationCell($, td) {
  const text = cleanText($(td).text());
  return (
    $(td).find('a').length > 0 ||
    ORDER_NUMBER_RE.test(text) ||
    NOTIFICATION_DATE_RE.test(text)
  );
}

function hasPdfAnchor($, td) {
  return $(td).find('a[href$=".pdf" i]').length > 0;
}

// The source table is hand-maintained and occasionally has a stray extra <td>
// in a row (a leftover placeholder cell from an edit). Brute-force which of
// the 5 cells to drop: a valid [draft, draftDate, final, finalDate] layout
// never has a PDF anchor in the two date slots, and among options that
// satisfy that, prefer dropping the most content-free cell so we don't
// discard a real date/link.
function repairFiveNotificationCells($, tds) {
  const candidates = [];
  for (let k = 1; k < tds.length; k += 1) {
    const remaining = tds.filter((_, i) => i !== k);
    if (!hasPdfAnchor($, remaining[1]) && !hasPdfAnchor($, remaining[3])) {
      const dropped = cleanText($(tds[k]).text());
      candidates.push({ k, trivial: isEffectivelyEmpty(dropped) ? 1 : 0 });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.trivial - a.trivial || b.k - a.k);
  return tds.filter((_, i) => i !== candidates[0].k);
}

// Returns { cells: [draftCell, draftDateCell, finalCell, finalDateCell], newState }
// or null if the row's cell layout can't be resolved.
function resolveRowCells($, tr, currentState) {
  const tds = $(tr).find('> td').toArray();
  if (tds.length === 0) return null;

  if ($(tds[0]).attr('rowspan')) {
    const newState = cleanText($(tds[0]).text());
    return { cells: tds.slice(1), newState };
  }

  if (tds.length === 4) {
    return { cells: tds, newState: currentState };
  }

  if (tds.length === 5) {
    if (!looksLikeNotificationCell($, tds[0])) {
      const text0 = cleanText($(tds[0]).text());
      const newState = isEffectivelyEmpty(text0) ? currentState : text0;
      return { cells: tds.slice(1), newState };
    }
    const repaired = repairFiveNotificationCells($, tds);
    return repaired ? { cells: repaired, newState: currentState } : null;
  }

  return null;
}

function parseNotificationCell($, cell, { state, status, uploadDateText }) {
  const rawText = $(cell).html() ?? '';
  const text = cleanText($(cell).text());
  if (isEffectivelyEmpty(text)) return null;

  return {
    moefSNo: extractMoefSNo(text),
    state,
    protectedAreaName: extractProtectedAreaName($, cell, text),
    protectedAreaType: extractProtectedAreaType(text),
    notificationStatus: status,
    notificationDate: extractNotificationDate(text),
    notificationSummary: text,
    notificationPdfLink: extractPdfLinks($, cell)[0] ?? null,
    maps: extractMaps($, cell),
    notificationUploadDate: isEffectivelyEmpty(uploadDateText) ? null : cleanText(uploadDateText),
    orderNumber: extractOrderNumber(text),
  };
}

async function main() {
  const html = await readFile(INPUT_PATH, 'utf8');
  const $ = cheerio.load(html);

  const records = [];
  const warnings = [];
  let currentState = null;

  $('tbody > tr').each((rowIndex, tr) => {
    const resolved = resolveRowCells($, tr, currentState);
    if (!resolved) {
      const tds = $(tr).find('> td').toArray();
      warnings.push(`Row ${rowIndex}: could not resolve ${tds.length} data cells (state: ${currentState})`);
      return;
    }
    currentState = resolved.newState;
    const { cells } = resolved;
    if (cells.length !== 4) return; // e.g. a bare state-header row with no data cells

    const [draftCell, draftDateCell, finalCell, finalDateCell] = cells;

    const draftRecord = parseNotificationCell($, draftCell, {
      state: currentState,
      status: 'Draft',
      uploadDateText: $(draftDateCell).text(),
    });
    if (draftRecord) records.push(draftRecord);

    const finalRecord = parseNotificationCell($, finalCell, {
      state: currentState,
      status: 'Final',
      uploadDateText: $(finalDateCell).text(),
    });
    if (finalRecord) records.push(finalRecord);
  });

  await writeFile('data/moef-esz-notifications.json', JSON.stringify(records, null, 2), 'utf8');

  const csvRows = records.map((r) => ({
    ...r,
    maps: JSON.stringify(r.maps),
  }));
  const csv = stringify(csvRows, { header: true });
  await writeFile('data/moef-esz-notifications.csv', csv, 'utf8');

  const missingPdf = records.filter((r) => !r.notificationPdfLink).length;
  const missingOrderNumber = records.filter((r) => !r.orderNumber).length;
  const missingType = records.filter((r) => !r.protectedAreaType).length;
  const missingDate = records.filter((r) => !r.notificationDate).length;

  console.log(`Parsed ${records.length} notification records from ${$('tbody > tr').length} table rows.`);
  console.log(`  missing PDF link: ${missingPdf}`);
  console.log(`  missing order number: ${missingOrderNumber}`);
  console.log(`  missing protected area type: ${missingType}`);
  console.log(`  missing notification date: ${missingDate}`);
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  ${w}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
