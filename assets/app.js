// Dashboard logic: loads a single pre-joined data file, computes KPIs,
// renders the MapLibre map + a state-by-state accordion of protected-area
// cards (grouped by type, then by size), and wires up CSV export. No build
// step -- dependencies are loaded as ES modules straight from a CDN.

import { Protocol as PmtilesProtocol } from 'https://cdn.jsdelivr.net/npm/pmtiles@4.4.1/+esm';

const GITHUB_RAW_ATLAS_URL = 'https://raw.githubusercontent.com/publicmap/india-esz-dashboard/main/data/amche-atlas.json';
const AMCHE_ATLAS_BASE = 'https://amche.in/dev/';
const WIKIPEDIA_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const STATUS_COLOR = { final: '#0ca30c', draft: '#fab219', none: '#898781' };

// India-boundary correction, drawn as vector line layers instead of
// india-boundary-corrector's own maplibre-protocol package (which rewrites
// every OSM raster tile through a canvas decode/mask/re-encode pipeline --
// the thing that made the map take ~10s to become usable). The underlying
// PMTiles dataset (published as data.pmtiles.gz, despite that name it is NOT
// gzip-compressed -- it's a plain PMTiles v3 archive) is vector data:
// LineString layers named to-add-<suffix>/to-del-<suffix>. The PMTiles
// library fetches only the byte ranges (tile directory + the handful of
// tiles in view) it needs via HTTP range requests, so this costs a couple of
// small requests instead of a multi-megabyte upfront fetch.
//
// Styling below reproduces (as plain line layers rather than canvas draws)
// the "osm-carto" style published by @india-boundary-corrector/layer-configs
// for this exact basemap (tile.openstreetmap.org): a wide halo in the
// basemap's own boundary-line color erases OSM's line (drawn along the
// to-del-* geometry, at width*delWidthFactor), then the corrected boundary
// is redrawn on top (along to-add-*, at width, dashed) -- international
// border as "osm", state borders as "osm-internal". Dash patterns are our
// own approximation (upstream's dash units are canvas pixels; MapLibre's
// line-dasharray is in multiples of line width, so the numbers don't carry
// over 1:1) of the same dash-dot international / dashed internal look.
const BOUNDARY_CORRECTIONS_PMTILES_URL = 'https://cdn.jsdelivr.net/npm/@india-boundary-corrector/data@0.2.2/india_boundary_corrections.pmtiles.gz';
// Upstream's own "osm-carto" config gates this at startZoom 4 (matching how
// coarse OSM's own raster boundary line is at low zoom); we start at 0
// instead since our map's default view (zoom 3.6, the whole country) would
// otherwise show no correction at all -- verified the PMTiles data actually
// has to-add-osm/to-del-osm features at every zoom from 0 up, so this is a
// visibility choice, not a data availability one.
const BOUNDARY_MIN_ZOOM = 0;
const BOUNDARY_WIDTH_STOPS = [3, 0.7, 4, 1.0, 10, 3.75]; // [zoom, width, zoom, width, ...] at widthFraction 1
const BOUNDARY_LINE_STYLES = [
  { color: 'rgb(200, 180, 200)', layerSuffix: 'osm', widthFraction: 1, delWidthFactor: 1.5 },
  { color: 'rgb(160, 120, 160)', layerSuffix: 'osm', widthFraction: 0.333, dashArray: [3, 1.5, 1, 1.5], delWidthFactor: 0 },
  { color: 'rgb(200, 180, 200)', layerSuffix: 'osm-internal', widthFraction: 0.45, delWidthFactor: 1.5 },
  { color: 'rgb(160, 120, 160)', layerSuffix: 'osm-internal', widthFraction: 0.15, dashArray: [2, 1], delWidthFactor: 1.5 },
];

// Optional overlays sourced from Bharatmaps/Parivesh (via the indianopenmaps
// vector tile mirror maintained by the Datameet community), independent of
// this dashboard's own PA points and notification tracking. Both are shown
// by default and can be toggled off via the map-layer-control checkboxes in
// the map panel.
const BHARATMAPS_ATTRIBUTION = '<a href="https://bharatmaps.gov.in/BharatMaps/Home/Map" target="_blank" rel="noopener">Bharatmaps/Parivesh</a> - Collected by <a href="https://datameet.org" target="_blank" rel="noopener">Datameet Community</a>';

const ESZ_LAYER_URL = 'https://indianopenmaps.fly.dev/not-so-open/forests/esz/parivesh/{z}/{x}/{y}.pbf';
const ESZ_LAYER_SOURCE_LAYER = 'Bharatmaps_Parivesh_Eco_Sensitive_Zones';
const ESZ_LAYER_MAXZOOM = 9;
const ESZ_LAYER_LINE_WIDTH = [
  'interpolate', ['linear'], ['zoom'],
  14, ['case', ['boolean', ['feature-state', 'selected'], false], 4, ['boolean', ['feature-state', 'hover'], false], 3, 1],
  18, ['case', ['boolean', ['feature-state', 'selected'], false], 8, ['boolean', ['feature-state', 'hover'], false], 5, 2],
];

const WILDLIFE_RESERVE_LAYER_URL = 'https://indianopenmaps.fly.dev/not-so-open/forests/wildlife/reserves-and-corridors/parivesh/{z}/{x}/{y}.pbf';
const WILDLIFE_RESERVE_LAYER_SOURCE_LAYER = 'Bharatmaps_Parivesh_Wildlife_Reserves_and_Corridors';
const WILDLIFE_RESERVE_LAYER_MAXZOOM = 10;

// The dashboard's one data dependency: data/full-join.json, built by
// scripts/build-full-join.js. It's a full outer join between the Wikidata
// protected area list and the MoEF ESZ notification records -- one entry per
// protected area (keyed by wikidataId, or by state+name for MoEF records
// MoEF/Wikidata matching couldn't resolve), each with its notification
// history nested and every field the map/popups need already attached. This
// is the only thing fetched over the network to render the accordion and map;
// the per-source CSV/JSON/GeoJSON exports linked from the toolbar are
// downloaded directly from GitHub instead of being loaded by the page.
let paEntries = [];
// Keyed by entry.paKey (== wikidataId when matched, else the state+name
// fallback key) -- used to look up a PA's aggregate status/metadata from a
// card element's data-pa-key or a map feature without re-scanning the full
// entry list.
let entryByPaKey = new Map();
// The subset of paEntries passing the current type/state/search filters --
// the single source of truth the accordion, the map, and CSV export all
// render from.
let filteredEntries = [];
let searchTerm = '';

// Top-down PA-type filter driven by the "Protected areas in India" dropdown --
// applies to the KPIs, the QA unmatched list, the accordion, and the map.
// '' means no filter; UNSPECIFIED_TYPE is a sentinel for entries with no
// protectedAreaType at all.
const UNSPECIFIED_TYPE = '__unspecified__';
let paTypeFilter = '';

function matchesTypeFilter(type) {
  if (!paTypeFilter) return true;
  if (paTypeFilter === UNSPECIFIED_TYPE) return !type;
  return type === paTypeFilter;
}

// Same idea, for the "State" dropdown. Every PA entry carries `state` as an
// array (a handful of Wikidata PAs span multiple states).
const UNSPECIFIED_STATE = '__unspecified__';
let paStateFilter = '';

function matchesStateFilter(state) {
  if (!paStateFilter) return true;
  const list = Array.isArray(state) ? state : [state].filter(Boolean);
  if (paStateFilter === UNSPECIFIED_STATE) return list.length === 0;
  return list.includes(paStateFilter);
}

// Advanced-search document-availability filters -- each keyed off a
// notification's own document links (or, for boundary data, the PA's OSM
// relation), so "missing" surfaces exactly the gaps the doc-link icons in
// the notification history render as disabled/muted.
function entryHasMoefPdf(entry) { return entry.notifications.some((n) => n.notificationPdfLink); }
function entryHasArchivePdf(entry) { return entry.notifications.some((n) => n.notificationArchiveLink); }
function entryHasBoundaryMap(entry) { return entry.notifications.some((n) => n.georeferencingLink); }
function entryHasBoundaryData(entry) { return (entry.osmRelationIds || []).length > 0; }

const DOC_AVAILABILITY_FIELDS = [
  { key: 'moefpdf', selectId: 'doc-filter-moefpdf', check: entryHasMoefPdf },
  { key: 'archivepdf', selectId: 'doc-filter-archivepdf', check: entryHasArchivePdf },
  { key: 'boundarymap', selectId: 'doc-filter-boundarymap', check: entryHasBoundaryMap },
  { key: 'boundarydata', selectId: 'doc-filter-boundarydata', check: entryHasBoundaryData },
];
// Value per field is '' (any), 'available', or 'missing'.
const docAvailabilityFilters = {};

function matchesDocAvailabilityFilters(entry) {
  for (const field of DOC_AVAILABILITY_FIELDS) {
    const want = docAvailabilityFilters[field.key];
    if (!want) continue;
    const has = field.check(entry);
    if (want === 'available' && !has) return false;
    if (want === 'missing' && has) return false;
  }
  return true;
}

async function loadData() {
  const res = await fetch('data/full-join.json');
  paEntries = await res.json();
  entryByPaKey = new Map(paEntries.map((e) => [e.paKey, e]));
}

// The update workflow's cron schedule (.github/workflows/update.yml: '0 3 *
// * 1', every Monday 03:00 UTC) -- used to render the "next update" estimate
// in the source-status bar. Kept in sync with that file by hand since GitHub
// Actions doesn't expose its own schedule to the page at runtime.
const UPDATE_CRON_UTC_WEEKDAY = 1; // Monday
const UPDATE_CRON_UTC_HOUR = 3;

function daysUntilNextScheduledUpdate(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(UPDATE_CRON_UTC_HOUR, 0, 0, 0);
  let daysAhead = (UPDATE_CRON_UTC_WEEKDAY - next.getUTCDay() + 7) % 7;
  if (daysAhead === 0 && next <= now) daysAhead = 7;
  next.setUTCDate(next.getUTCDate() + daysAhead);
  return Math.ceil((next - now) / (24 * 60 * 60 * 1000));
}

function formatDaysAgo(days) {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatDaysAhead(days) {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// Populates the collapsible source-status bar (header) from
// data/source-stats.json, built by scripts/build-source-stats.js. Kept
// independent of loadData/paEntries -- a failure here (e.g. the file hasn't
// been generated yet on a fresh checkout) shouldn't break the rest of the
// dashboard, so main() fires this without awaiting it.
async function initSourceStatus() {
  const textEl = document.getElementById('source-status-text');
  const bodyEl = document.getElementById('source-status-table-body');
  try {
    const res = await fetch('data/source-stats.json');
    const { sources } = await res.json();
    const conflated = sources.find((s) => s.id === 'conflated');
    const upstreamSources = conflated.counts.breakdown; // MoEFCC, Wikidata, Wikipedia, OpenStreetMap

    const mostRecentUpdate = Math.max(...upstreamSources.map((s) => new Date(s.lastUpdated).getTime()));
    const daysAgo = Math.floor((Date.now() - mostRecentUpdate) / (24 * 60 * 60 * 1000));
    const nextUpdateDays = daysUntilNextScheduledUpdate();

    const sourceLinks = upstreamSources
      .map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`)
      .join(', ')
      .replace(/,([^,]*)$/, ' &amp;$1'); // ", D" -> " & D" on the last item
    textEl.innerHTML = `Last updated <strong>${formatDaysAgo(daysAgo)}</strong> from ${sourceLinks}. ` +
      `Next update: <strong>${formatDaysAhead(nextUpdateDays)}</strong>.`;

    const cols = ['total', 'tigerReserve', 'nationalPark', 'wildlifeSanctuary'];

    // Conflated -- the join's final, deduplicated output -- opens collapsed
    // with a caret in its first cell; clicking it reveals the four upstream
    // sources it was built from as nested sub-rows.
    const conflatedRowHtml = `
      <tr class="source-status-derived source-status-toggle" id="source-status-conflated-toggle"
          role="button" tabindex="0" aria-expanded="false"
          aria-controls="${upstreamSources.map((s) => `source-status-child-${s.id}`).join(' ')}">
        <td><svg class="source-status-row-caret" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"
              fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" /></svg>${escapeHtml(conflated.label)}</td>
        ${cols.map((c) => `<td>${conflated.counts[c].toLocaleString()}</td>`).join('')}
      </tr>`;
    const upstreamRowHtml = (s) => `
      <tr class="source-status-subrow source-status-conflated-child" id="source-status-child-${s.id}" hidden>
        <td><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></td>
        ${cols.map((c) => `<td>${s.counts[c].toLocaleString()}</td>`).join('')}
      </tr>`;

    // Final/Draft/No-notification each get a "(n%)" share of the Conflated
    // total in that column -- the three rows partition it exactly, so their
    // percentages always add up to 100%.
    const finalEsz = sources.find((s) => s.id === 'final-esz');
    const draftEsz = sources.find((s) => s.id === 'draft-esz');
    const noNotification = sources.find((s) => s.id === 'no-notification');
    const pctCell = (count, total) => {
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `${count.toLocaleString()} <small>(${pct}%)</small>`;
    };
    // Same dot-badge classes (.dot-final/.dot-draft/.dot-none) used for ESZ
    // status everywhere else on the dashboard -- the accordion cards, the
    // notification history, and the map popups -- so this row label reads as
    // the same status, not a separate color scheme.
    const STATUS_DOT_CLASS = { 'final-esz': 'dot-final', 'draft-esz': 'dot-draft', 'no-notification': 'dot-none' };
    const statusRowHtml = (s, highlight) => `
      <tr class="${highlight ? 'source-status-highlight' : ''}">
        <td><span class="status-pill"><i class="dot ${STATUS_DOT_CLASS[s.id]}" aria-hidden="true"></i>${escapeHtml(s.label)}</span></td>
        ${cols.map((c) => `<td>${pctCell(s.counts[c], conflated.counts[c])}</td>`).join('')}
      </tr>`;

    bodyEl.innerHTML = conflatedRowHtml
      + upstreamSources.map(upstreamRowHtml).join('')
      + statusRowHtml(finalEsz, true)
      + statusRowHtml(draftEsz)
      + statusRowHtml(noNotification);

    // Same instant as "Last updated" above (the most recently changed
    // upstream source), just spelled out as a calendar date.
    document.getElementById('source-status-generated').textContent = `Generated on ${new Date(mostRecentUpdate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    const toggle = document.getElementById('source-status-conflated-toggle');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      document.querySelectorAll('.source-status-conflated-child').forEach((row) => { row.hidden = expanded; });
    });
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    });
  } catch (err) {
    console.error('Failed to load data/source-stats.json:', err);
    textEl.textContent = 'Data source status unavailable.';
  }
}

// Flattens PA entries into one row per notification record (for PAs with no
// notifications at all, a single synthetic "not notified" row) -- the shape
// the CSV export has always worked with.
function flattenEntriesToRows(entries) {
  const rows = [];
  for (const entry of entries) {
    if (entry.notifications.length === 0) {
      rows.push({
        wikidataId: entry.wikidataId,
        protectedAreaName: entry.name,
        protectedAreaType: entry.protectedAreaType,
        state: stateAsString(entry.state),
        notificationStatus: null,
        notificationDate: null,
        orderNumber: null,
        notificationPdfLink: null,
        notificationArchiveLink: null,
        moefSNo: null,
      });
      continue;
    }
    for (const n of entry.notifications) {
      rows.push({ ...n, wikidataId: entry.wikidataId });
    }
  }
  return rows;
}

// Full-text search across a PA's name/state/type and its notifications'
// order numbers -- the entry-based equivalent of the old flat table's
// per-row search filter.
function matchesSearch(entry) {
  if (!searchTerm) return true;
  const orderNumbers = entry.notifications.map((n) => n.orderNumber || '').join(' ');
  const haystack = `${entry.name || ''} ${stateAsString(entry.state)} ${entry.protectedAreaType || ''} ${orderNumbers}`.toLowerCase();
  return haystack.includes(searchTerm);
}

function computeFilteredEntries() {
  return paEntries.filter((entry) => matchesTypeFilter(entry.protectedAreaType)
    && matchesStateFilter(entry.state) && matchesSearch(entry) && matchesDocAvailabilityFilters(entry));
}

// Hero stat categories for the header banner. "Sanctuaries" combines
// Wildlife and Bird sanctuaries, since MoEF/Wikidata track them as separate
// protectedAreaType values but the hero treats them as one headline figure.
const HERO_STAT_GROUPS = [
  { key: 'tiger', label: 'Tiger Reserves', match: (type) => type === 'Tiger Reserve' },
  { key: 'np', label: 'National Parks', match: (type) => type === 'National Park' },
  { key: 'sanctuary', label: 'Sanctuaries', match: (type) => type === 'Wildlife Sanctuary' || type === 'Bird Sanctuary' },
];

// Per-state/UT rollup: a state counts as "fully notified" only once every
// protected area with a foothold there (entry.state can list more than one)
// has a final or draft ESZ -- a stricter, more legible headline than the
// nationwide per-PA percentage, since a state can't hide a handful of
// stragglers behind a large notified majority. Also tracks, per state, the
// latest notification date among its notified PAs -- the date the state's
// own completion (or current progress) was last updated -- for the KPI
// modal's detail list.
function computeStateNotificationDetails() {
  const byState = new Map();
  for (const entry of paEntries) {
    for (const state of entry.state) {
      if (!state) continue;
      const rec = byState.get(state) || {
        state, total: 0, final: 0, notified: 0,
        latestDate: null, latestOrderNumber: null, latestPdfLink: null, latestArchiveLink: null,
      };
      rec.total += 1;
      if (entry.eszStatus === 'final') rec.final += 1;
      if (entry.eszStatus === 'final' || entry.eszStatus === 'draft') {
        rec.notified += 1;
        const latest = entry.latest;
        const d = latest && latest.date;
        if (d && (!rec.latestDate || d > rec.latestDate)) {
          rec.latestDate = d;
          rec.latestOrderNumber = latest.orderNumber || null;
          rec.latestPdfLink = latest.pdfLink || null;
          rec.latestArchiveLink = latest.archiveLink || null;
        }
      }
      byState.set(state, rec);
    }
  }
  const rows = [...byState.values()].map((rec) => ({
    ...rec,
    pct: rec.total ? (rec.notified / rec.total) * 100 : 0,
    // "completed": every PA notified, final or draft. "allFinal": the
    // stricter subset of completed states where every one of those
    // notifications has actually reached Final (no drafts left).
    completed: rec.total > 0 && rec.notified === rec.total,
    allFinal: rec.total > 0 && rec.final === rec.total,
  }));
  // Completed states first (earliest completion year on top), then
  // in-progress states by how close they are to completion, then states with
  // no notifications at all, alphabetically within each group.
  rows.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.completed) return (a.latestDate || '').localeCompare(b.latestDate || '');
    if (b.pct !== a.pct) return b.pct - a.pct;
    return a.state.localeCompare(b.state);
  });
  return rows;
}

// Four mutually-informative headline counts for the states/UTs KPI modal:
// allFinal and completed are nested (every allFinal state is also
// completed), while inProgress/notStarted partition the remainder, so all
// four together explain how `completed` breaks down.
function summarizeStateRows(rows) {
  const allFinal = rows.filter((r) => r.allFinal).length;
  const completed = rows.filter((r) => r.completed).length;
  const inProgress = rows.filter((r) => !r.completed && r.notified > 0).length;
  const notStarted = rows.filter((r) => r.notified === 0).length;
  return { total: rows.length, allFinal, completed, inProgress, notStarted };
}

// Hero stats are a fixed nationwide headline -- always computed from the
// full unfiltered dataset, not the type/state dropdowns.
function renderHeroStats() {
  const setTile = (key, counts, unitLabel) => {
    const notified = counts.final + counts.draft;
    const pct = counts.total ? (notified / counts.total) * 100 : 0;
    document.getElementById(`hero-stat-${key}-value`).textContent = `${pct.toFixed(0)}%`;
    document.getElementById(`hero-stat-${key}-note`).textContent =
      `${notified.toLocaleString()} of ${counts.total.toLocaleString()} ${unitLabel} notified`;
    document.getElementById(`hero-stat-${key}-bar`).style.width = `${pct}%`;
  };

  const stateRows = computeStateNotificationDetails();
  const totalStates = stateRows.length;
  const fullyNotified = stateRows.filter((r) => r.completed).length;
  const statePct = totalStates ? (fullyNotified / totalStates) * 100 : 0;
  document.getElementById('hero-stat-overall-value').textContent = `${statePct.toFixed(0)}%`;
  document.getElementById('hero-stat-overall-note').textContent =
    `${fullyNotified.toLocaleString()} of ${totalStates.toLocaleString()} states/UTs fully notified`;
  document.getElementById('hero-stat-overall-bar').style.width = `${statePct}%`;

  for (const group of HERO_STAT_GROUPS) {
    const entries = paEntries.filter((entry) => group.match(entry.protectedAreaType));
    setTile(group.key, statusCounts(entries), group.label);
  }
}

// ---------------------------------------------------------------------------
// Hero KPI detail modal: each of the four hero-stat tiles opens a larger,
// single-page breakdown of the number behind it. Content is (re)built from
// the live paEntries on every open, so it always reflects the current
// (unfiltered) nationwide dataset the hero tiles themselves summarize.

// Renders a notification's order number (the "S.O. ..." gazette reference)
// as a link to its PDF where one is known -- falls back to the archive.org
// scan if there's no direct MoEF PDF link, or plain text if neither exists.
function orderNumberLinkHtml(latest) {
  if (!latest || !latest.orderNumber) return '–';
  const label = escapeHtml(latest.orderNumber);
  const href = latest.pdfLink || latest.archiveLink;
  return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>` : label;
}

function kpiPctBarCellHtml(pct) {
  return `<span class="kpi-table-pct-cell">${pct.toFixed(0)}%
    <span class="kpi-table-pct-bar"><span class="kpi-table-pct-fill" style="width:${pct}%"></span></span>
  </span>`;
}

// Body for the primary "States/UTs completed" tile: every state/UT the join
// touches, sorted completed-first (earliest completion year on top), then by
// how close the rest are to completion -- each row showing the year it was
// completed in, or the date of its most recent notification otherwise.
// Static explainer -- condensed from README.md's "About Eco-Sensitive Zones"
// section -- shown at the top of the states/UTs KPI modal so a first-time
// reader has context for what "ESZ notification" means before diving into
// the state-by-state breakdown.
// The 2006 Supreme Court order (see timeline below) gave States/UTs 4 weeks
// from this date to submit ESZ proposals; that deadline lapsed on 1 Jan 2007
// and, per the PIB note above, has never been met nationwide since.
const ESZ_PROPOSAL_DEADLINE = new Date('2007-01-01T00:00:00Z');
const ESZ_DEADLINE_DAYS_OVERDUE = Math.floor((Date.now() - ESZ_PROPOSAL_DEADLINE.getTime()) / 86400000);

const ESZ_INTRO_HTML = `
  <details class="kpi-intro">
    <summary>About Eco-Sensitive Zones (ESZs)</summary>
    <p class="section-intro">
      ESZs are designated buffer areas around protected habitats like national parks and wildlife
      sanctuaries. They act as shock absorbers to minimize human impact on fragile ecosystems,
      typically spanning up to 10 kilometers, though boundaries remain site-specific. Declaring an
      ESZ creates a transition zone -- regulating and managing activities around a protected area --
      from areas of high protection to areas of lesser protection.
    </p>
    <div class="kpi-intro-media">
      <div class="kpi-intro-image-col">
        <a class="kpi-intro-image-link" href="assets/img/pib-moefcc-note.png" target="_blank" rel="noopener">
          <img class="kpi-intro-image" src="assets/img/pib-moefcc-note.png"
            alt="ESZ notification status of protected areas in India, PIB/MoEFCC note" loading="lazy" />
        </a>
        <div class="kpi-intro-day-counter">
          <strong>${ESZ_DEADLINE_DAYS_OVERDUE.toLocaleString()}</strong> days overdue
          <span>since the Supreme Court's 4th December, 2006 order requiring States/UTs to submit ESZ
            proposals within 4 weeks &mdash; a deadline that lapsed on 1st January, 2007</span>
        </div>
      </div>
      <ol class="kpi-timeline">
        <li><strong>1970</strong> &mdash; The Indian Board for Wildlife (IBWL) is created as an advisory body to
          provide guidance on issues relating to the protection and conservation of wildlife and their habitats.</li>
        <li><strong>2002</strong> &mdash; The 21st IBWL meeting adopts the
          <a href="https://moef.gov.in/uploads/2018/03/WILDLIFE%20CONSERVATION%20STRATEGY%202002.pdf"
          target="_blank" rel="noopener">Wildlife Conservation Strategy 2002</a>, chaired by Shri Atal Bihari
          Vajpayee, then Prime Minister of India, which proposed notifying 10km buffer zones of eco-fragile zones
          around protected areas where mining and polluting industries would be prohibited.</li>
        <li><strong>2003</strong> &mdash; The National Board for Wildlife (NBWL) is constituted as a statutory
          body to replace the IBWL.</li>
        <li><strong>2004</strong> &mdash; The <a href="http://goafoundation.org" target="_blank" rel="noopener">Goa
          Foundation</a> filed a landmark case
          (<a href="https://indiankanoon.org/doc/81576067/" target="_blank" rel="noopener">PIL Writ Petition 460/2004</a>)
          in the Supreme Court for clarification regarding iron ore mining within 10km of protected areas in Goa.</li>
        <li><strong>2006</strong> &mdash; Supreme Court directs all States/UTs to define ESZs within 4 weeks,
          failing which a <a href="https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=126299&amp;reg=48&amp;lang=2"
          target="_blank" rel="noopener">10km ESZ will apply as default</a>.</li>
        <li><strong>2011</strong> &mdash; MoEFCC publishes
          <a href="https://cpc.parivesh.nic.in/writereaddata/Guidelines_for_EcoSensitive_Zones_around_Protected_Areas.pdf"
          target="_blank" rel="noopener">guidelines for declaration of ESZs</a>, outlining the
          procedure States/UTs must follow to demarcate and notify one.</li>
        <li><strong>2012</strong> &mdash; Citing lack of progress on ESZ identification, the Central Empowered
          Committee
          <a href="https://hash-cookies.s3.amazonaws.com/CEC%20buffer%20zones%20report%2020.9.2012.pdf"
          target="_blank" rel="noopener">recommends a safety zone of 100m&ndash;2000m</a> in the interim based on
          protected area size.</li>
        <li><strong>2022</strong> &mdash; Supreme Court
          <a href="https://api.sci.gov.in/supremecourt/1995/2997/2997_1995_5_1501_36130_Order_03-Jun-2022.pdf"
          target="_blank" rel="noopener">mandates a minimum 1km ESZ</a> around all protected areas.</li>
        <li><strong>2023</strong> &mdash; Supreme Court
          <a href="https://api.sci.gov.in/supremecourt/1995/2997/2997_1995_8_1501_43924_Judgement_26-Apr-2023.pdf"
          target="_blank" rel="noopener">dilutes the 1km minimum ESZ</a> from its 2022 order to be protected-area
          specific, citing uniform minimums as impossible to implement.</li>
        <li><strong>2023</strong> &mdash; MoEFCC releases
          <a href="https://cdnbbsr.s3waas.gov.in/s3fa5f68379610ec97bf9b19dfeb19d910/uploads/2025/09/202509051613268164.pdf"
          target="_blank" rel="noopener">updated guidelines for seeking recommendations of the Standing Committee
          of NBWL</a> for activities in protected areas and ESZs.</li>
        <li><strong>2025</strong> &mdash; IGNFA publishes a
          <a href="https://www.ignfa.gov.in/publications/an-evaluative-discusion-esz-paper.pdf" target="_blank"
          rel="noopener">discussion paper on ESZ</a> advocating for a risk-based approach to ESZ declaration.</li>
      </ol>
    </div>
    <p class="kpi-intro-source">Source: <a href="https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=126299&amp;reg=48&amp;lang=2"
      target="_blank" rel="noopener">PIB, Ministry of Environment Forests &amp; Climate Change, Government of India</a>,
      <a href="https://en.wikipedia.org/wiki/Eco-Sensitive_Zone" target="_blank" rel="noopener">Wikipedia</a>.</p>
  </details>`;

// Bucket keys double as the data-bucket-<kebab> attribute name each table
// row carries (see renderStateKpiModalBody) -- clicking a tile filters the
// table to rows whose matching attribute is "true" (see initKpiStateBucketFilter).
const STATE_BUCKETS = [
  { key: 'allFinal', attr: 'bucketAllFinal', variant: 'stat-tile-final', label: '100% Final notification', note: 'Every PA has a Final ESZ' },
  { key: 'completed', attr: 'bucketCompleted', variant: 'stat-tile-draft', label: '100% Final + Draft', note: 'Every PA notified (Final or Draft)' },
  { key: 'inProgress', attr: 'bucketInProgress', variant: '', label: 'In progress', note: 'Some, but not all, PAs notified' },
  { key: 'notStarted', attr: 'bucketNotStarted', variant: 'stat-tile-none', label: '0% progress', note: 'No PA notified yet' },
];

function renderStateSummaryTilesHtml(rows) {
  const s = summarizeStateRows(rows);
  const valueByKey = { allFinal: s.allFinal, completed: s.completed, inProgress: s.inProgress, notStarted: s.notStarted };
  const tiles = STATE_BUCKETS.map(({ key, variant, label, note }) => `
    <button type="button" class="stat-tile ${variant}" data-bucket="${key}"
      title="Click to filter the table below to these states/UTs; click again to clear">
      <span class="stat-value">${valueByKey[key].toLocaleString()}</span>
      <span class="stat-label">${label}</span>
      <span class="stat-note">${note}</span>
    </button>`).join('');
  return `<div class="stat-tile-row kpi-summary-tiles" id="kpi-summary-tiles">${tiles}</div>
    <p class="kpi-filter-status" id="kpi-filter-status" hidden></p>`;
}

// Wires the four summary tiles as a toggleable filter over the state table
// rows below them -- clicking a tile hides every row not in that bucket;
// clicking the same tile again (or the "Clear filter" button it reveals)
// restores the full list.
function initKpiStateBucketFilter() {
  const tilesWrap = document.getElementById('kpi-summary-tiles');
  const tbody = document.getElementById('kpi-state-tbody');
  const statusEl = document.getElementById('kpi-filter-status');
  if (!tilesWrap || !tbody || !statusEl) return;
  let activeBucket = null;

  function applyFilter() {
    const bucket = STATE_BUCKETS.find((b) => b.key === activeBucket);
    let visible = 0;
    tbody.querySelectorAll('tr').forEach((tr) => {
      const show = !bucket || tr.dataset[bucket.attr] === 'true';
      tr.hidden = !show;
      if (show) visible += 1;
    });
    tilesWrap.querySelectorAll('.stat-tile').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.bucket === activeBucket);
    });
    if (bucket) {
      statusEl.hidden = false;
      statusEl.innerHTML = `Showing <strong>${visible}</strong> state${visible === 1 ? '' : 's'}/UT${visible === 1 ? '' : 's'}
        matching &ldquo;${escapeHtml(bucket.label)}&rdquo;. <button type="button" id="kpi-filter-clear">Clear filter</button>`;
      document.getElementById('kpi-filter-clear').addEventListener('click', () => { activeBucket = null; applyFilter(); });
    } else {
      statusEl.hidden = true;
      statusEl.innerHTML = '';
    }
  }

  tilesWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.stat-tile[data-bucket]');
    if (!btn) return;
    activeBucket = activeBucket === btn.dataset.bucket ? null : btn.dataset.bucket;
    applyFilter();
  });
}

function renderStateKpiModalBody(rows) {
  const completedCount = rows.filter((r) => r.completed).length;
  const summary = `
    <div class="kpi-modal-summary">
      <span><strong>${completedCount}</strong> of ${rows.length} states/UTs fully notified</span>
    </div>`;
  const body = rows.map((r, i) => {
    const statusClass = r.completed ? 'dot-final' : r.notified ? 'dot-draft' : 'dot-none';
    const statusLabel = r.completed ? 'Completed' : r.notified ? 'In progress' : 'Not started';
    const yearOrDate = r.completed
      ? `Completed ${r.latestDate ? escapeHtml(r.latestDate.slice(0, 4)) : ''}`
      : r.latestDate
        ? `Latest notification ${escapeHtml(formatNotificationDate(r.latestDate))}`
        : 'No notifications yet';
    const orderLink = orderNumberLinkHtml({
      orderNumber: r.latestOrderNumber, pdfLink: r.latestPdfLink, archiveLink: r.latestArchiveLink,
    });
    const dateCell = r.latestOrderNumber ? `${yearOrDate} &middot; ${orderLink}` : yearOrDate;
    const inProgress = !r.completed && r.notified > 0;
    const notStarted = r.notified === 0;
    return `<tr data-bucket-all-final="${r.allFinal}" data-bucket-completed="${r.completed}"
        data-bucket-in-progress="${inProgress}" data-bucket-not-started="${notStarted}">
      <td class="kpi-table-rank">${i + 1}</td>
      <td>${escapeHtml(r.state)}</td>
      <td><span class="status-pill"><i class="dot ${statusClass}" aria-hidden="true"></i>${statusLabel}</span></td>
      <td>${kpiPctBarCellHtml(r.pct)}</td>
      <td>${r.notified.toLocaleString()} / ${r.total.toLocaleString()}</td>
      <td>${dateCell}</td>
    </tr>`;
  }).join('');
  return `${renderStateSummaryTilesHtml(rows)}
    ${summary}
    <div class="kpi-table-wrap">
      <table class="kpi-table">
        <thead><tr>
          <th>#</th><th>State / UT</th><th>Status</th><th>Progress</th><th>PAs notified</th><th>Completion / latest notification</th>
        </tr></thead>
        <tbody id="kpi-state-tbody">${body}</tbody>
      </table>
    </div>`;
}

// Body for the three PA-group tiles (Tiger Reserves, National Parks,
// Sanctuaries): every PA in the group, sorted Final ahead of Draft ahead of
// Not notified, most recent notification first within each status.
function renderPaGroupKpiModalBody(entries, unitLabel) {
  const counts = statusCounts(entries);
  const statusRank = { final: 0, draft: 1, none: 2 };
  const sorted = [...entries].sort((a, b) => {
    const rankDiff = statusRank[a.eszStatus] - statusRank[b.eszStatus];
    if (rankDiff !== 0) return rankDiff;
    const da = (a.latest && a.latest.date) || '';
    const db = (b.latest && b.latest.date) || '';
    if (da !== db) return db.localeCompare(da);
    return (a.name || '').localeCompare(b.name || '');
  });
  const summary = `
    <div class="kpi-modal-summary">
      <span><strong>${counts.final.toLocaleString()}</strong> final</span>
      <span><strong>${counts.draft.toLocaleString()}</strong> draft</span>
      <span><strong>${counts.none.toLocaleString()}</strong> not notified</span>
      <span>${counts.total.toLocaleString()} ${unitLabel} total</span>
    </div>`;
  const body = sorted.map((entry) => `<tr>
      <td>${paTitleLinksHtml(entry)}</td>
      <td>${escapeHtml(stateAsString(entry.state))}</td>
      <td><span class="status-pill"><i class="dot dot-${entry.eszStatus}" aria-hidden="true"></i>${eszStatusLabel(entry.eszStatus)}</span></td>
      <td>${entry.latest ? escapeHtml(formatNotificationDate(entry.latest.date)) : '–'}</td>
      <td>${orderNumberLinkHtml(entry.latest)}</td>
    </tr>`).join('');
  return `${summary}
    <div class="kpi-table-wrap">
      <table class="kpi-table">
        <thead><tr>
          <th>Protected area</th><th>State</th><th>Status</th><th>Notification date</th><th>Order no.</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// One builder per hero-stat tile (keyed by its data-kpi attribute) -- each
// returns the modal header text plus body HTML, computed fresh from
// paEntries at open time.
const KPI_MODAL_BUILDERS = {
  overall() {
    const rows = computeStateNotificationDetails();
    return {
      kicker: 'Nationwide progress',
      title: 'States & UTs By Final ESZ Notification',
      subtitle: 'A state/UT counts as complete only once every protected area with a foothold there has a final or draft ESZ notification.',
      body: renderStateKpiModalBody(rows),
    };
  },
  tiger() {
    const entries = paEntries.filter((e) => HERO_STAT_GROUPS.find((g) => g.key === 'tiger').match(e.protectedAreaType));
    return {
      kicker: 'ESZ notification status',
      title: 'Tiger Reserves',
      subtitle: 'Every tiger reserve tracked in this dashboard, with its current ESZ notification status.',
      body: renderPaGroupKpiModalBody(entries, 'tiger reserves'),
    };
  },
  np() {
    const entries = paEntries.filter((e) => HERO_STAT_GROUPS.find((g) => g.key === 'np').match(e.protectedAreaType));
    return {
      kicker: 'ESZ notification status',
      title: 'National Parks',
      subtitle: 'Every national park tracked in this dashboard, with its current ESZ notification status.',
      body: renderPaGroupKpiModalBody(entries, 'national parks'),
    };
  },
  sanctuary() {
    const entries = paEntries.filter((e) => HERO_STAT_GROUPS.find((g) => g.key === 'sanctuary').match(e.protectedAreaType));
    return {
      kicker: 'ESZ notification status',
      title: 'Sanctuaries',
      subtitle: 'Wildlife and bird sanctuaries tracked in this dashboard, with their current ESZ notification status.',
      body: renderPaGroupKpiModalBody(entries, 'sanctuaries'),
    };
  },
};

function openKpiModal(key) {
  const builder = KPI_MODAL_BUILDERS[key];
  if (!builder) return;
  const { kicker, title, subtitle, body } = builder();
  document.getElementById('kpi-modal-kicker').textContent = kicker;
  document.getElementById('kpi-modal-title').textContent = title;
  document.getElementById('kpi-modal-subtitle').textContent = subtitle;
  document.getElementById('kpi-modal-body').innerHTML = body;
  if (key === 'overall') initKpiStateBucketFilter();

  const overlay = document.getElementById('kpi-modal-overlay');
  overlay.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  document.getElementById('kpi-modal-close').focus();
}

function closeKpiModal() {
  const overlay = document.getElementById('kpi-modal-overlay');
  if (overlay.hidden) return;
  overlay.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  setTimeout(() => { overlay.hidden = true; }, 180);
}

function initHeroStatModals() {
  document.querySelectorAll('.hero-stat[data-kpi]').forEach((el) => {
    el.addEventListener('click', () => openKpiModal(el.dataset.kpi));
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openKpiModal(el.dataset.kpi);
    });
  });
  document.getElementById('kpi-modal-close').addEventListener('click', closeKpiModal);
  document.getElementById('kpi-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'kpi-modal-overlay') closeKpiModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeKpiModal();
  });
}

// PA entries with no wikidataId -- the MoEF-side of the full join that
// Wikidata doesn't know about yet.
function computeUnmatchedMoefPAs() {
  return paEntries
    .filter((entry) => !entry.wikidataId)
    .filter((entry) => matchesTypeFilter(entry.protectedAreaType))
    .filter((entry) => matchesStateFilter(entry.state))
    .map((entry) => ({
      source: 'moef',
      paKey: entry.paKey,
      state: entry.state[0] || '',
      name: entry.name,
      type: entry.protectedAreaType,
      recordCount: entry.notifications.length,
      statuses: [...new Set(entry.notifications.map((n) => n.notificationStatus).filter(Boolean))],
    }));
}

// Wikidata-matched PA entries with no MoEF notification joined to them -- the
// other side of the same unmatched join, so a spelling/wording mismatch shows
// up as one row from each side instead of just the MoEF one. When
// hideMatchedWikidataQids is on (the default), a Wikidata item that already
// has a MoEF notification joined to it is left out -- normally correct,
// since it isn't "unmatched". But occasionally that join is the wrong one
// (the right MoEF row for this QID matched somewhere else, or not at all),
// which hides the very QID you'd need to copy for a different row -- so the
// toggle lets that be shown too.
function computeUnmatchedWikidataPAs() {
  return paEntries
    .filter((entry) => entry.wikidataId)
    .filter((entry) => !hideMatchedWikidataQids || entry.notifications.length === 0)
    .filter((entry) => matchesTypeFilter(entry.protectedAreaType))
    .filter((entry) => matchesStateFilter(entry.state))
    .map((entry) => ({
      source: 'wikidata',
      paKey: entry.paKey,
      state: stateAsString(entry.state),
      name: entry.name,
      type: entry.protectedAreaType,
      wikidataId: entry.wikidataId,
      wikidataUrl: entry.wikidataUrl,
      matchedRecordCount: entry.notifications.length,
    }));
}

// Combines both unmatched lists and sorts by state then name so a MoEF/Wikidata
// pair describing the same real-world place tends to land next to each other,
// making it easy to scan (or copy) for consolidation into corrections.csv.
function computeCombinedUnjoined() {
  return [...computeUnmatchedMoefPAs(), ...computeUnmatchedWikidataPAs()]
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || (a.name || '').localeCompare(b.name || ''));
}

function moefReferenceText(pa) {
  return `${pa.recordCount} record${pa.recordCount === 1 ? '' : 's'}${pa.statuses.length ? ` (${[...pa.statuses].sort().join(', ')})` : ''}`;
}

function wikidataUnmatchedRowHtml(pa) {
  const isCopied = matchClipboard && matchClipboard.paKey === pa.paKey;
  const alreadyMatchedBadge = pa.matchedRecordCount > 0
    ? `<span class="qa-already-matched-badge">already matched to ${pa.matchedRecordCount} record${pa.matchedRecordCount === 1 ? '' : 's'} elsewhere</span>`
    : '';
  return `
    <tr class="qa-row qa-row-wikidata${isCopied ? ' is-copied' : ''}">
      <td>Wikidata</td>
      <td>${escapeHtml(pa.state || '')}</td>
      <td>
        <span class="qa-name">${escapeHtml(pa.name || '')}</span>
        <button type="button" class="btn btn-xs copy-wikidata-name-btn" data-pa-key="${escapeHtml(pa.paKey)}">${isCopied ? 'Copied' : 'Copy name'}</button>
        ${alreadyMatchedBadge}
      </td>
      <td>${escapeHtml(pa.type || '')}</td>
      <td><a href="${pa.wikidataUrl}" target="_blank" rel="noopener">${escapeHtml(pa.wikidataId)}</a></td>
    </tr>`;
}

function moefUnmatchedRowHtml(pa) {
  const match = pendingMatches.get(pa.paKey);
  const nameCell = match
    ? `<span class="qa-match-rename">${escapeHtml(pa.name || '')} &rarr; ${escapeHtml(match.wikidataName)}</span>
       <span class="qa-match-banner">Matched to <a href="${match.wikidataUrl}" target="_blank" rel="noopener">[${escapeHtml(match.wikidataId)}]</a> &middot; <button type="button" class="link-btn remove-match-btn" data-pa-key="${escapeHtml(pa.paKey)}">remove</button></span>`
    : `<span class="qa-name">${escapeHtml(pa.name || '')}</span>
       <button type="button" class="btn btn-xs paste-match-btn" data-pa-key="${escapeHtml(pa.paKey)}" ${matchClipboard ? '' : 'disabled'}>Paste match</button>`;
  const sourceCell = uiMode === 'create'
    ? `<label class="qa-select-label"><input type="checkbox" class="create-select-checkbox" data-pa-key="${escapeHtml(pa.paKey)}" ${pendingCreates.has(pa.paKey) ? 'checked' : ''}> MoEF</label>`
    : 'MoEF';
  return `
    <tr class="qa-row qa-row-moef${match ? ' qa-row-matched' : ''}">
      <td>${sourceCell}</td>
      <td>${escapeHtml(pa.state || '')}</td>
      <td>${nameCell}</td>
      <td>${escapeHtml(pa.type || '')}</td>
      <td>${escapeHtml(moefReferenceText(pa))}</td>
    </tr>`;
}

function unmatchedRowHtml(pa) {
  return pa.source === 'wikidata' ? wikidataUnmatchedRowHtml(pa) : moefUnmatchedRowHtml(pa);
}

// Plain-text, tab-separated rendering of the combined unjoined list -- meant
// to be pasted straight into an LLM chat (or a spreadsheet) to work out
// MoEF/Wikidata pairs for data/corrections.csv.
function combinedUnjoinedText(items) {
  const header = ['Source', 'State', 'Protected area (as parsed)', 'Type', 'Reference'].join('\t');
  const lines = items.map((pa) => {
    const reference = pa.source === 'wikidata' ? pa.wikidataId : moefReferenceText(pa);
    return [pa.source === 'wikidata' ? 'Wikidata' : 'MoEF', pa.state || '', pa.name || '', pa.type || '', reference].join('\t');
  });
  return [header, ...lines].join('\n');
}

let combinedUnjoinedCache = [];

// 'match' pairs a MoEF row with an existing Wikidata row (building "add
// alias" QuickStatements); 'create' selects MoEF rows that need a brand new
// Wikidata item (building "CREATE" QuickStatements).
let uiMode = 'match';
// The Wikidata row most recently copied, awaiting a "Paste match" click:
// { paKey, name, wikidataId, wikidataUrl }.
let matchClipboard = null;
// See computeUnmatchedWikidataPAs -- on by default so the list only shows
// genuinely unmatched Wikidata items; toggled off to surface QIDs that got
// joined to the wrong (or a different) MoEF row.
let hideMatchedWikidataQids = true;
// moefPaKey -> { wikidataId, wikidataUrl, wikidataName } for confirmed matches.
const pendingMatches = new Map();
// moefPaKeys ticked in create mode.
const pendingCreates = new Set();
// Live text filter over the QA table only -- narrows what's rendered, not
// combinedUnjoinedCache itself, so copy-list/quickstatements still cover
// every pending match regardless of what's currently filtered into view.
let qaSearchTerm = '';

// QIDs for the PA type categories this dashboard uses -- pulled from the
// curated allowlist in scripts/enrich-wikidata.js (the types actually seen
// among Indian protected areas on Wikidata), not guessed.
const PA_TYPE_WIKIDATA_QID = {
  'Tiger Reserve': 'Q5533772',
  'National Park': 'Q46169',
  'Bird Sanctuary': 'Q2714144',
  'Wildlife Sanctuary': 'Q1377575',
};
const INDIA_WIKIDATA_QID = 'Q668';

function quickstatementsValueEscape(value) {
  return String(value || '').replace(/[\t\n]/g, ' ').replace(/"/g, '\\"');
}

// One "add alias" line per pending match -- the MoEF-side name becomes a
// matchable alias on the paired Wikidata item.
function quickstatementsAliasLines() {
  const lines = [];
  for (const [paKey, match] of pendingMatches) {
    const moefItem = combinedUnjoinedCache.find((x) => x.paKey === paKey && x.source === 'moef');
    if (!moefItem) continue;
    lines.push(`${match.wikidataId}\tAen\t"${quickstatementsValueEscape(moefItem.name)}"`);
  }
  return lines;
}

// One CREATE block per selected MoEF row: label + instance-of (when the type
// maps to a known QID) + country. Location (P131) is deliberately left out --
// this dashboard doesn't carry a verified state-name -> QID table, so that
// still needs a human to add after creation.
function quickstatementsCreateLines() {
  const lines = [];
  for (const paKey of pendingCreates) {
    const moefItem = combinedUnjoinedCache.find((x) => x.paKey === paKey && x.source === 'moef');
    if (!moefItem) continue;
    lines.push('CREATE');
    lines.push(`LAST\tLen\t"${quickstatementsValueEscape(moefItem.name)}"`);
    const typeQid = PA_TYPE_WIKIDATA_QID[moefItem.type];
    if (typeQid) lines.push(`LAST\tP31\t${typeQid}`);
    lines.push(`LAST\tP17\t${INDIA_WIKIDATA_QID}`);
  }
  return lines;
}

function renderQuickstatementsOutput() {
  const box = document.getElementById('qa-quickstatements-output');
  const countEl = document.getElementById('qa-quickstatements-count');
  if (uiMode === 'create') {
    box.value = quickstatementsCreateLines().join('\n');
    countEl.textContent = pendingCreates.size
      ? `${pendingCreates.size} item${pendingCreates.size === 1 ? '' : 's'} selected — add location (P131) manually after creation`
      : '';
    box.placeholder = 'Tick MoEF rows with no Wikidata item at all to build create statements.';
  } else {
    box.value = quickstatementsAliasLines().join('\n');
    countEl.textContent = pendingMatches.size
      ? `${pendingMatches.size} pending match${pendingMatches.size === 1 ? '' : 'es'}`
      : '';
    box.placeholder = 'Copy a Wikidata name, then paste it into a MoEF row to build a match.';
  }
}

function matchesQaSearch(pa) {
  if (!qaSearchTerm) return true;
  return (pa.name || '').toLowerCase().includes(qaSearchTerm);
}

function renderQaTableBody() {
  const rows = combinedUnjoinedCache.filter(matchesQaSearch);
  document.getElementById('qa-table-body').innerHTML = rows.map(unmatchedRowHtml).join('');
  document.getElementById('qa-result-count').textContent = qaSearchTerm
    ? `${rows.length.toLocaleString()} of ${combinedUnjoinedCache.length.toLocaleString()}`
    : '';
}

function renderQaList() {
  combinedUnjoinedCache = computeCombinedUnjoined();
  document.getElementById('qa-count').textContent = combinedUnjoinedCache.length.toLocaleString();
  renderQaTableBody();
  renderQuickstatementsOutput();
}

function setUiMode(mode) {
  uiMode = mode;
  matchClipboard = null;
  document.getElementById('qa-mode-match').classList.toggle('is-active', mode === 'match');
  document.getElementById('qa-mode-create').classList.toggle('is-active', mode === 'create');
  renderQaTableBody();
  renderQuickstatementsOutput();
}

function initQaModeToggle() {
  document.getElementById('qa-mode-match').addEventListener('click', () => setUiMode('match'));
  document.getElementById('qa-mode-create').addEventListener('click', () => setUiMode('create'));
}

function initQaSearch() {
  const input = document.getElementById('qa-name-search');
  input.addEventListener('input', () => {
    qaSearchTerm = input.value.trim().toLowerCase();
    renderQaTableBody();
  });
}

function initHideMatchedToggle() {
  const checkbox = document.getElementById('qa-hide-matched-toggle');
  checkbox.checked = hideMatchedWikidataQids;
  checkbox.addEventListener('change', () => {
    hideMatchedWikidataQids = checkbox.checked;
    renderQaList();
  });
}

// Delegated so it keeps working across renderQaTableBody() re-renders.
function initQaTableInteractions() {
  const tbody = document.getElementById('qa-table-body');
  tbody.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-wikidata-name-btn');
    if (copyBtn) {
      const paKey = copyBtn.dataset.paKey;
      const item = combinedUnjoinedCache.find((x) => x.paKey === paKey && x.source === 'wikidata');
      if (item) matchClipboard = { paKey: item.paKey, name: item.name, wikidataId: item.wikidataId, wikidataUrl: item.wikidataUrl };
      renderQaTableBody();
      return;
    }
    const pasteBtn = e.target.closest('.paste-match-btn');
    if (pasteBtn && matchClipboard) {
      const paKey = pasteBtn.dataset.paKey;
      pendingMatches.set(paKey, { wikidataId: matchClipboard.wikidataId, wikidataUrl: matchClipboard.wikidataUrl, wikidataName: matchClipboard.name });
      matchClipboard = null;
      renderQaTableBody();
      renderQuickstatementsOutput();
      return;
    }
    const removeBtn = e.target.closest('.remove-match-btn');
    if (removeBtn) {
      pendingMatches.delete(removeBtn.dataset.paKey);
      renderQaTableBody();
      renderQuickstatementsOutput();
    }
  });
  tbody.addEventListener('change', (e) => {
    const checkbox = e.target.closest('.create-select-checkbox');
    if (!checkbox) return;
    if (checkbox.checked) pendingCreates.add(checkbox.dataset.paKey);
    else pendingCreates.delete(checkbox.dataset.paKey);
    renderQuickstatementsOutput();
  });
}

async function copyTextToButton(button, text) {
  const defaultLabel = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
  } catch {
    button.textContent = 'Copy failed';
  }
  setTimeout(() => { button.textContent = defaultLabel; }, 1500);
}

function initCopyQaList() {
  const button = document.getElementById('copy-qa-list');
  button.addEventListener('click', () => copyTextToButton(button, combinedUnjoinedText(combinedUnjoinedCache)));
}

function initCopyQaQuickstatements() {
  const button = document.getElementById('copy-qa-quickstatements');
  button.addEventListener('click', () => copyTextToButton(button, document.getElementById('qa-quickstatements-output').value));
}

// Wikidata-matched PA entries with no coordinate -- these can't be placed on
// the map even though they're counted in the KPIs and listed in the accordion.
function computeNoCoordinatePAs() {
  return paEntries
    .filter((entry) => entry.wikidataId && entry.coordinateLatitude == null)
    .filter((entry) => matchesTypeFilter(entry.protectedAreaType))
    .filter((entry) => matchesStateFilter(entry.state))
    .sort((a, b) => {
      const s = stateAsString(a.state).localeCompare(stateAsString(b.state));
      if (s) return s;
      return (a.name || '').localeCompare(b.name || '');
    });
}

function noCoordRowHtml(entry) {
  return `
    <tr>
      <td>${escapeHtml(stateAsString(entry.state))}</td>
      <td>${escapeHtml(entry.name || '')}</td>
      <td>${escapeHtml(entry.protectedAreaType || '')}</td>
      <td><a href="${entry.wikidataUrl}" target="_blank" rel="noopener">Edit on Wikidata</a></td>
    </tr>`;
}

function renderNoCoordList() {
  const noCoordPAs = computeNoCoordinatePAs();
  document.getElementById('nocoord-count').textContent = noCoordPAs.length.toLocaleString();
  document.getElementById('nocoord-table-body').innerHTML = noCoordPAs.map(noCoordRowHtml).join('');
}

function initAtlasLink() {
  const url = `${AMCHE_ATLAS_BASE}?atlas=${encodeURIComponent(GITHUB_RAW_ATLAS_URL)}`;
  document.getElementById('open-atlas-link').href = url;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Builds the popup markup for a map marker -- just the PA name and its
// latest ESZ status. Full detail (images, excerpt, links, notification
// history) now lives in that PA's card in the accordion below; clicking a
// marker opens (and scrolls to) that card via revealCard.
function buildPopupHtml(p) {
  const dotClass = p.eszStatus === 'final' ? 'dot-final' : p.eszStatus === 'draft' ? 'dot-draft' : 'dot-none';
  const statusLabel = p.notificationStatus || 'Not notified';
  return `
    <p class="popup-title">${escapeHtml(p.name || '')}</p>
    <p class="popup-row status-pill"><i class="dot ${dotClass}" aria-hidden="true"></i>${escapeHtml(statusLabel)}</p>
  `;
}

function openPopupForFeature(feature) {
  showPopup(feature.geometry.coordinates, buildPopupHtml(feature.properties));
}

let activePopup = null;
let selectedWikidataId = null;
const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-hover-popup', offset: 10, anchor: 'bottom' });

function closePopup() {
  if (activePopup) { activePopup.remove(); activePopup = null; }
}

function clearSelection() {
  selectedWikidataId = null;
  highlightCard(null);
}

function showPopup(coordinates, html) {
  closePopup();
  // focusAfterOpen defaults to true, which calls .focus() on the popup DOM
  // node -- the browser then scrolls that (possibly off-screen) node into
  // view. Harmless for a click, but this popup also opens on every PA-row
  // *hover* (onCardHoverEnter), so left at its default it yanked the page's
  // scroll position around on every row the mouse crossed.
  activePopup = new maplibregl.Popup({ maxWidth: '300px', focusAfterOpen: false }).setLngLat(coordinates).setHTML(html).addTo(map);
  // Closing the popup (via its "x" button, or being replaced/removed
  // programmatically) is what ends a selection -- keep the two in sync.
  activePopup.on('close', clearSelection);
}

// Pans/flies the map to a PA feature. Pass `zoom` to fly in (card click);
// omit it to just re-center at the current zoom (card hover).
function focusFeature(feature, { zoom } = {}) {
  const center = feature.geometry.coordinates;
  if (zoom != null) map.flyTo({ center, zoom, essential: true });
  else map.panTo(center, { duration: 300 });
}

// Highlights every card for a given PA (a handful of multi-state PAs get one
// card per state) -- the accordion equivalent of the old table's selected-row
// styling.
function highlightCard(paKey) {
  document.querySelectorAll('#pa-accordion .pa-card.is-selected').forEach((el) => el.classList.remove('is-selected'));
  if (!paKey) return;
  for (const el of document.querySelectorAll('#pa-accordion .pa-card')) {
    if (el.dataset.paKey === paKey) el.classList.add('is-selected');
  }
}

let map;
function initMap() {
  maplibregl.addProtocol('pmtiles', new PmtilesProtocol().tile);

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [82, 22],
    zoom: 3.6,
  });
  window.__debugMap = map; // TEMP-DEBUG-HOOK: remove before commit
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    addBoundaryCorrectionLayers();
    addEszLayer();
    addWildlifeReserveLayer();
    map.addSource('protected-areas', { type: 'geojson', data: allFeatureCollection() });
    map.addLayer({
      id: 'protected-areas-circles',
      type: 'circle',
      source: 'protected-areas',
      paint: {
        'circle-color': [
          'match', ['get', 'eszStatus'],
          'final', STATUS_COLOR.final,
          'draft', STATUS_COLOR.draft,
          STATUS_COLOR.none,
        ],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 8, 6, 12, 10],
        'circle-stroke-color': '#111827',
        'circle-stroke-width': 0.5,
        'circle-opacity': 0.9,
      },
    });

    map.on('click', 'protected-areas-circles', (e) => {
      const f = e.features[0];
      openPopupForFeature(f);
      selectedWikidataId = f.properties.wikidataId;
      highlightCard(selectedWikidataId);
      revealCard(selectedWikidataId);
    });
    map.on('mouseenter', 'protected-areas-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'protected-areas-circles', () => {
      map.getCanvas().style.cursor = '';
      hoverPopup.remove();
    });
    map.on('mousemove', 'protected-areas-circles', (e) => {
      const f = e.features[0];
      hoverPopup.setLngLat(f.geometry.coordinates).setHTML(escapeHtml(f.properties.name || '')).addTo(map);
    });
    // Clicking empty map background clears the current selection.
    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['protected-areas-circles'] });
      if (hit.length === 0) closePopup();
    });
  });
}

function boundaryWidthExpression(multiplier) {
  const expr = ['interpolate', ['linear'], ['zoom']];
  for (let i = 0; i < BOUNDARY_WIDTH_STOPS.length; i += 2) {
    expr.push(BOUNDARY_WIDTH_STOPS[i], BOUNDARY_WIDTH_STOPS[i + 1] * multiplier);
  }
  return expr;
}

// Adds the corrected India boundary as vector line layers (see the styling
// constants above), sourced straight from the india-boundary-corrector
// PMTiles dataset via the `pmtiles://` protocol -- no raster tile rewriting.
function addBoundaryCorrectionLayers() {
  map.addSource('india-boundary-corrections', {
    type: 'vector',
    url: `pmtiles://${BOUNDARY_CORRECTIONS_PMTILES_URL}`,
  });

  let n = 0;
  for (const style of BOUNDARY_LINE_STYLES) {
    if (style.delWidthFactor > 0) {
      map.addLayer({
        id: `ibc-del-${n++}`,
        type: 'line',
        source: 'india-boundary-corrections',
        'source-layer': `to-del-${style.layerSuffix}`,
        minzoom: BOUNDARY_MIN_ZOOM,
        paint: {
          'line-color': style.color,
          'line-width': boundaryWidthExpression(style.widthFraction * style.delWidthFactor),
        },
      });
    }
    map.addLayer({
      id: `ibc-add-${n++}`,
      type: 'line',
      source: 'india-boundary-corrections',
      'source-layer': `to-add-${style.layerSuffix}`,
      minzoom: BOUNDARY_MIN_ZOOM,
      paint: {
        'line-color': style.color,
        'line-width': boundaryWidthExpression(style.widthFraction),
        ...(style.dashArray ? { 'line-dasharray': style.dashArray } : {}),
      },
    });
  }
}

// Adds the Eco-Sensitive Zone overlay as a fill + outline layer pair, shown
// by default -- hidden when the map-layer-control checkbox is unchecked.
function addEszLayer() {
  map.addSource('india-esz', {
    type: 'vector',
    tiles: [ESZ_LAYER_URL],
    maxzoom: ESZ_LAYER_MAXZOOM,
    attribution: BHARATMAPS_ATTRIBUTION,
  });
  map.addLayer({
    id: 'india-esz-fill',
    type: 'fill',
    source: 'india-esz',
    'source-layer': ESZ_LAYER_SOURCE_LAYER,
    paint: { 'fill-color': 'green', 'fill-opacity': 0.2 },
  });
  map.addLayer({
    id: 'india-esz-line',
    type: 'line',
    source: 'india-esz',
    'source-layer': ESZ_LAYER_SOURCE_LAYER,
    paint: { 'line-color': '#006400', 'line-width': ESZ_LAYER_LINE_WIDTH },
  });
}

function setEszLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  if (map.getLayer('india-esz-fill')) map.setLayoutProperty('india-esz-fill', 'visibility', visibility);
  if (map.getLayer('india-esz-line')) map.setLayoutProperty('india-esz-line', 'visibility', visibility);
}

function initEszLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-esz');
  checkbox.addEventListener('change', () => setEszLayerVisibility(checkbox.checked));
}

// Adds the Wildlife Reserves & Corridors overlay (national parks, wildlife
// sanctuaries, tiger conservation corridors) as a single fill layer -- the
// upstream style spec's line-width is 0, so no separate outline layer is
// drawn. Shown by default, same toggle pattern as the ESZ layer above.
function addWildlifeReserveLayer() {
  map.addSource('india-wildlife-reserve', {
    type: 'vector',
    tiles: [WILDLIFE_RESERVE_LAYER_URL],
    maxzoom: WILDLIFE_RESERVE_LAYER_MAXZOOM,
    attribution: BHARATMAPS_ATTRIBUTION,
  });
  map.addLayer({
    id: 'india-wildlife-reserve-fill',
    type: 'fill',
    source: 'india-wildlife-reserve',
    'source-layer': WILDLIFE_RESERVE_LAYER_SOURCE_LAYER,
    paint: { 'fill-color': 'green', 'fill-opacity': 0.5 },
  });
}

function setWildlifeReserveLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  if (map.getLayer('india-wildlife-reserve-fill')) map.setLayoutProperty('india-wildlife-reserve-fill', 'visibility', visibility);
}

function initWildlifeReserveLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-wildlife-reserve');
  checkbox.addEventListener('change', () => setWildlifeReserveLayerVisibility(checkbox.checked));
}

function setPaPointsLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  if (map.getLayer('protected-areas-circles')) map.setLayoutProperty('protected-areas-circles', 'visibility', visibility);
}

function initPaPointsLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-pa-points');
  checkbox.addEventListener('change', () => setPaPointsLayerVisibility(checkbox.checked));
}

// Builds a GeoJSON point feature straight from a PA entry's already-joined
// fields -- the map never needs to look anything up in a separate payload.
function entryToFeature(entry) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [entry.coordinateLongitude, entry.coordinateLatitude] },
    properties: {
      wikidataId: entry.wikidataId,
      wikidataUrl: entry.wikidataUrl,
      name: entry.name,
      protectedAreaType: entry.protectedAreaType,
      state: entry.state[0] || null,
      iucnCategory: entry.iucnCategory,
      area: entry.area,
      pageBanner: entry.pageBanner,
      image: entry.image,
      osmRelationIds: entry.osmRelationIds,
      enwikiUrl: entry.enwikiUrl,
      eszStatus: entry.eszStatus,
      notificationCount: entry.notifications.length,
      notificationStatus: entry.latest ? entry.latest.status : null,
      notificationDate: entry.latest ? entry.latest.date : null,
      orderNumber: entry.latest ? entry.latest.orderNumber : null,
      notificationPdfLink: entry.latest ? entry.latest.pdfLink : null,
      notificationArchiveLink: entry.latest ? entry.latest.archiveLink : null,
    },
  };
}

// Every mappable PA entry, unfiltered -- used as the map source's initial
// data before the accordion (and its filters) has finished building.
function allFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: paEntries.filter((entry) => entry.coordinateLatitude != null).map(entryToFeature),
  };
}

function filteredFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: filteredEntries.filter((entry) => entry.coordinateLatitude != null).map(entryToFeature),
  };
}

let fitBoundsTimer = null;

// Keeps the map markers in sync with the accordion's active filters, closing
// any selection the filter drops and flying to fit the remaining markers.
// The fit is debounced so typing in the search box doesn't fly the map on
// every keystroke.
function updateMapFilter() {
  if (!map || !map.getSource('protected-areas')) return;
  const collection = filteredFeatureCollection();
  map.getSource('protected-areas').setData(collection);

  if (selectedWikidataId && !collection.features.some((f) => f.properties.wikidataId === selectedWikidataId)) {
    closePopup();
  }

  clearTimeout(fitBoundsTimer);
  if (!collection.features.length) return;
  fitBoundsTimer = setTimeout(() => {
    const bounds = new maplibregl.LngLatBounds();
    for (const f of collection.features) bounds.extend(f.geometry.coordinates);
    map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 500 });
  }, 250);
}

// Alphabetical by state/type/PA name so groups render in a stable, scannable
// order; within a PA, Final rows sort ahead of Draft rows (most recent first).
// Notification records carry `state` as a single string; synthetic
// no-notification rows carry it as an array -- normalize to a
// sortable/searchable string either way.
function stateAsString(state) {
  return Array.isArray(state) ? state.join(', ') : (state || '');
}

// ---------------------------------------------------------------------------
// State accordion: groups filteredEntries by state -> PA type, each type's
// PAs sorted by descending area, and renders it as an expandable list of PA
// cards. Each state's body HTML is only (re)built while that state is open,
// so filtering doesn't have to materialize ~800 cards' worth of DOM on every
// keystroke.

const UNSPECIFIED_STATE_LABEL = 'Unspecified state';

function statusCounts(entries) {
  let final = 0, draft = 0, none = 0;
  for (const e of entries) {
    if (e.eszStatus === 'final') final += 1;
    else if (e.eszStatus === 'draft') draft += 1;
    else none += 1;
  }
  return { final, draft, none, total: entries.length };
}

// Groups by protectedAreaType, sorted with a fixed type order (see
// PA_TYPE_ORDER below) and "Unspecified type" last.
function groupByType(entries) {
  const types = new Map();
  for (const entry of entries) {
    const type = entry.protectedAreaType || 'Unspecified type';
    const list = types.get(type) || [];
    list.push(entry);
    types.set(type, list);
  }
  return types;
}

// Display order for type groups within a state -- reserve/park types before
// sanctuaries, rather than alphabetical (which would put Bird before Tiger).
const PA_TYPE_ORDER = ['Tiger Reserve', 'National Park', 'Bird Sanctuary', 'Wildlife Sanctuary'];

function sortTypeNames(typeMap) {
  return [...typeMap.keys()].sort((a, b) => {
    if (a === 'Unspecified type') return b === 'Unspecified type' ? 0 : 1;
    if (b === 'Unspecified type') return -1;
    const ai = PA_TYPE_ORDER.indexOf(a);
    const bi = PA_TYPE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Areas with an unknown size sort last, regardless of direction.
function sortEntriesByAreaDesc(entries) {
  return [...entries].sort((a, b) => {
    if (a.area == null && b.area == null) return (a.name || '').localeCompare(b.name || '');
    if (a.area == null) return 1;
    if (b.area == null) return -1;
    return b.area - a.area;
  });
}

// A PA spanning multiple states (a handful in the dataset) gets one card
// under each of its states, same as it always got one map marker regardless.
function buildStateGroups(entries) {
  const states = new Map();
  for (const entry of entries) {
    const stateList = entry.state.length ? entry.state : [UNSPECIFIED_STATE_LABEL];
    for (const state of stateList) {
      const list = states.get(state) || [];
      list.push(entry);
      states.set(state, list);
    }
  }
  return states;
}

function sortStateNames(states) {
  return [...states.keys()].sort((a, b) => {
    if (a === UNSPECIFIED_STATE_LABEL) return b === UNSPECIFIED_STATE_LABEL ? 0 : 1;
    if (b === UNSPECIFIED_STATE_LABEL) return -1;
    return a.localeCompare(b);
  });
}

function chipBarHtml(counts) {
  const pct = (n) => (counts.total ? (n / counts.total) * 100 : 0);
  return `
    <span class="chip-bar">
      <i class="chip-bar-seg chip-bar-final" style="width:${pct(counts.final)}%"></i>
      <i class="chip-bar-seg chip-bar-draft" style="width:${pct(counts.draft)}%"></i>
      <i class="chip-bar-seg chip-bar-none" style="width:${pct(counts.none)}%"></i>
    </span>`;
}

function progressPct(counts) {
  return counts.total ? Math.round((counts.final / counts.total) * 100) : 0;
}

// "N% ESZ notified" -- the collapsed state row's combined progress, with no
// status breakdown (that only shows once a type group is expanded, see
// progressMetaHtml below).
function progressPctHtml(counts) {
  return `${progressPct(counts)}% ESZ notified`;
}

// "N% ESZ notified · X Final, Y Draft, Z Unknown" -- used by each expanded
// type group's progress.
function progressMetaHtml(counts) {
  return `${progressPct(counts)}% ESZ notified &middot; ${counts.final} Final, ${counts.draft} Draft, ${counts.none} Unknown`;
}

function stateHeaderHtml(stateName, entries) {
  const isOpen = openStates.has(stateName);
  const counts = statusCounts(entries);
  return `
    <button type="button" class="state-row-header" data-state="${escapeHtml(stateName)}" aria-expanded="${isOpen}">
      <span class="state-row-chevron" aria-hidden="true">&#9656;</span>
      <span class="state-row-name">${escapeHtml(stateName)}</span>
      <span class="state-row-count">${entries.length} protected area${entries.length === 1 ? '' : 's'}</span>
      <span class="state-row-progress">
        <span class="state-row-progress-meta">${progressPctHtml(counts)}</span>
        ${chipBarHtml(counts)}
      </span>
    </button>`;
}

// Icon + subtle accent colour per protected-area type, so type groups within
// an expanded state read at a glance instead of as identical grey sections.
// "modifier" drives the .pa-type-group--<modifier> background tint in CSS.
const PA_TYPE_META = {
  'Tiger Reserve': {
    modifier: 'tiger',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="15.5" rx="5.2" ry="4.3"/><ellipse cx="5.6" cy="9.5" rx="1.9" ry="2.5" transform="rotate(-18 5.6 9.5)"/><ellipse cx="10.2" cy="6.2" rx="2" ry="2.7" transform="rotate(-6 10.2 6.2)"/><ellipse cx="14.8" cy="6.2" rx="2" ry="2.7" transform="rotate(6 14.8 6.2)"/><ellipse cx="18.4" cy="9.5" rx="1.9" ry="2.5" transform="rotate(18 18.4 9.5)"/></svg>`,
  },
  'National Park': {
    modifier: 'np',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 19l6.5-10 4 6 2-3L21 19H2z"/><circle cx="17" cy="6" r="2"/></svg>`,
  },
  'Bird Sanctuary': {
    modifier: 'bird-sanctuary',
    icon: `<svg viewBox="0 0 32 14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M1 8C5 -2 12 -2 16 6 20 -2 27 -2 31 8"/></svg>`,
  },
  'Wildlife Sanctuary': {
    modifier: 'wildlife-sanctuary',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c0-9 5-15 15-16-1 10-7 15-16 16z"/><path d="M6 18c3-4 7-7 12-9"/></svg>`,
  },
};
const PA_TYPE_META_DEFAULT = {
  modifier: 'other',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
};

function paTypeMeta(type) {
  return PA_TYPE_META[type] || PA_TYPE_META_DEFAULT;
}

// Card thumbnails are small (~40px) but there can be hundreds on screen at
// once, so requesting Commons' full-resolution originals for all of them
// gets the burst rate-limited (429) by Wikimedia. Commons' Special:FilePath
// endpoint can render a downscaled thumbnail itself via a `width` param --
// ask for that instead of the original.
function commonsThumbnailUrl(url, width) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikimedia\.org$/.test(u.hostname) || !u.pathname.includes('Special:FilePath')) return url;
    u.searchParams.set('width', String(width));
    return u.toString();
  } catch {
    return url;
  }
}

// Clicking a wiki-sourced thumbnail should land on the Commons/Wikipedia file
// description page (which has attribution/license info), not the raw image
// file -- so translate Special:FilePath and upload.wikimedia.org URLs into
// their corresponding File: page.
function commonsFilePageUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikimedia\.org$/.test(u.hostname) && !/(^|\.)wikipedia\.org$/.test(u.hostname)) return url;
    const fpMatch = u.pathname.match(/Special:FilePath\/(.+)$/);
    if (fpMatch) return `https://commons.wikimedia.org/wiki/File:${decodeURIComponent(fpMatch[1])}`;
    const upMatch = u.pathname.match(/\/wikipedia\/([^/]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?$/);
    if (upMatch) {
      const [, project, filename] = upMatch;
      const host = project === 'commons' ? 'commons.wikimedia.org' : `${project}.wikipedia.org`;
      return `https://${host}/wiki/File:${decodeURIComponent(filename)}`;
    }
    return url;
  } catch {
    return url;
  }
}

// Wikipedia's summary API instead returns already-thumbnailed upload.wikimedia.org
// URLs (.../thumb/x/xx/Name.ext/300px-Name.ext) rather than Special:FilePath links,
// so resizing means swapping the "NNNpx-" segment for our own width.
function wikimediaThumbUrl(url, width) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikimedia\.org$/.test(u.hostname)) return url;
    const m = u.pathname.match(/^(.*\/thumb\/.*\/)\d+px-([^/]+)$/);
    if (!m) return commonsThumbnailUrl(url, width);
    u.pathname = `${m[1]}${width}px-${m[2]}`;
    return u.toString();
  } catch {
    return url;
  }
}

function eszStatusLabel(status) {
  return status === 'final' ? 'Final' : status === 'draft' ? 'Draft' : 'Not notified';
}

function cardCompactInnerHtml(entry) {
  const thumb = commonsThumbnailUrl(entry.pageBanner || entry.image, 140);
  const initial = (entry.protectedAreaType || entry.name || '?').charAt(0);
  return `
    <div class="pa-card-thumb">
      ${thumb ? `<img src="${thumb}" alt="" loading="lazy" />` : `<span class="pa-card-thumb-placeholder" aria-hidden="true">${escapeHtml(initial)}</span>`}
    </div>
    <div class="pa-card-body">
      <span class="pa-card-name">${escapeHtml(entry.name || '')}</span>
      <span class="pa-card-right">
        ${entry.area ? `<span class="pa-card-area">${entry.area.toLocaleString()} km&sup2;</span>` : ''}
        <span class="pa-card-status status-pill"><i class="dot dot-${entry.eszStatus}" aria-hidden="true"></i>${eszStatusLabel(entry.eszStatus)}</span>
      </span>
    </div>`;
}

function cardOuterHtml(entry) {
  return `
    <div class="pa-card" data-pa-key="${escapeHtml(entry.paKey)}" tabindex="0" role="button" aria-expanded="false" title="${escapeHtml(entry.name || '')}">
      ${cardCompactInnerHtml(entry)}
    </div>`;
}

const NOTIFICATION_TYPE_LABEL = {
  Final: 'Final ESZ Notification',
  Draft: 'Draft ESZ Notification',
  Amendment: 'Amendment To Final ESZ Notification',
};
const NOTIFICATION_DOT_CLASS = { Final: 'dot-final', Amendment: 'dot-final', Draft: 'dot-draft' };

const DOC_ICON = {
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 16.5h6M9 9.5h2"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4.2" rx="1"/><path d="M4.5 8.2V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8.2"/><path d="M10 12.5h4"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5 3.5 6.7v13L9 17.5l6 2.2 5.5-2.2v-13L15 6.7l-6-2.2z"/><path d="M9 4.5v13M15 6.7v13"/><circle cx="12" cy="11.5" r="1.6"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 3 8.2l9 4.7 9-4.7-9-4.7z"/><path d="M3 12.2l9 4.7 9-4.7"/><path d="M3 16.2l9 4.7 9-4.7"/></svg>',
};

// Simplified marks for Wikidata (three data bars) and OpenStreetMap (pin in
// a circle) -- monoline, single-color renditions matching DOC_ICON's style
// rather than the full-color trademarked logos.
const WIKIDATA_LOGO = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="5" height="9"/><rect x="9.5" y="4" width="5" height="15"/><rect x="17" y="7" width="5" height="12"/></svg>';
const OSM_LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.3"/><path d="M12 6.7c-2.1 0-3.7 1.6-3.7 3.6 0 2.7 3.7 6.4 3.7 6.4s3.7-3.7 3.7-6.4c0-2-1.6-3.6-3.7-3.6z" fill="currentColor" stroke="none"/></svg>';

// Guessed Wikipedia URL for a PA with no confirmed enwikiUrl -- same
// space-to-underscore convention Wikipedia itself uses for page titles, so
// the link at least lands on the right page if one exists under this exact
// name, and otherwise on Wikipedia's own "create this page" prompt.
function guessedWikipediaUrl(name) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent((name || '').trim().replace(/\s+/g, '_'))}`;
}

// Protected area title linked to its Wikipedia page -- styled as a Wikipedia
// "redlink" (class pa-title-link-new) when we have no confirmed enwikiUrl,
// same as Wikipedia does for an article that doesn't exist yet -- plus small
// Wikidata/OSM logo links when this PA has a matching item/relation.
function paTitleLinksHtml(entry) {
  const name = escapeHtml(entry.name || '');
  const hasWikipedia = !!entry.enwikiUrl;
  const wikiHref = entry.enwikiUrl || guessedWikipediaUrl(entry.name);
  const titleLink = `<a class="pa-title-link${hasWikipedia ? '' : ' pa-title-link-new'}" href="${wikiHref}" target="_blank" rel="noopener">${name}</a>`;
  const badges = [];
  if (entry.wikidataUrl) {
    badges.push(`<a class="pa-title-logo pa-title-logo-wikidata" href="${entry.wikidataUrl}" target="_blank" rel="noopener" title="View on Wikidata" aria-label="View on Wikidata">${WIKIDATA_LOGO}</a>`);
  }
  const osmId = (entry.osmRelationIds || [])[0];
  if (osmId) {
    badges.push(`<a class="pa-title-logo pa-title-logo-osm" href="https://www.openstreetmap.org/relation/${osmId}" target="_blank" rel="noopener" title="View on OpenStreetMap" aria-label="View on OpenStreetMap">${OSM_LOGO}</a>`);
  }
  return `<span class="pa-title-with-logos">${titleLink}${badges.length ? `<span class="pa-title-logos">${badges.join('')}</span>` : ''}</span>`;
}

function notificationTypeLabel(status) {
  return NOTIFICATION_TYPE_LABEL[status] || status || 'Not notified';
}

function formatNotificationDate(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Each doc "descriptor" is { href, label, disabled } -- href is null when
// there's genuinely nothing to link to (rendered as a non-interactive,
// muted icon); disabled marks a link that works but is a fallback/search
// rather than the real document (rendered muted, but still clickable).
function moefPdfDoc(n) {
  return { href: n.notificationPdfLink || null, label: 'MoEF PDF', disabled: !n.notificationPdfLink };
}

function archivePdfDoc(n) {
  if (n.notificationArchiveLink) return { href: n.notificationArchiveLink, label: 'Archive PDF', disabled: false };
  if (!n.orderNumber) return { href: null, label: 'Archive PDF', disabled: true };
  const query = new URLSearchParams({ query: n.orderNumber }).toString();
  return {
    href: `https://archive.org/details/gazetteofindia?tab=collection&${query}&sin=TXT&sort=-date`,
    label: 'Search Archive PDF',
    disabled: true,
  };
}

function boundaryMapDoc(n) {
  if (n.georeferencingLink) return { href: n.georeferencingLink, label: 'Boundary Map', disabled: false };
  if (n.allmapsImagesLink) return { href: n.allmapsImagesLink, label: 'Locate and Georeference Boundary Map', disabled: true };
  return { href: null, label: 'Boundary Map', disabled: true };
}

function boundaryDataDoc(entry) {
  const osmIds = entry.osmRelationIds || [];
  if (osmIds.length) return { href: `${AMCHE_ATLAS_BASE}?layers=osm:relation/${osmIds[0]}`, label: 'Boundary Data', disabled: false };
  return { href: null, label: 'Boundary Data', disabled: true };
}

function docLinkHtml(doc, icon) {
  const cls = `pa-doc-link${doc.disabled ? ' is-disabled' : ''}`;
  const title = escapeHtml(doc.label);
  if (!doc.href) return `<span class="${cls}" title="${title}" aria-label="${title}" aria-disabled="true">${icon}</span>`;
  return `<a class="${cls}" href="${doc.href}" target="_blank" rel="noopener" title="${title}" aria-label="${title}">${icon}</a>`;
}

function notificationRowHtml(n, entry) {
  const dotClass = NOTIFICATION_DOT_CLASS[n.notificationStatus] || 'dot-none';
  const docs = [
    [moefPdfDoc(n), DOC_ICON.pdf],
    [archivePdfDoc(n), DOC_ICON.archive],
    [boundaryMapDoc(n), DOC_ICON.map],
    [boundaryDataDoc(entry), DOC_ICON.layers],
  ];
  return `
    <li class="pa-notification-row">
      <span class="pa-notification-date">${escapeHtml(formatNotificationDate(n.notificationDate))}</span>
      <span class="pa-notification-type"><i class="dot ${dotClass}" aria-hidden="true"></i>${escapeHtml(notificationTypeLabel(n.notificationStatus))}</span>
      ${n.orderNumber ? `<span class="pa-notification-order">${escapeHtml(n.orderNumber)}</span>` : ''}
      <span class="pa-notification-docs">${docs.map(([doc, icon]) => docLinkHtml(doc, icon)).join('')}</span>
    </li>`;
}

function notificationListHtml(entry) {
  const sorted = [...entry.notifications].sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''));
  if (!sorted.length) return `<p class="pa-detail-empty">No ESZ notification on record yet.</p>`;
  return `<ul class="pa-notification-list">${sorted.map((n) => notificationRowHtml(n, entry)).join('')}</ul>`;
}

function detailHtml(entry) {
  const thumb = entry.pageBanner || entry.image;
  const meta = [];
  if (entry.iucnCategory) meta.push(escapeHtml(entry.iucnCategory.replace(/^IUCN category [IVXLC]+:\s*/, '')));
  if (entry.area) meta.push(`${entry.area.toLocaleString()} km&sup2;`);
  const stateLabel = stateAsString(entry.state);
  if (stateLabel) meta.push(escapeHtml(stateLabel));

  const links = [];
  const osmIds = entry.osmRelationIds || [];
  if (osmIds.length) links.push(`<a href="${AMCHE_ATLAS_BASE}?layers=osm:relation/${osmIds[0]}" target="_blank" rel="noopener">Boundary in amche-atlas</a>`);

  return `
    <button type="button" class="pa-card-collapse" aria-label="Collapse">&times;</button>
    <div class="pa-detail-grid">
      <div class="pa-detail-media">
        ${thumb ? `<a href="${commonsFilePageUrl(thumb)}" target="_blank" rel="noopener"><img class="pa-detail-image" src="${commonsThumbnailUrl(thumb, 120)}" alt="" loading="lazy" /></a>` : ''}
        ${entry.wikidataId ? `<div class="pa-commons-mosaic" aria-label="More images from Wikimedia Commons"></div>` : ''}
      </div>
      <div class="pa-detail-body">
        <h3 class="pa-detail-title">${paTitleLinksHtml(entry)}</h3>
        ${meta.length ? `<p class="pa-detail-meta">${meta.join(' &middot; ')}</p>` : ''}
        ${links.length ? `<p class="pa-detail-links">${links.join(' &middot; ')}</p>` : ''}
        <p class="pa-detail-excerpt">${entry.enwikiUrl ? 'Loading Wikipedia summary&hellip;' : ''}</p>
      </div>
    </div>
    <h4 class="pa-notification-heading">ESZ notification history</h4>
    ${notificationListHtml(entry)}`;
}

// Wikipedia summary fetched once per PA and cached, since collapsing then
// re-expanding a card (or a filter change re-rendering an open state) would
// otherwise re-fetch it.
const excerptCache = new Map();

async function loadExcerpt(entry, cardEl) {
  if (!entry.enwikiUrl || !entry.wikidataId) return;
  let result = excerptCache.get(entry.wikidataId);
  if (result === undefined) {
    const title = decodeURIComponent(entry.enwikiUrl.split('/').pop());
    let summary = null;
    try {
      const res = await fetch(`${WIKIPEDIA_SUMMARY_API}${encodeURIComponent(title)}`);
      if (res.ok) summary = await res.json();
    } catch { /* leave summary null */ }
    result = summary ? {
      extract: summary.extract || '',
      imageUrl: summary.originalimage?.source || summary.thumbnail?.source || null,
      thumbUrl: summary.thumbnail?.source || summary.originalimage?.source || null,
    } : null;
    excerptCache.set(entry.wikidataId, result);
  }
  applyExcerpt(cardEl, result);
}

function applyExcerpt(cardEl, result) {
  const excerptEl = cardEl.querySelector('.pa-detail-excerpt');
  if (!excerptEl) return; // card was collapsed/re-rendered before the fetch resolved
  if (!result || !result.extract) { excerptEl.remove(); return; }
  excerptEl.textContent = result.extract;
  const media = cardEl.querySelector('.pa-detail-media');
  if (result.imageUrl && media && !media.querySelector('img')) {
    const link = document.createElement('a');
    link.href = commonsFilePageUrl(result.imageUrl);
    link.target = '_blank';
    link.rel = 'noopener';
    const img = document.createElement('img');
    img.className = 'pa-detail-image';
    img.loading = 'lazy';
    img.alt = '';
    img.src = wikimediaThumbUrl(result.thumbUrl, 120);
    link.appendChild(img);
    media.insertBefore(link, media.firstChild);
  }
}

// The Commons category (Wikidata P373) isn't in the pre-built data files, so
// it's fetched live per PA the first time its card is expanded, then cached
// (both the category lookup and the resulting image list) so re-expanding
// doesn't repeat either API round trip.
const commonsCategoryCache = new Map();
const commonsMosaicCache = new Map();

async function fetchCommonsCategory(wikidataId) {
  if (commonsCategoryCache.has(wikidataId)) return commonsCategoryCache.get(wikidataId);
  let category = null;
  try {
    const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${wikidataId}&property=P373&format=json&origin=*`);
    if (res.ok) {
      const json = await res.json();
      category = json.claims?.P373?.[0]?.mainsnak?.datavalue?.value ?? null;
    }
  } catch { /* leave category null */ }
  commonsCategoryCache.set(wikidataId, category);
  return category;
}

async function fetchCommonsCategoryImages(category, limit = 12) {
  if (commonsMosaicCache.has(category)) return commonsMosaicCache.get(category);
  let images = [];
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(`Category:${category}`)}&gcmtype=file&gcmlimit=${limit}&prop=imageinfo&iiprop=url&iiurlwidth=40&format=json&origin=*`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      images = Object.values(json.query?.pages ?? {})
        .filter((p) => p.imageinfo?.[0])
        .map((p) => ({
          thumbUrl: p.imageinfo[0].thumburl || p.imageinfo[0].url,
          pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
        }));
    }
  } catch { /* leave images empty */ }
  commonsMosaicCache.set(category, images);
  return images;
}

async function loadCommonsMosaic(entry, cardEl) {
  if (!entry.wikidataId) return;
  const category = await fetchCommonsCategory(entry.wikidataId);
  // Card may have collapsed, or a re-render (filter change) may have replaced
  // this element, while the category lookup above was in flight.
  let mosaicEl = cardEl.querySelector('.pa-commons-mosaic');
  if (!category) { mosaicEl?.remove(); return; }
  const images = await fetchCommonsCategoryImages(category);
  mosaicEl = cardEl.querySelector('.pa-commons-mosaic');
  if (!mosaicEl) return;
  if (!images.length) { mosaicEl.remove(); return; }
  mosaicEl.innerHTML = images.map((img) => `
    <a href="${img.pageUrl}" target="_blank" rel="noopener">
      <img src="${img.thumbUrl}" alt="" loading="lazy" />
    </a>`).join('');
}

function typeGroupHtml(type, entries) {
  const sorted = sortEntriesByAreaDesc(entries);
  const counts = statusCounts(entries);
  const meta = paTypeMeta(type);
  return `
    <section class="pa-type-group pa-type-group--${meta.modifier}">
      <div class="pa-type-header">
        <h3 class="pa-type-title">
          <span class="pa-type-icon" aria-hidden="true">${meta.icon}</span>
          ${escapeHtml(type)} <span class="pa-type-count">(${entries.length})</span>
        </h3>
        <span class="pa-type-progress">
          <span class="pa-type-progress-meta">${progressMetaHtml(counts)}</span>
          ${chipBarHtml(counts)}
        </span>
      </div>
      <div class="pa-card-list">${sorted.map(cardOuterHtml).join('')}</div>
    </section>`;
}

function stateRowHtml(stateName, entries) {
  const isOpen = openStates.has(stateName);
  const typeMap = groupByType(entries);
  const bodyHtml = isOpen ? sortTypeNames(typeMap).map((t) => typeGroupHtml(t, typeMap.get(t))).join('') : '';
  return `
    <div class="state-row${isOpen ? ' is-open' : ''}" data-state-row="${escapeHtml(stateName)}">
      ${stateHeaderHtml(stateName, entries)}
      <div class="state-row-body">${bodyHtml}</div>
    </div>`;
}

// State names currently expanded -- survives across re-renders (filter
// changes, card expand/collapse) the same way openDraftGroups used to for
// the old table's draft-reveal toggle.
const openStates = new Set();
// PA keys whose card is currently showing its full detail panel.
const expandedCards = new Set();
const accordionEl = document.getElementById('pa-accordion');

function renderAccordion() {
  const groups = buildStateGroups(filteredEntries);
  const stateNames = sortStateNames(groups);
  accordionEl.innerHTML = stateNames.map((name) => stateRowHtml(name, groups.get(name))).join('');

  for (const paKey of expandedCards) {
    const cardEl = [...accordionEl.querySelectorAll('.pa-card')].find((el) => el.dataset.paKey === paKey);
    if (cardEl) toggleCard(cardEl, true, { syncMap: false });
  }
  highlightCard(selectedWikidataId);
}

function selectEntryOnMap(entry) {
  if (!entry.wikidataId || entry.coordinateLatitude == null) { closePopup(); return; }
  const feature = entryToFeature(entry);
  focusFeature(feature, { zoom: 10 });
  openPopupForFeature(feature);
  selectedWikidataId = feature.properties.wikidataId;
  highlightCard(selectedWikidataId);
}

function toggleCard(cardEl, shouldExpand, { syncMap = true } = {}) {
  const paKey = cardEl.dataset.paKey;
  const entry = entryByPaKey.get(paKey);
  if (!entry) return;
  if (shouldExpand) {
    expandedCards.add(paKey);
    cardEl.classList.add('is-expanded');
    cardEl.setAttribute('aria-expanded', 'true');
    cardEl.innerHTML = detailHtml(entry);
    loadExcerpt(entry, cardEl);
    loadCommonsMosaic(entry, cardEl);
    if (syncMap) selectEntryOnMap(entry);
  } else {
    expandedCards.delete(paKey);
    cardEl.classList.remove('is-expanded');
    cardEl.setAttribute('aria-expanded', 'false');
    cardEl.innerHTML = cardCompactInnerHtml(entry);
    if (selectedWikidataId === entry.wikidataId) closePopup();
  }
}

function toggleState(stateName) {
  if (openStates.has(stateName)) openStates.delete(stateName);
  else openStates.add(stateName);
  renderAccordion();
}

// Opens a PA's state section(s), scrolls to its card, and expands its detail
// -- used when a map marker is clicked (the marker's own click handler
// already flew the map/opened the popup, so map sync is skipped here).
function revealCard(paKey) {
  const entry = entryByPaKey.get(paKey);
  if (!entry) return;
  const states = entry.state.length ? entry.state : [UNSPECIFIED_STATE_LABEL];
  let changed = false;
  for (const state of states) {
    if (!openStates.has(state)) { openStates.add(state); changed = true; }
  }
  if (changed) renderAccordion();
  const cardEl = [...accordionEl.querySelectorAll('.pa-card')].find((el) => el.dataset.paKey === paKey);
  if (!cardEl) return;
  cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (!cardEl.classList.contains('is-expanded')) toggleCard(cardEl, true, { syncMap: false });
}

function onCardHoverEnter(cardEl) {
  if (selectedWikidataId) return; // a card/marker is selected -- hover is suspended until cleared
  const entry = entryByPaKey.get(cardEl.dataset.paKey);
  if (!entry || entry.coordinateLatitude == null) return;
  const feature = entryToFeature(entry);
  focusFeature(feature);
  openPopupForFeature(feature);
}

function onCardHoverLeave() {
  if (selectedWikidataId) return;
  closePopup();
}

function initAccordionEvents() {
  accordionEl.addEventListener('click', (e) => {
    if (e.target.closest('.pa-card-collapse')) {
      const card = e.target.closest('.pa-card');
      if (card) toggleCard(card, false);
      return;
    }
    const card = e.target.closest('.pa-card');
    if (card) { toggleCard(card, !card.classList.contains('is-expanded')); return; }
    const header = e.target.closest('.state-row-header');
    if (header) toggleState(header.dataset.state);
  });
  accordionEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.pa-card');
    if (card && e.target === card) {
      e.preventDefault();
      toggleCard(card, !card.classList.contains('is-expanded'));
    }
  });
  // mouseenter/mouseleave don't bubble, so delegation uses mouseover/mouseout
  // with a relatedTarget check to only fire once per card boundary crossing.
  accordionEl.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.pa-card');
    if (card && !card.contains(e.relatedTarget)) onCardHoverEnter(card);
  });
  accordionEl.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.pa-card');
    if (card && !card.contains(e.relatedTarget)) onCardHoverLeave();
  });
}

function anyDocFiltersActive() {
  return DOC_AVAILABILITY_FIELDS.some((field) => docAvailabilityFilters[field.key]);
}

function anyFiltersActive() {
  return !!searchTerm || !!paTypeFilter || !!paStateFilter || anyDocFiltersActive();
}

// Keeps the combined result-count/clear-filters control and the "Data
// filters" toggle's active-count badge in sync with the current filter
// state, so the clear button only appears once there's something to clear.
function updateFilterStatusUi() {
  document.getElementById('reset-filters').hidden = !anyFiltersActive();
  const docActiveCount = DOC_AVAILABILITY_FIELDS.filter((field) => docAvailabilityFilters[field.key]).length;
  const badge = document.getElementById('data-filters-badge');
  badge.hidden = docActiveCount === 0;
  badge.textContent = docActiveCount || '';
}

function applyFilters() {
  filteredEntries = computeFilteredEntries();
  renderAccordion();
  updateMapFilter();
  document.getElementById('result-count').textContent =
    `${filteredEntries.length.toLocaleString()} of ${paEntries.length.toLocaleString()} protected areas`;
  updateFilterStatusUi();
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportFilteredCsv() {
  const columns = ['moefSNo', 'state', 'protectedAreaName', 'protectedAreaType', 'notificationStatus', 'notificationDate', 'orderNumber', 'notificationPdfLink', 'notificationArchiveLink', 'wikidataId'];
  const rows = [columns.join(',')];
  for (const r of flattenEntriesToRows(filteredEntries)) {
    rows.push(columns.map((c) => csvEscape(r[c])).join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'esz-notifications-filtered.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Union of PA types across all joined entries, so the dropdown covers types
// even when a PA has no notification record.
function collectProtectedAreaTypes() {
  const types = new Set();
  for (const entry of paEntries) if (entry.protectedAreaType) types.add(entry.protectedAreaType);
  return [...types].sort();
}

// Nationwide count per type (unaffected by the current filters -- these
// label the dropdown's own options, not a live filtered result), keyed by
// UNSPECIFIED_TYPE for entries with no protectedAreaType at all.
function collectProtectedAreaTypeCounts() {
  const counts = new Map();
  for (const entry of paEntries) {
    const key = entry.protectedAreaType || UNSPECIFIED_TYPE;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function setPaTypeFilter(value) {
  paTypeFilter = value;
  applyFilters();
  renderQaList();
  renderNoCoordList();
}

function initTypeFilter() {
  const select = document.getElementById('pa-type-filter');
  const counts = collectProtectedAreaTypeCounts();
  select.querySelector('option[value=""]').textContent = `All types (${paEntries.length.toLocaleString()})`;
  for (const type of collectProtectedAreaTypes()) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = `${type} (${(counts.get(type) || 0).toLocaleString()})`;
    select.appendChild(opt);
  }
  if (counts.has(UNSPECIFIED_TYPE)) {
    const opt = document.createElement('option');
    opt.value = UNSPECIFIED_TYPE;
    opt.textContent = `Unspecified type (${counts.get(UNSPECIFIED_TYPE).toLocaleString()})`;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => setPaTypeFilter(select.value));
}

// Same idea as collectProtectedAreaTypes, but flattening each entry's `state`
// array (a few PAs span multiple states).
function collectStates() {
  const states = new Set();
  for (const entry of paEntries) for (const s of entry.state) states.add(s);
  return [...states].sort();
}

// Nationwide count per state (a PA spanning multiple states counts once
// toward each), keyed by UNSPECIFIED_STATE for entries with no state at all.
function collectStateCounts() {
  const counts = new Map();
  for (const entry of paEntries) {
    const states = entry.state.length ? entry.state : [UNSPECIFIED_STATE];
    for (const s of states) counts.set(s, (counts.get(s) || 0) + 1);
  }
  return counts;
}

function setPaStateFilter(value) {
  paStateFilter = value;
  applyFilters();
  renderQaList();
  renderNoCoordList();
}

function initStateFilter() {
  const select = document.getElementById('pa-state-filter');
  const counts = collectStateCounts();
  select.querySelector('option[value=""]').textContent = `All states (${paEntries.length.toLocaleString()})`;
  for (const state of collectStates()) {
    const opt = document.createElement('option');
    opt.value = state;
    opt.textContent = `${state} (${(counts.get(state) || 0).toLocaleString()})`;
    select.appendChild(opt);
  }
  if (counts.has(UNSPECIFIED_STATE)) {
    const opt = document.createElement('option');
    opt.value = UNSPECIFIED_STATE;
    opt.textContent = `Unspecified state (${counts.get(UNSPECIFIED_STATE).toLocaleString()})`;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => setPaStateFilter(select.value));
}

function initDownloadDropdown() {
  const dropdown = document.getElementById('download-dropdown');
  const toggle = document.getElementById('download-toggle');
  const closeDropdown = () => {
    dropdown.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', closeDropdown);
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) closeDropdown();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}

// Injects the same doc-link icons used in the notification history rows
// (see DOC_ICON) into the Advanced Search filter labels, so the two stay in
// sync from one definition instead of duplicating SVG markup in the HTML.
function initDocFilterIcons() {
  document.querySelectorAll('[data-doc-icon]').forEach((field) => {
    const icon = DOC_ICON[field.dataset.docIcon];
    const holder = field.querySelector('.doc-filter-icon');
    if (icon && holder) holder.innerHTML = icon;
  });
}

function initDocAvailabilityFilters() {
  initDocFilterIcons();
  for (const field of DOC_AVAILABILITY_FIELDS) {
    const select = document.getElementById(field.selectId);
    const availableCount = paEntries.filter(field.check).length;
    const missingCount = paEntries.length - availableCount;
    select.querySelector('option[value=""]').textContent = `Any (${paEntries.length.toLocaleString()})`;
    select.querySelector('option[value="available"]').textContent = `Available (${availableCount.toLocaleString()})`;
    select.querySelector('option[value="missing"]').textContent = `Missing (${missingCount.toLocaleString()})`;
    docAvailabilityFilters[field.key] = select.value;
    select.addEventListener('change', () => {
      docAvailabilityFilters[field.key] = select.value;
      applyFilters();
    });
  }
}

function resetDocAvailabilityFilters() {
  for (const field of DOC_AVAILABILITY_FIELDS) {
    document.getElementById(field.selectId).value = '';
    docAvailabilityFilters[field.key] = '';
  }
}

// The "Data filters" toggle button opens/closes the advanced-search-panel
// (doc-availability filters + nested Edit data QA lists), which is a plain
// hidden <div> rather than a <details> so the toggle can live in the
// combined toolbar-status-group instead of an inline <summary>.
function initDataFiltersToggle() {
  const toggle = document.getElementById('data-filters-toggle');
  const panel = document.getElementById('advanced-search-panel');
  toggle.addEventListener('click', () => {
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
}

function initFilterEvents() {
  const searchInput = document.getElementById('filter-search');
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    applyFilters();
  });
  document.getElementById('reset-filters').addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    document.getElementById('pa-type-filter').value = '';
    paTypeFilter = '';
    document.getElementById('pa-state-filter').value = '';
    paStateFilter = '';
    resetDocAvailabilityFilters();
    applyFilters();
    renderQaList();
    renderNoCoordList();
  });
  document.getElementById('export-filtered').addEventListener('click', exportFilteredCsv);
}

function renderEszIntro() {
  const el = document.getElementById('esz-intro');
  if (el) el.innerHTML = ESZ_INTRO_HTML;
}

async function main() {
  renderEszIntro();
  initSourceStatus().catch((err) => console.error(err));
  await loadData();
  initTypeFilter();
  initStateFilter();
  initDocAvailabilityFilters();
  initDataFiltersToggle();
  renderHeroStats();
  initHeroStatModals();
  renderQaList();
  renderNoCoordList();
  initCopyQaList();
  initCopyQaQuickstatements();
  initQaModeToggle();
  initQaSearch();
  initHideMatchedToggle();
  initQaTableInteractions();
  initAtlasLink();
  initMap();
  initPaPointsLayerToggle();
  initEszLayerToggle();
  initWildlifeReserveLayerToggle();
  initAccordionEvents();
  applyFilters();
  initFilterEvents();
  initDownloadDropdown();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#d03b3b">Failed to load dashboard data: ${err.message}</p>`);
});
