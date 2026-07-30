// Standalone plugin: given a CSV of Wikidata items, suggests a value for a
// chosen property by reading each item's English Wikipedia lead section,
// finding the wikilinks in it, and checking which linked article's own
// Wikidata item is an instance of an expected "target type" (e.g. a wikilink
// to "Telangana" qualifies because Q1517 is an instance of "state of India").
// Not specific to any one property: pass --property/--target-types for
// whatever you're filling in (P131+state-of-India/UT for our missing-`state`
// rows, but equally P17+country, P206+body of water, etc.) via CLI flags --
// nothing about "state" is hardcoded below.
//
// A wikilink match alone is weak evidence (the lead of a wildlife sanctuary
// article mentions plenty of places that aren't its state), so confidence is
// tiered by *where* the matching link sits in the lead, after first narrowing
// to the most specific --target-types tier found anywhere in the lead (see
// below):
//   high   - the very first wikilink in the lead resolves to a matching item
//   medium - some later wikilink resolves to a matching item (still unique)
//   low    - multiple, disagreeing matching items found (ambiguous)
//   none   - no wikilink resolved to a matching item
// Only rows at/above --min-confidence (default: medium) get a `quickstatement`
// value emitted -- 'low'/'none' rows are still surfaced with their suggestion
// so a human can adjudicate manually, but this script never auto-emits a
// statement it isn't reasonably sure of, since these are edits to live
// Wikidata, applied at a human's discretion, not automatically.
//
// Usage:
//   node scripts/plugins/quickstatements-from-wikilinks.js \
//     --input data/wikidata-protected-areas.csv \
//     --output data/wikidata-protected-areas.state-suggestions.csv \
//     --qs-output data/wikidata-protected-areas.state.qs.txt \
//     --property P131 \
//     --property-label state \
//     --target-types Q105626471,Q1149652,Q467745,Q12443800 \
//     --filter-column state
//
// Flags:
//   --input            required. Source CSV.
//   --output           required. Enriched CSV (all input columns + suggestion columns + quickstatement).
//   --property         required. Wikidata property ID to fill in, e.g. P131.
//   --target-types     required. Comma-separated QIDs, ordered from most specific to least
//                       specific (e.g. for P131: subdistrict, district, then union territory/
//                       state -- Q105626471,Q1149652,Q467745,Q12443800). A linked article's
//                       item must be an instance of (transitively, via P31/P279*) one of these,
//                       or itself a transitive subclass (via P279*) of one, to count as a match.
//                       Tiers are tried from most specific to least specific: if the most
//                       specific tier found in the lead has more than one distinct matching
//                       item (ambiguous), the next less-specific tier is tried instead, and so
//                       on -- an unambiguous state match beats an ambiguous district match.
//                       Only if every tier is ambiguous does the most specific tier's ambiguity
//                       get reported (as 'low' confidence). Position in the lead is only used
//                       to break ties/set high-vs-medium confidence within whichever tier wins.
//   --property-label   Column-name prefix for the suggestion columns (default: --property, lowercased).
//   --id-column         Column holding the row's Wikidata QID (default: wikidataId).
//   --wiki-url-column  Column holding the row's enwiki URL (default: enwikiUrl). When empty for a
//                       row, the enwiki title is resolved from the row's Wikidata item's sitelinks.
//   --filter-column    Only process rows where this column is empty (e.g. state, to target only
//                       rows missing that value). Omit to process every row.
//   --min-confidence   none|low|medium|high (default: medium). Minimum tier to emit a quickstatement.
//   --qs-output        Optional path to also write a plain QuickStatements v1 TSV batch
//                       (one `Qid<TAB>Pxxx<TAB>Qvalue<TAB>S143<TAB>Q328` line per confident row,
//                       no header -- the trailing S143/Q328 is a reference recording that the
//                       value was imported from English Wikipedia), ready to paste into
//                       https://quickstatements.toolforge.org/.
//
// Output columns added: `<label>SuggestedQid`, `<label>SuggestedLabel`,
// `<label>Confidence`, `<label>Evidence`, `<label>SuggestedSentence`, `quickstatement`.
// `<label>SuggestedSentence` is the enwiki lead sentence containing the
// wikilink the suggestion was drawn from, included purely so a human doing QA
// can see the actual claim in context without re-opening the article.

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'india-esz-dashboard-quickstatements-plugin/1.0 (https://github.com/publicmap/india-esz-dashboard)';

const BATCH_DELAY_MS = 150;
const CONFIDENCE_ORDER = { none: 0, low: 1, medium: 2, high: 3 };
// English Wikipedia, for the P143 "imported from Wikimedia project" reference
// attached to every emitted statement (every suggestion here is drawn from
// enwiki's lead section, so this is fixed rather than a per-row/CLI value).
const ENWIKI_QID = 'Q328';

// Wikilinks into these namespaces are never the kind of "linked article" we
// want to resolve to a Wikidata item (they're images, categories, etc, not
// the topic itself), so they're dropped before ever hitting the network.
const NAMESPACE_SKIP = new Set([
  'file', 'image', 'category', 'help', 'wikipedia', 'template', 'portal',
  'special', 'media', 'wikt', 'wiktionary', 'commons', 's', 'q', 'b', 'n', 'd', 'g', 'v', 'talk',
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunksOf(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    throw new Error(`Request failed: ${res.status} ${await res.text()} (${url})`);
  }
  throw new Error(`Request failed after retries: ${url}`);
}

// Shared batched-titles helper for the MediaWiki action=query API: resolves
// each input title through both `normalized` (case/whitespace canonicalization)
// and `redirects` so callers get back a page object keyed by what they asked
// for, however many hops away the "real" page title ended up being.
async function mwBatchedTitleQuery(titles, extraParams) {
  const pageByOriginal = new Map();
  const batches = chunksOf(titles, 50);
  for (let i = 0; i < batches.length; i += 1) {
    const params = new URLSearchParams({
      action: 'query', format: 'json', redirects: '1', titles: batches[i].join('|'), ...extraParams,
    });
    const json = await fetchJson(`${WIKIPEDIA_API}?${params}`);
    const pageByTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title, p]));
    const normalized = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redirects = new Map((json.query?.redirects ?? []).map((r) => [r.from, r.to]));
    for (const original of batches[i]) {
      let current = normalized.get(original) ?? original;
      for (let hop = 0; hop < 3 && redirects.has(current); hop += 1) current = redirects.get(current);
      pageByOriginal.set(original, pageByTitle.get(current) ?? null);
    }
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }
  return pageByOriginal;
}

// Strips every {{...}} template transclusion via balanced brace counting --
// a plain regex can't handle templates nesting inside templates (e.g. an
// infobox containing {{convert|...}}), so unlike the other cleanup helpers
// here this has to walk the string. Also drops <ref>...</ref>/<ref .../>,
// which templates can't nest inside so a regex suffices for those.
function stripTemplatesAndRefs(wikitext) {
  const withoutRefs = wikitext
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  let out = '';
  let depth = 0;
  for (let i = 0; i < withoutRefs.length; i += 1) {
    if (withoutRefs[i] === '{' && withoutRefs[i + 1] === '{') {
      depth += 1;
      i += 1;
    } else if (depth > 0 && withoutRefs[i] === '}' && withoutRefs[i + 1] === '}') {
      depth -= 1;
      i += 1;
    } else if (depth === 0) {
      out += withoutRefs[i];
    }
  }
  return out;
}

// The lead section's wikitext starts with an infobox template, which isn't
// part of the visible prose a reader encounters -- wikilinks inside its
// fields (location, map captions, etc) shouldn't count as "wikilinks in the
// lead" for the order-based confidence tiering below, and infobox junk
// shouldn't leak into the QA sentence either, so templates/refs are stripped
// once here rather than by each downstream consumer.
async function fetchLeadWikitexts(titles) {
  const pages = await mwBatchedTitleQuery(titles, {
    prop: 'revisions', rvslots: 'main', rvprop: 'content', rvsection: '0',
  });
  const result = new Map();
  for (const [title, page] of pages) {
    const wikitext = page?.revisions?.[0]?.slots?.main?.['*'] ?? null;
    result.set(title, wikitext != null ? stripTemplatesAndRefs(wikitext) : null);
  }
  return result;
}

async function resolveWikidataQidsForTitles(titles) {
  const pages = await mwBatchedTitleQuery(titles, { prop: 'pageprops', ppprop: 'wikibase_item' });
  const result = new Map();
  for (const [title, page] of pages) result.set(title, page?.pageprops?.wikibase_item ?? null);
  return result;
}

async function resolveEnwikiTitlesForQids(qids) {
  const result = new Map();
  const batches = chunksOf(qids, 50);
  for (let i = 0; i < batches.length; i += 1) {
    const params = new URLSearchParams({
      action: 'wbgetentities', format: 'json', ids: batches[i].join('|'), props: 'sitelinks', sitefilter: 'enwiki',
    });
    const json = await fetchJson(`${WIKIDATA_API}?${params}`);
    for (const [qid, entity] of Object.entries(json.entities ?? {})) {
      result.set(qid, entity?.sitelinks?.enwiki?.title ?? null);
    }
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }
  return result;
}

// One batched SPARQL query rather than one per candidate: VALUES over every
// candidate QID at once, checked against a transitive P31/P279* walk to the
// target types (or, since an item can itself be a class rather than an
// instance -- e.g. a Wikidata item for a whole class of subdivisions -- a
// plain transitive P279* walk too), so this generalizes to type hierarchies
// deeper than a flat P31 without needing per-property special-casing.
//
// `targetTypes` is ordered from most specific to least (e.g. subdistrict,
// district, then state/UT for P131): when a candidate matches more than one
// tier -- which happens for items classified at multiple levels -- only the
// most specific (lowest-index) tier is kept, recorded as `tier` on the result
// so callers can prefer specific matches over broad ones regardless of which
// bound first.
async function fetchTransitiveTypeMatches(qids, targetTypes) {
  const tierByType = new Map(targetTypes.map((qid, tier) => [qid, tier]));
  const result = new Map();
  const batches = chunksOf(qids, 200);
  for (let i = 0; i < batches.length; i += 1) {
    const values = batches[i].map((qid) => `wd:${qid}`).join(' ');
    const types = targetTypes.map((qid) => `wd:${qid}`).join(' ');
    const query = `SELECT ?item ?itemLabel ?matchedType ?matchedTypeLabel WHERE {
      VALUES ?item { ${values} }
      VALUES ?matchedType { ${types} }
      ?item (wdt:P31/wdt:P279*|wdt:P279*) ?matchedType .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
    const json = await fetchJson(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`);
    for (const b of json.results.bindings) {
      const qid = b.item.value.replace('http://www.wikidata.org/entity/', '');
      const matchedType = b.matchedType.value.replace('http://www.wikidata.org/entity/', '');
      const tier = tierByType.get(matchedType);
      if (result.has(qid) && result.get(qid).tier <= tier) continue;
      result.set(qid, {
        label: b.itemLabel?.value ?? qid,
        matchedType,
        matchedTypeLabel: b.matchedTypeLabel?.value ?? matchedType,
        tier,
      });
    }
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }
  return result;
}

// Returns wikilink targets in first-occurrence order, plus the wikitext
// character offset of each title's first occurrence (used later to pull out
// the sentence a chosen link came from). A Map preserves insertion order, so
// no separate position bookkeeping is needed for the order itself. Duplicate
// links to the same title collapse to their first occurrence, since that's
// the one whose position actually informs the confidence tier below.
function extractWikilinksInOrder(wikitext) {
  if (!wikitext) return { titles: [], firstIndexByTitle: new Map() };
  const firstIndexByTitle = new Map();
  const linkPattern = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  let match;
  while ((match = linkPattern.exec(wikitext))) {
    let title = match[1].trim().replace(/^:/, '').replace(/_/g, ' ');
    if (!title) continue;
    const colonIndex = title.indexOf(':');
    if (colonIndex > 0 && NAMESPACE_SKIP.has(title.slice(0, colonIndex).toLowerCase())) continue;
    if (!firstIndexByTitle.has(title)) firstIndexByTitle.set(title, match.index);
  }
  return { titles: [...firstIndexByTitle.keys()], firstIndexByTitle };
}

// Best-effort wikitext -> plain text cleanup for a short snippet (a single
// sentence), not a full wikitext renderer: refs/templates are already gone
// (stripped in fetchLeadWikitexts), so this just handles bold/italic markup
// and turns [[title|display]]/[[title]] links into their display text.
function cleanWikitextSnippet(text) {
  return text
    .replace(/'''''|'''|''/g, '')
    .replace(/\[\[[^\]|#]+(?:#[^\]|]*)?\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Finds the sentence surrounding a given wikitext offset by scanning for
// sentence-ending punctuation, then cleans it up for display. Approximate by
// design (e.g. abbreviations like "U.S." can split early) -- this is a QA aid
// for a human to sanity-check a suggestion against, not a citation engine.
function sentenceContaining(wikitext, index) {
  const sentenceEnd = /[.!?](?=\s|$|[<{[])/g;
  let start = 0;
  let match;
  while ((match = sentenceEnd.exec(wikitext))) {
    const end = match.index + 1;
    if (index < end) return cleanWikitextSnippet(wikitext.slice(start, end));
    start = end;
  }
  return cleanWikitextSnippet(wikitext.slice(start));
}

function enwikiTitleFromUrl(url) {
  const match = String(url ?? '').match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetTypes = String(args['target-types'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const minConfidence = args['min-confidence'] ?? 'medium';

  if (!args.input || !args.output || !args.property || targetTypes.length === 0 || !(minConfidence in CONFIDENCE_ORDER)) {
    console.error(
      'Usage: node quickstatements-from-wikilinks.js --input <csv> --output <csv> --property P131 '
      + '--target-types Q12443800,Q467745 [--property-label state] [--id-column wikidataId] '
      + '[--wiki-url-column enwikiUrl] [--filter-column state] [--min-confidence none|low|medium|high] [--qs-output <path>]',
    );
    process.exitCode = 1;
    return;
  }

  const property = args.property;
  const label = args['property-label'] || property.toLowerCase();
  const idColumn = args['id-column'] || 'wikidataId';
  const wikiUrlColumn = args['wiki-url-column'] || 'enwikiUrl';
  const filterColumn = args['filter-column'] || null;
  const qsOutput = args['qs-output'] || null;

  const rows = parse(await readFile(args.input, 'utf8'), { columns: true, skip_empty_lines: true });
  const toProcess = filterColumn ? rows.filter((r) => !String(r[filterColumn] ?? '').trim()) : rows;
  console.log(`Processing ${toProcess.length} of ${rows.length} rows${filterColumn ? ` (missing "${filterColumn}")` : ''}.`);

  const qidsNeedingTitle = toProcess
    .filter((r) => !enwikiTitleFromUrl(r[wikiUrlColumn]))
    .map((r) => r[idColumn])
    .filter(Boolean);
  const resolvedTitleByQid = qidsNeedingTitle.length
    ? await resolveEnwikiTitlesForQids([...new Set(qidsNeedingTitle)])
    : new Map();

  const rowTitles = toProcess.map((r) => enwikiTitleFromUrl(r[wikiUrlColumn]) ?? resolvedTitleByQid.get(r[idColumn]) ?? null);

  const uniqueTitles = [...new Set(rowTitles.filter(Boolean))];
  console.log(`Fetching lead sections for ${uniqueTitles.length} enwiki articles...`);
  const wikitextByTitle = await fetchLeadWikitexts(uniqueTitles);

  const linksByTitle = new Map(uniqueTitles.map((t) => [t, extractWikilinksInOrder(wikitextByTitle.get(t))]));

  const allLinkedTitles = [...new Set([...linksByTitle.values()].flatMap((info) => info.titles))];
  console.log(`Resolving Wikidata items for ${allLinkedTitles.length} linked articles...`);
  const qidByLinkedTitle = await resolveWikidataQidsForTitles(allLinkedTitles);

  const allCandidateQids = [...new Set([...qidByLinkedTitle.values()].filter(Boolean))];
  console.log(`Checking ${allCandidateQids.length} candidate items against target types [${targetTypes.join(', ')}]...`);
  const typeMatchByQid = await fetchTransitiveTypeMatches(allCandidateQids, targetTypes);
  console.log(`${typeMatchByQid.size} candidate items matched a target type.`);

  const enriched = toProcess.map((row, i) => {
    const title = rowTitles[i];
    const linkInfo = title ? linksByTitle.get(title) : null;
    const links = linkInfo?.titles ?? [];
    const matchingLinks = links
      .map((linkTitle, order) => ({ linkTitle, order, qid: qidByLinkedTitle.get(linkTitle) ?? null }))
      .filter((c) => c.qid && typeMatchByQid.has(c.qid));
    // Try tiers from most specific to least specific (e.g. district before
    // state for P131): the first tier with a single distinct matching item
    // wins outright, even if a more specific tier exists but is itself
    // ambiguous -- an unambiguous state match beats an ambiguous district
    // match. Only if every tier is ambiguous do we fall back to reporting
    // the most specific tier's ambiguity (as before this fallback existed).
    const tiersPresent = [...new Set(matchingLinks.map((c) => typeMatchByQid.get(c.qid).tier))].sort((a, b) => a - b);
    let candidates = [];
    for (const tier of tiersPresent) {
      const atTier = matchingLinks.filter((c) => typeMatchByQid.get(c.qid).tier === tier);
      if (candidates.length === 0) candidates = atTier;
      if (new Set(atTier.map((c) => c.qid)).size === 1) {
        candidates = atTier;
        break;
      }
    }

    let suggestedQid = null;
    let suggestedLabel = null;
    let suggestedSentence = '';
    let confidence = 'none';
    let evidence = !title
      ? 'no enwiki article found for this item'
      : links.length === 0
        ? 'no wikilinks found in the lead section'
        : 'no wikilink in the lead resolved to a matching item';

    if (candidates.length > 0) {
      const chosen = candidates[0];
      const distinctQids = new Set(candidates.map((c) => c.qid));
      const match = typeMatchByQid.get(chosen.qid);
      suggestedQid = chosen.qid;
      suggestedLabel = match.label;
      const chosenIndex = linkInfo.firstIndexByTitle.get(chosen.linkTitle);
      const wikitext = wikitextByTitle.get(title);
      if (wikitext != null && chosenIndex != null) suggestedSentence = sentenceContaining(wikitext, chosenIndex);
      const skippedTiers = tiersPresent.filter((t) => t < match.tier);
      const fallbackPrefix = skippedTiers.length
        ? `more specific tier${skippedTiers.length > 1 ? 's were' : ' was'} ambiguous, falling back to "${match.matchedTypeLabel}"; `
        : '';
      if (distinctQids.size > 1) {
        confidence = 'low';
        const distinctLabelled = [...distinctQids].map((qid) => `"${typeMatchByQid.get(qid).label}" (${qid})`).join(', ');
        evidence = `${fallbackPrefix}ambiguous: lead links to ${distinctQids.size} different matching items (${distinctLabelled}); using the first, "${chosen.linkTitle}" (${chosen.qid})`;
      } else if (chosen.order === 0) {
        confidence = 'high';
        evidence = `${fallbackPrefix}1st wikilink in the lead, "${chosen.linkTitle}" (${chosen.qid}), is an instance of "${match.matchedTypeLabel}" (${match.matchedType})`;
      } else {
        confidence = 'medium';
        evidence = `${fallbackPrefix}wikilink #${chosen.order + 1} in the lead, "${chosen.linkTitle}" (${chosen.qid}), is an instance of "${match.matchedTypeLabel}" (${match.matchedType})`;
      }
    }

    const quickstatement = suggestedQid && CONFIDENCE_ORDER[confidence] >= CONFIDENCE_ORDER[minConfidence]
      ? `${row[idColumn]}\t${property}\t${suggestedQid}\tS143\t${ENWIKI_QID}`
      : '';

    return {
      ...row,
      [`${label}SuggestedQid`]: suggestedQid ?? '',
      [`${label}SuggestedLabel`]: suggestedLabel ?? '',
      [`${label}Confidence`]: confidence,
      [`${label}Evidence`]: evidence,
      [`${label}SuggestedSentence`]: suggestedSentence,
      quickstatement,
    };
  });

  await writeFile(args.output, stringify(enriched, { header: true }), 'utf8');
  console.log(`Wrote ${enriched.length} rows to ${args.output}.`);

  if (qsOutput) {
    const qsLines = enriched.map((r) => r.quickstatement).filter(Boolean);
    await writeFile(qsOutput, qsLines.length ? `${qsLines.join('\n')}\n` : '', 'utf8');
    console.log(`Wrote ${qsLines.length} QuickStatements commands to ${qsOutput}.`);
  }

  const counts = { high: 0, medium: 0, low: 0, none: 0 };
  for (const r of enriched) counts[r[`${label}Confidence`]] += 1;
  console.log('Confidence breakdown:', counts);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
