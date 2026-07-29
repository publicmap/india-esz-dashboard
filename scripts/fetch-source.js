// Fetches the MoEF ESZ notifications table and saves the raw table HTML fragment
// used as input to parse-table.js.
//
// The site (moef.gov.in, not www.moef.gov.in -- the www cert doesn't match)
// defaults to Hindi and only serves English after a session cookie is set via
// a POST to /set-locale carrying a CSRF token scraped from the page. There is
// no query-param shortcut, so we do the two-request dance below.

import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const SOURCE_URL = 'https://moef.gov.in/esz-notifications';
const SET_LOCALE_URL = 'https://moef.gov.in/set-locale';
const OUTPUT_PATH = 'data/raw/moef-esz-notifications-table.html';
const USER_AGENT = 'Mozilla/5.0 (compatible; moef-esz-notifications-bot/1.0; +https://github.com/publicmap/moef-esz-notifications)';

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

async function main() {
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

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
