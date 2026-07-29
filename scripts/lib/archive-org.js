// Looks up a MoEF notification's S.O. (order) number in archive.org's
// "gazetteofindia" collection to link to the official scanned Gazette of
// India entry.
//
// The collection's `title` field looks like "Union Government, Extraordinary,
// 2014-01-03, Part II-Section 3-Sub-Section(ii), Ref. S.O. 22(E)". Solr tokenizes
// that field, so a phrase search only needs the "S.O." + digits (punctuation
// like "(E)", and whether the source used "S.O." vs "SO", don't need to match
// exactly) -- but S.O. numbers reset every calendar year, so the same number
// shows up across many years and must be disambiguated by date. Each doc's
// `date` field is matched against the notification's own extracted date
// (exact match only -- a close-but-different date means it's a different,
// unrelated notification that happens to reuse the same S.O. number).
const ADVANCED_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const USER_AGENT = 'moef-esz-notifications-bot/1.0 (https://github.com/publicmap/moef-esz-notifications)';

function extractSoDigits(orderNumber) {
  if (!orderNumber) return null;
  const m = orderNumber.match(/\d+/);
  return m ? m[0] : null;
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

export async function findGazetteArchiveLink(orderNumber, notificationDate) {
  const digits = extractSoDigits(orderNumber);
  if (!digits || !notificationDate) return null;

  const q = `collection:"gazetteofindia" AND title:"S.O. ${digits}"`;
  const url = `${ADVANCED_SEARCH_URL}?q=${encodeURIComponent(q)}`
    + '&fl[]=identifier&fl[]=date&rows=50&output=json';

  const json = await fetchWithRetry(url);
  const docs = json?.response?.docs ?? [];
  const match = docs.find((doc) => typeof doc.date === 'string' && doc.date.slice(0, 10) === notificationDate);
  return match ? `https://archive.org/details/${match.identifier}` : null;
}
