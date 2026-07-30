// Looks up a MoEF notification's S.O. (order) number in archive.org's
// "gazetteofindia" collection to link to the official scanned Gazette of
// India entry.
//
// Every query is scoped to collection:"gazetteofindia", identifier prefix
// "in.gazette.central.e." (the central government's English extraordinary
// gazette -- every notification we've confirmed by hand lives under this
// prefix, and it also keeps state-gazette false positives that happen to
// reuse the same S.O. number out of the results) and an exact `date` match
// (S.O. numbers reset every calendar year, so the same number recurs across
// many years, and a close-but-different date means it's an unrelated
// notification that happens to share it).
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
const ADVANCED_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const IDENTIFIER_PREFIX = 'in.gazette.central.e.*';
const FIELDS = ['identifier', 'date', 'title', 'description', 'creator', 'collection'];
const DESCRIPTION_LABELS = ['Date', 'Type', 'Part Number', 'Reference Number', 'Department', 'Ministry', 'Office', 'Subject', 'Gazette Source', 'Gazette ID'];

function extractSoDigits(orderNumber) {
  if (!orderNumber) return null;
  const m = orderNumber.match(/\d+/);
  return m ? m[0] : null;
}

function escapeSolrPhrase(value) {
  return value.replace(/["\\]/g, '\\$&');
}

async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function search(clause, notificationDate) {
  const q = `collection:"gazetteofindia" AND identifier:${IDENTIFIER_PREFIX} AND date:"${notificationDate}" AND (${clause})`;
  const url = `${ADVANCED_SEARCH_URL}?q=${encodeURIComponent(q)}`
    + FIELDS.map((f) => `&fl[]=${f}`).join('')
    + '&rows=50&output=json';
  const json = await fetchWithRetry(url);
  const docs = json?.response?.docs ?? [];
  // Belt-and-braces re-check: the `date` clause above should already
  // restrict to this exact day, but don't trust Solr's date parsing blindly.
  return docs.filter((doc) => typeof doc.date === 'string' && doc.date.slice(0, 10) === notificationDate);
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
  return textDocs[0] ? toResult(textDocs[0], 'description') : null;
}
