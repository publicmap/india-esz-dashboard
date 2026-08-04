// Looks up a MoEF notification's S.O. (order) number in archive.org's
// "gazetteofindia" collection to link to the official scanned Gazette of
// India entry.
//
// Every query is scoped to collection:"gazetteofindia" and identifier prefix
// "in.gazette.central.e." (the central government's English extraordinary
// gazette -- every notification we've confirmed by hand lives under this
// prefix, and it also keeps state-gazette false positives that happen to
// reuse the same S.O. number out of the results).
//
// Two search passes:
//
//   1. Title search: older scans put "Ref. S.O. <n>(E)" straight in the
//      title, e.g. "Union Government, Extraordinary, 2014-01-03, Part
//      II-Section 3-Sub-Section(ii), Ref. S.O. 22(E)".
//   2. Text-contents fallback: many newer (JaiGyan-uploaded) scans have a
//      generic title with no S.O. number at all ("Extraordinary Gazette of
//      India, 2024-09-06") -- the only place the S.O. number or protected
//      area name shows up is the item's `description` metadata field, a
//      "Label: value<br />" block scraped from egazette.gov.in (Solr indexes
//      this; the OCR'd body text is not searchable via advancedsearch). The
//      "S.O." / "SO" / "S,O," punctuation is inconsistent across scans, so
//      we search on the bare digits rather than an "S.O. <n>" phrase.
//
// Both passes first try an exact `date` match (S.O. numbers reset every
// calendar year, so the same number recurs across many years, and a
// close-but-different date normally means it's an unrelated notification
// that happens to share it). If that finds nothing, the description pass
// retries over a short forward date window: our `notificationDate` is the
// date printed inside the notification, but archive.org's `date` is the
// Gazette's actual upload date, which is confirmed to sometimes land 1-2
// days later (e.g. a notification dated 2024-12-31 was archived under
// 2025-01-02). This widened pass only fires on a protectedAreaName match
// (never on bare digits alone), since a name match stays precise even
// without the exact-date anchor, whereas digits alone turn out to hit
// several unrelated notifications once the date is no longer pinned.
//
// Third pass, full-text fallback: some scans (mostly pre-2022, uploaded by
// an older IndianKanoon/Google-Vision OCR pipeline rather than the newer
// tesseract one) have a generic title AND a `description` "Subject" field
// that's truncated mid-sentence ("WHEREAS a draft notification was
// published in the Gazette of India Extraordinary") -- it never gets to
// naming the park or S.O. number, so no Solr-indexed field can match it,
// at any date. advancedsearch.php only indexes `title`/`description`, not
// the OCR'd body text, so this has to fall back to downloading each
// same-day candidate's own OCR transcript (the item's "<num>_djvu.txt"
// file) and grepping it directly. This is confirmed to work (verified by
// hand against two Campbell Bay National Park notifications) but it's one
// extra fetch per candidate on that date, so it only runs once title and
// description have both failed, and it stays scoped to the exact
// notification date first before widening -- both examples we confirmed
// matched their exact printed date, so unlike the description fallback,
// there's no evidence the widened window is actually needed here, and
// avoiding it keeps this expensive pass as narrow as possible.
const ADVANCED_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const IDENTIFIER_PREFIX = 'in.gazette.central.e.*';
const FIELDS = ['identifier', 'date', 'title', 'description', 'creator', 'collection'];
const DESCRIPTION_LABELS = ['Date', 'Type', 'Part Number', 'Reference Number', 'Department', 'Ministry', 'Office', 'Subject', 'Gazette Source', 'Gazette ID'];
const DATE_WINDOW_DAYS = 5;
const FULLTEXT_CANDIDATE_CAP = 60;
const OCR_FETCH_CONCURRENCY = 5;
// The S.O. number is confirmed (checked against several matched documents) to
// always land in the opening lines of the scan -- within the first ~600
// characters of documents running anywhere from ~12,000 to 200,000+ chars --
// so a generous 30KB range is orders of magnitude more than needed but still
// a fraction of the full document, which is what actually costs the 5-8s
// seen on the largest scans. archive.org's download endpoint honors Range
// (verified: returns 206 Partial Content).
const OCR_RANGE_BYTES = 30000;

function extractSoDigits(orderNumber) {
  if (!orderNumber) return null;
  const m = orderNumber.match(/\d+/);
  return m ? m[0] : null;
}

function escapeSolrPhrase(value) {
  return value.replace(/["\\]/g, '\\$&');
}

async function fetchWithRetry(url, attempts = 3, parse = (res) => res.json(), headers = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await parse(res);
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function search(clause, notificationDate, windowDays = 0) {
  const endDate = windowDays > 0 ? addDays(notificationDate, windowDays) : notificationDate;
  const dateClause = windowDays > 0 ? `date:[${notificationDate} TO ${endDate}]` : `date:"${notificationDate}"`;
  const q = `collection:"gazetteofindia" AND identifier:${IDENTIFIER_PREFIX} AND ${dateClause} AND (${clause})`;
  const url = `${ADVANCED_SEARCH_URL}?q=${encodeURIComponent(q)}`
    + FIELDS.map((f) => `&fl[]=${f}`).join('')
    + '&rows=50&output=json';
  const json = await fetchWithRetry(url);
  const docs = json?.response?.docs ?? [];
  // Belt-and-braces re-check: the `date` clause above should already
  // restrict to this window, but don't trust Solr's date parsing blindly.
  const inWindow = docs.filter((doc) => {
    if (typeof doc.date !== 'string') return false;
    const d = doc.date.slice(0, 10);
    return d >= notificationDate && d <= endDate;
  });
  // Closest to the notification date first, so a widened window prefers the
  // most plausible candidate over whatever order Solr happened to return.
  inWindow.sort((a, b) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)));
  return inWindow;
}

// Every item on the notification's date, unfiltered by title/description --
// this is the candidate pool the full-text fallback greps through by hand.
async function listCandidates(notificationDate, windowDays = 0) {
  const endDate = windowDays > 0 ? addDays(notificationDate, windowDays) : notificationDate;
  const dateClause = windowDays > 0 ? `date:[${notificationDate} TO ${endDate}]` : `date:"${notificationDate}"`;
  const q = `collection:"gazetteofindia" AND identifier:${IDENTIFIER_PREFIX} AND ${dateClause}`;
  const url = `${ADVANCED_SEARCH_URL}?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=date&rows=100&output=json`;
  const json = await fetchWithRetry(url);
  const docs = json?.response?.docs ?? [];
  const inWindow = docs.filter((doc) => {
    if (typeof doc.date !== 'string') return false;
    const d = doc.date.slice(0, 10);
    return d >= notificationDate && d <= endDate;
  });
  inWindow.sort((a, b) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)));
  return inWindow.slice(0, FULLTEXT_CANDIDATE_CAP);
}

async function fetchOcrText(identifier) {
  const num = identifier.split('.').pop();
  const url = `https://archive.org/download/${identifier}/${num}_djvu.txt`;
  // Single attempt, not the usual 3 retries: a missing OCR derivative
  // reproducibly 500s every time (confirmed against several identifiers), so
  // retrying it just triples the cost of a permanent miss for no benefit.
  return fetchWithRetry(url, 1, (res) => res.text(), { Range: `bytes=0-${OCR_RANGE_BYTES}` });
}

// Requires digit boundaries on both sides (a bare digits-only search would
// also match e.g. "3873" sitting inside "53873" or "38730") and an opening
// paren shortly after, mirroring the "S.O. <n>(E)" / "का.आ. <n>(अ)" shape --
// but not the exact "S.O."/"का.आ." prefix, since OCR mangles that prefix
// too inconsistently to anchor on ("5.0.", "S,O,", etc., seen in practice).
function buildSoNumberPattern(digits) {
  return new RegExp(`(?<!\\d)${digits}(?!\\d)\\s{0,3}\\(\\s*[EAeAअ]`);
}

// Scans each same-day candidate's own OCR transcript (archive.org doesn't
// index this text for search, so this is the only way to reach it) for the
// S.O. number with proper digit boundaries. If more than one candidate
// happens to match the bare number (rare, but the plain digit signal alone
// isn't as strong as a full "S.O. <n>(E)" phrase would be), prefer whichever
// one also mentions the protected area.
//
// Scans candidates through a small worker pool rather than one at a time --
// each OCR fetch is ~2-8s and fully independent, so the original sequential
// version paid for up to 60 of these in series (minutes per record). Workers
// stop picking up new candidates as soon as a name-confirmed match is found,
// since matches.find() below always prefers that over a digit-only match --
// once we have the best possible outcome, scanning the rest can't improve it.
// Without a protectedAreaName (or before any name-match turns up), it still
// has to scan every candidate, same as before, to correctly fall back to the
// earliest digit-only match.
async function scanCandidates(candidates, pattern, nameNeedle) {
  const matches = [];
  let next = 0;
  let stopEarly = false;

  async function worker() {
    while (!stopEarly && next < candidates.length) {
      const idx = next;
      next += 1;
      const doc = candidates[idx];
      let text;
      try {
        text = await fetchOcrText(doc.identifier);
      } catch {
        continue; // some items 404/500 on the OCR derivative -- skip, not fatal
      }
      if (!pattern.test(text)) continue;
      const hasName = nameNeedle ? text.toLowerCase().includes(nameNeedle) : false;
      matches.push({ doc, hasName, idx });
      if (hasName) stopEarly = true;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(OCR_FETCH_CONCURRENCY, candidates.length) }, worker),
  );
  return matches;
}

async function findFullTextMatch(digits, notificationDate, protectedAreaName) {
  const candidates = await listCandidates(notificationDate);
  if (candidates.length === 0) return null;

  const pattern = buildSoNumberPattern(digits);
  const nameNeedle = protectedAreaName ? protectedAreaName.toLowerCase() : null;
  const matches = await scanCandidates(candidates, pattern, nameNeedle);

  if (matches.length === 0) return null;
  const withName = matches.find((m) => m.hasName);
  if (withName) return withName.doc;
  // No name match: fall back to the earliest digit-only match in candidate
  // order (workers can finish out of order, so sort by original index rather
  // than completion order to match the original sequential-scan semantics).
  matches.sort((a, b) => a.idx - b.idx);
  return matches[0].doc;
}

function decodeEntities(str) {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

// The `description` field is an HTML blob of "Label: value" pairs, e.g.
// "Date: 2024-09-06<br />Ministry: ...<br />Subject: ...". Values can sit
// either right after the colon or on the following line, so instead of a
// per-line lookup we scan the whole decoded blob and cut each value at the
// next known label.
function parseDescriptionFields(description) {
  const result = {
    ministry: '', department: '', subject: '', gazetteSource: '',
  };
  if (!description) return result;

  const text = decodeEntities(description).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?p>/gi, '\n');
  const labelAlt = DESCRIPTION_LABELS.join('|');
  const re = new RegExp(`(${labelAlt}):([\\s\\S]*?)(?=(?:${labelAlt}):|$)`, 'g');

  const raw = {};
  let m;
  while ((m = re.exec(text)) !== null) {
    raw[m[1]] = m[2].trim();
  }

  if (raw.Ministry) result.ministry = raw.Ministry.replace(/\s+/g, ' ').trim();
  if (raw.Department) result.department = raw.Department.replace(/\s+/g, ' ').trim();
  if (raw.Subject) result.subject = raw.Subject.replace(/\s+/g, ' ').trim();
  if (raw['Gazette Source']) {
    const hrefMatch = raw['Gazette Source'].match(/href="([^"]*)"/i);
    result.gazetteSource = hrefMatch ? hrefMatch[1] : raw['Gazette Source'].replace(/<[^>]*>/g, '').trim();
  }
  return result;
}

// advancedsearch.php's `description` field has its HTML tags already
// stripped, so a "Gazette Source: <a href=...>" link degrades to the bare
// text "URL" -- useless for QA. Re-fetch the item's own metadata record
// (which keeps the raw HTML) for the one confirmed match, so the cache gets
// the real source URL instead.
async function fetchRawMetadata(identifier) {
  const json = await fetchWithRetry(`https://archive.org/metadata/${identifier}/metadata`);
  return json?.result ?? {};
}

async function toResult(doc, matchMethod) {
  const meta = await fetchRawMetadata(doc.identifier).catch(() => ({}));
  return {
    url: `https://archive.org/details/${doc.identifier}`,
    identifier: doc.identifier,
    date: doc.date.slice(0, 10),
    collection: [].concat(meta.collection ?? doc.collection ?? []).join(';'),
    creator: meta.creator ?? doc.creator ?? '',
    matchMethod,
    ...parseDescriptionFields(meta.description ?? doc.description),
  };
}

export async function findGazetteArchiveLink(orderNumber, notificationDate, protectedAreaName) {
  const digits = extractSoDigits(orderNumber);
  if (!notificationDate) return null;

  if (digits) {
    const titleDocs = await search(`title:"S.O. ${digits}"`, notificationDate);
    if (titleDocs[0]) return toResult(titleDocs[0], 'title');
  }

  const textClauses = [];
  if (digits) textClauses.push(`description:${digits}`);
  if (protectedAreaName) textClauses.push(`description:"${escapeSolrPhrase(protectedAreaName)}"`);
  if (textClauses.length === 0) return null;

  const textDocs = await search(textClauses.join(' OR '), notificationDate);
  if (textDocs[0]) return toResult(textDocs[0], 'description');

  if (protectedAreaName) {
    const nameDocs = await search(`description:"${escapeSolrPhrase(protectedAreaName)}"`, notificationDate, DATE_WINDOW_DAYS);
    if (nameDocs[0]) return toResult(nameDocs[0], 'description');
  }

  if (digits) {
    const fullTextDoc = await findFullTextMatch(digits, notificationDate, protectedAreaName);
    if (fullTextDoc) return toResult(fullTextDoc, 'fulltext');
  }

  return null;
}
