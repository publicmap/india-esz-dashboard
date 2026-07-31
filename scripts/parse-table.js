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
import { classifyProtectedAreaType } from './lib/protected-area-type.js';

const INPUT_PATH = 'data/raw/moef-esz-notifications-table.html';
const BASE_URL = 'https://moef.gov.in';

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

function stripBoilerplate(name) {
  return cleanText(name.replace(NOTIFICATION_BOILERPLATE_PREFIX, ''));
}

function extractProtectedAreaName($, anchors, fallbackText) {
  const titledAnchors = anchors.filter((a) => $(a).attr('title'));
  for (const a of titledAnchors) {
    const title = cleanText($(a).attr('title') || '');
    if (CLICK_TITLE_PREFIX.test(title)) {
      const name = stripBoilerplate(title.replace(CLICK_TITLE_PREFIX, ''));
      if (name) return name;
    }
  }
  const firstAnchorWithHref = anchors.find((a) => !/\.pdf$/i.test($(a).attr('href') || ''));
  const firstPdfAnchor = anchors.find((a) => /\.pdf$/i.test($(a).attr('href') || ''));
  const firstPdfAnchorText = stripBoilerplate(cleanText(firstPdfAnchor ? $(firstPdfAnchor).text() : ''));
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

function extractPdfLinks($, anchors) {
  return anchors
    .filter((a) => /\.pdf$/i.test($(a).attr('href') || ''))
    .map((a) => resolveUrl($(a).attr('href')))
    .filter(Boolean);
}

function extractMaps($, anchors) {
  return anchors
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

// A Final cell sometimes has one or more amendment notifications tacked on
// after the original (e.g. "14. S.O. 652(E) ... Mount Harriet ...(3.00 MB)
// <p>S.O. No. 6014(E) ... Amendment ...</p>"), wrapped in their own <p> (or,
// occasionally, just separated by <br><br> with no wrapping element at all).
// Rather than special-case that markup, split the cell's flattened text at
// each order-number occurrence and reattach each anchor to the segment whose
// text it falls within, found by walking the anchors' own text through the
// flattened text in document order.
function splitCellIntoNotifications($, cell, text) {
  const orderMatches = [...text.matchAll(new RegExp(ORDER_NUMBER_RE, 'gi'))];
  const allAnchors = $(cell).find('a').toArray();
  if (orderMatches.length <= 1) {
    return [{ text, anchors: allAnchors }];
  }

  let cursor = 0;
  const anchorPositions = allAnchors.map((a) => {
    const t = cleanText($(a).text());
    let index = t ? text.indexOf(t, cursor) : -1;
    if (index === -1) index = cursor;
    cursor = index + t.length;
    return { anchor: a, index };
  });

  const rawSegments = orderMatches.map((m, i) => {
    const start = i === 0 ? 0 : m.index;
    const end = i + 1 < orderMatches.length ? orderMatches[i + 1].index : text.length;
    return {
      text: text.slice(start, end),
      anchors: anchorPositions.filter((ap) => ap.index >= start && ap.index < end).map((ap) => ap.anchor),
    };
  });

  // An order-number match with no anchor of its own isn't a distinct
  // notification -- it's a citation embedded within a previous segment's
  // own anchor/title text (e.g. a Malayalam-version cell's disclaimer
  // referencing the English-language order it supersedes: "...vide
  // S.O.No.2634(E) dated 05.08.2020..." inside one big anchor). Fold it
  // back into the segment it's actually part of.
  const segments = [];
  for (const seg of rawSegments) {
    if (seg.anchors.length === 0 && segments.length > 0) {
      segments[segments.length - 1].text += ` ${seg.text}`;
    } else {
      segments.push({ ...seg });
    }
  }
  return segments.map((seg) => ({ ...seg, text: cleanText(seg.text) }));
}

// A non-primary segment isn't always a literal amendment -- it can be a
// later, standalone re-issue of the same status (e.g. a second "Final
// Notification" superseding the first, or a "Re-Draft Notification") tacked
// on in the same cell. Trust whatever notification-type word the segment
// itself uses rather than assuming "Amendment".
function detectSegmentStatus(text, fallbackStatus) {
  if (/\bamendment/i.test(text)) return 'Amendment';
  if (/\bfinal\b/i.test(text)) return 'Final';
  if (/\bdraft\b/i.test(text)) return 'Draft';
  return fallbackStatus;
}

// The upload-date cell for a Final notification with N embedded amendments
// occasionally lists N dates joined with "and" (e.g. "05/10/2016 and
// 22/12/2022"), in the same order as the notifications in the adjacent cell.
// Only trust that pairing when the count actually matches the segment count;
// otherwise keep the raw text attached to the primary notification only
// rather than guessing which segment a date belongs to.
function splitUploadDates(uploadDateText, segmentCount) {
  if (isEffectivelyEmpty(uploadDateText)) return new Array(segmentCount).fill(null);
  const parts = uploadDateText.split(/\s+and\s+/i).map(cleanText).filter(Boolean);
  if (parts.length === segmentCount) return parts;
  return [cleanText(uploadDateText), ...new Array(segmentCount - 1).fill(null)];
}

function parseNotificationCell($, cell, { state, status, uploadDateText }) {
  const text = cleanText($(cell).text());
  if (isEffectivelyEmpty(text)) return [];

  const segments = splitCellIntoNotifications($, cell, text);
  const uploadDates = splitUploadDates(uploadDateText, segments.length);

  return segments.map((segment, i) => {
    // The protected area name is sometimes only fully spelled out (with its
    // type, e.g. "... Wildlife Sanctuary") in the anchor's title attribute,
    // not in the segment's own visible text -- classify against both.
    const protectedAreaName = extractProtectedAreaName($, segment.anchors, segment.text);

    return {
      moefSNo: extractMoefSNo(segment.text),
      state,
      protectedAreaName,
      protectedAreaType: classifyProtectedAreaType(`${protectedAreaName} ${segment.text}`),
      notificationStatus: i === 0 ? status : detectSegmentStatus(segment.text, 'Amendment'),
      notificationDate: extractNotificationDate(segment.text),
      notificationSummary: segment.text,
      notificationPdfLink: extractPdfLinks($, segment.anchors)[0] ?? null,
      maps: extractMaps($, segment.anchors),
      notificationUploadDate: uploadDates[i],
      orderNumber: extractOrderNumber(segment.text),
    };
  });
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

    const draftRecords = parseNotificationCell($, draftCell, {
      state: currentState,
      status: 'Draft',
      uploadDateText: $(draftDateCell).text(),
    });
    records.push(...draftRecords);

    const finalRecords = parseNotificationCell($, finalCell, {
      state: currentState,
      status: 'Final',
      uploadDateText: $(finalDateCell).text(),
    });
    records.push(...finalRecords);
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
