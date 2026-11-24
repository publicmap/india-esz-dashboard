// Dashboard logic: loads a single pre-joined data file, computes KPIs,
// renders the MapLibre map + a state-by-state accordion of protected-area
// cards (grouped by type, then by size), and wires up CSV export. No build
// step -- dependencies are loaded as ES modules straight from a CDN.

import { Protocol as PmtilesProtocol } from 'https://cdn.jsdelivr.net/npm/pmtiles@4.4.1/+esm';
import { WarpedMapLayer } from 'https://cdn.jsdelivr.net/npm/@allmaps/maplibre@1.0.0-beta.42/+esm';

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
// The map's all-India starting view -- also restored when the pointer
// leaves the state list after a state hover zoomed in.
const INITIAL_VIEW = { center: [82, 22], zoom: 3.6 };

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
// The Parivesh overlays (ESZ, wildlife reserves) sit under the OSM protected
// areas as faint context: a light fill, no outline, and name labels from
// PARIVESH_LABEL_MINZOOM. The labels run along each polygon's edge, repeated:
// these tiles stop at z9/z10, so a single interior label (one per source
// tile) almost never falls inside a z14 view.
const PARIVESH_FILL_OPACITY = 0.1;
const PARIVESH_LABEL_MINZOOM = 14;
const PARIVESH_LABEL_LAYOUT = {
  'symbol-placement': 'line',
  'symbol-spacing': 350,
  'text-font': ['open_sans_regular'],
  'text-size': 12,
  'text-offset': [0, -0.8], // just inside/outside the edge, not on it
  'text-padding': 4,
};
const PARIVESH_LABEL_PAINT = { 'text-color': '#166534', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 };

// Small condensed source tags ("OSM", "BHARATMAPS") repeated along polygon
// outlines from z8, so it's clear which dataset each boundary comes from.
const SOURCE_TAG_MINZOOM = 8;
function sourceTagLayer(id, source, sourceLayer, text, color) {
  return {
    id,
    type: 'symbol',
    source,
    'source-layer': sourceLayer,
    minzoom: SOURCE_TAG_MINZOOM,
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 250,
      // Forest boundaries are jagged: allow sharp bends under the short tag,
      // or it rarely finds a stretch to sit on.
      'text-max-angle': 90,
      'text-field': text,
      'text-font': ['open_sans_condensed_semibold'],
      'text-size': 8,
      'text-letter-spacing': 0.05,
      'text-padding': 0,
    },
    paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
  };
}

const WILDLIFE_RESERVE_LAYER_URL = 'https://indianopenmaps.fly.dev/not-so-open/forests/wildlife/reserves-and-corridors/parivesh/{z}/{x}/{y}.pbf';
const WILDLIFE_RESERVE_LAYER_SOURCE_LAYER = 'Bharatmaps_Parivesh_Wildlife_Reserves_and_Corridors';
const WILDLIFE_RESERVE_LAYER_MAXZOOM = 10;

// Every OSM protected area in India, built by
// scripts/build-osm-protected-areas.js and served from this site as PMTiles.
// Every georeferenced ESZ gazette map (an Allmaps AnnotationPage built by
// build:gazette-maps), warped onto the map in the browser by the Allmaps
// MapLibre plugin straight from the gazette page images' IIIF services.
// (The Allmaps tile server renders the same mosaic, but takes minutes a
// tile.) Pinned to @allmaps/maplibre 1.0.0-beta.42, the last release built
// for MapLibre 4 -- later ones need MapLibre 5/6 and load maps without
// drawing them on this page's 4.7.1.
const NOTIFICATION_MAPS_ANNOTATIONS_URL = new URL('data/gazette-maps/mosaic-annotations.json', document.baseURI).href;
const NOTIFICATION_MAPS_LAYER_ID = 'notification-maps';
const NOTIFICATION_MAPS_OPACITY = 0.85;

// OSM ocean polygons (Shortbread vector tiles), a pale mask over the sea on
// the OSM raster basemap.
const OCEAN_TILES_URL = 'https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt';

// Natural Earth 1:10m countries from India's point of view, built by
// scripts/build-natural-earth.js: outlines for every country, and a grey mask
// over all of them except India.
const NATURAL_EARTH_PMTILES_URL = new URL('data/natural-earth/countries-ind.pmtiles', document.baseURI).href;
const COUNTRY_MASK_COLOR = '#9ca3af';
const COUNTRY_MASK_OPACITY = 0.9;

const OSM_PA_PMTILES_URL = new URL('data/osm/india-protected-areas-all.pmtiles', document.baseURI).href;
const OSM_PA_SOURCE_LAYER = 'protected_areas';
// OSM zones, classified from name/protection_title (see osmPaZoneExpr): the
// core area is filled by its PA's ESZ notification status (unlinked areas in
// grey), the buffer in a light green, ESZs hatched in their PA's status colour
// and eco-sensitive areas hatched light green.
const OSM_PA_CORE_OPACITY = 0.45;
const OSM_PA_LABEL_MINZOOM = 7;
const OSM_PA_UNLINKED_COLOR = '#898781';
const OSM_PA_BUFFER_COLOR = '#86efac';
const OSM_PA_BUFFER_OPACITY = 0.5;
// ESZ hatching is drawn in its PA's status colour (see osmPaStatusById);
// eco-sensitive areas keep a light green.
const OSM_PA_ESZ_HATCH = { spacing: 8, width: 1.5, alpha: 0.75 };
const OSM_PA_ESA_HATCH = { image: 'osm-pa-hatch-esa', color: 'rgba(74, 222, 128, 0.6)', spacing: 10, width: 1 };
const osmPaEszHatchImage = (status) => `osm-pa-hatch-esz-${status}`;
// The NIC (Parivesh) ESZ layer gets the same hatch, muted: its features carry
// no link to a PA, so it's drawn in one green at low opacity under the OSM
// layer.
const NIC_ESZ_HATCH = { ...OSM_PA_ESZ_HATCH, image: 'nic-esz-hatch', color: '#166534' };
const NIC_ESZ_HATCH_OPACITY = 0.2;

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
function entryHasBoundaryData(entry) { return entryOsmFeatureId(entry) !== null; }
// The PA's OSM boundary as "relation/<id>" or "way/<id>": Wikidata's OSM
// relation ID first, else an OSM feature tagged with the PA's Wikidata ID.
function entryOsmFeatureId(entry) {
  const relationId = (entry.osmRelationIds || [])[0];
  if (relationId) return `relation/${relationId}`;
  return (entry.osmFeatureIds || [])[0] || null;
}
// amche-atlas's osm: shortcut takes relations; ways go to openstreetmap.org.
function osmBoundaryHref(osmFeatureId) {
  return osmFeatureId.startsWith('relation/')
    ? `${AMCHE_ATLAS_BASE}?layers=osm:${osmFeatureId}`
    : `https://www.openstreetmap.org/${osmFeatureId}`;
}

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
    // and the notification history -- so this row label reads as
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

let selectedWikidataId = null;
// The map has no popups: hovering/selecting a PA marker swaps its badge to the
// full name, and its detail lives in its card in the accordion.

// Ends the PA selection: un-highlights its card and drops its marker back to
// the initials badge.
function clearSelection() {
  selectedWikidataId = null;
  highlightCard(null);
}

// Selects a PA as a map click does: its state becomes the selected state
// (fitted first), its card opens and scrolls into view, then the map zooms
// in to the PA once the state fit lands. Also used for the URL hash.
function selectPa(paKey) {
  const entry = entryByPaKey.get(paKey);
  const paState = entry?.state[0];
  if (paState && paState !== selectedState) {
    if (selectedState) openStates.delete(selectedState);
    openStates.add(paState);
    selectState(paState);
    renderAccordion();
  }
  selectedWikidataId = paKey;
  highlightCard(selectedWikidataId);
  revealCard(selectedWikidataId);
  if (entry && entry.coordinateLatitude != null) {
    const zoomIn = () => { if (selectedWikidataId === paKey) zoomToEntry(entry); };
    if (map.isMoving()) map.once('moveend', zoomIn);
    else zoomIn();
  }
}

// The URL hash names the open PA (#Q1661434, or the encoded paKey of a PA
// without a Wikidata item), so a link opens the page with that PA selected.
// Off until the map has loaded and applied the hash it was opened with, so
// the initial renders don't wipe it.
let urlHashSyncEnabled = false;

function paKeyHash(paKey) {
  return `#${encodeURIComponent(paKey)}`;
}

function paKeyFromHash() {
  const raw = location.hash.slice(1);
  if (!raw) return null;
  let key;
  try { key = decodeURIComponent(raw); } catch { return null; }
  return entryByPaKey.has(key) ? key : null;
}

function syncUrlHash() {
  if (!urlHashSyncEnabled) return;
  const key = selectedWikidataId || [...expandedCards].pop() || null;
  const hash = key ? paKeyHash(key) : '';
  if (location.hash === hash || (!hash && !location.hash)) return;
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

function selectPaFromHash() {
  const key = paKeyFromHash();
  if (key && key !== selectedWikidataId) selectPa(key);
}

function initUrlHash() {
  selectPaFromHash();
  urlHashSyncEnabled = true;
  syncUrlHash();
  window.addEventListener('hashchange', selectPaFromHash);
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
  setActivePaMarker(paKey);
  document.querySelectorAll('#pa-accordion .pa-card.is-selected').forEach((el) => el.classList.remove('is-selected'));
  if (paKey) {
    for (const el of document.querySelectorAll('#pa-accordion .pa-card')) {
      if (el.dataset.paKey === paKey) el.classList.add('is-selected');
    }
  }
  syncUrlHash();
}

let map;
function initMap() {
  maplibregl.addProtocol('pmtiles', new PmtilesProtocol().tile);

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      // Glyphs for the state-name labels (see addStateBoundaryLayers).
      // VersaTiles: Open Sans in every weight plus condensed widths (font
      // names are its snake_case face ids, e.g. open_sans_semibold).
      glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
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
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    attributionControl: false, // added below, collapsed
  });
  window.__debugMap = map; // TEMP-DEBUG-HOOK: remove before commit
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  addCollapsedAttribution();

  map.on('load', () => {
    addOceanLayers();
    addCountryLayers();
    addNotificationMapsLayer();
    addBoundaryCorrectionLayers();
    addEszLayer();
    addWildlifeReserveLayer();
    addOsmProtectedAreaLayer();
    // State lines/labels above the other overlays; the mask layer is moved
    // down to just above the OSM basemap.
    addStateBoundaryLayers();
    // PA markers last, on top of everything (including the state lines and
    // labels).
    map.addSource('protected-areas', { type: 'geojson', data: allFeatureCollection() });
    addPaMarkerLayers();

    // Hovering a marker activates that PA the same way hovering its card
    // does: its badge swaps to the full name -- unless a PA is selected,
    // which keeps hover suspended until cleared. Both marker layers are
    // hit-tested together, since activating a PA moves it from the base
    // layer to the active one right under the pointer.
    let hoveredMarkerId = null;
    const onMarkerHover = (f) => {
      const id = f ? f.properties.wikidataId : null;
      if (id === hoveredMarkerId) return;
      hoveredMarkerId = id;
      map.getCanvas().style.cursor = id ? 'pointer' : '';
      if (selectedWikidataId) return;
      setActivePaMarker(id);
    };
    // Hovering a state on the map styles it as if selected (outline, tint,
    // label, dimmed points elsewhere) without moving the map; off every
    // state, the selected state's styling comes back.
    let hoveredMapLgdName = '';
    const onMapStateHover = (point) => {
      const hit = point && map.queryRenderedFeatures(point, { layers: ['state-boundaries-mask'] })[0];
      const lgdName = hit ? String(hit.properties.STNAME || '').toUpperCase() : '';
      if (lgdName === hoveredMapLgdName) return;
      hoveredMapLgdName = lgdName;
      setActiveStateOutline(lgdName ? (dashboardStateName(lgdName) || lgdName) : selectedState);
    };
    map.on('mousemove', (e) => {
      onMarkerHover(paMarkerAt(e.point));
      onMapStateHover(e.point);
      // Linked OSM polygons are clickable too (see the click handler).
      if (!hoveredMarkerId) map.getCanvas().style.cursor = osmPaKeyAt(e.point) ? 'pointer' : '';
    });
    map.getCanvas().addEventListener('mouseleave', () => {
      onMarkerHover(null);
      onMapStateHover(null);
    });
    // A click on a PA marker, or on an OSM polygon linked to a PA (its own
    // boundary or its ESZ), toggles that PA's selection: selecting it (and
    // its state), or deselecting it when it's already selected. Clicking
    // anywhere else clears the PA selection and selects/deselects a state
    // (see onMapStateClick).
    // A user pan/zoom moves the view off the selected PA (see
    // returnToOpenPa); programmatic moves carry no originalEvent.
    map.on('movestart', (e) => { if (e.originalEvent) mapViewPa = null; });
    map.on('click', (e) => {
      const id = paMarkerAt(e.point)?.properties.wikidataId || osmPaKeyAt(e.point);
      if (id && id === selectedWikidataId) {
        deselectPa(id);
        return;
      }
      if (id) {
        selectPa(id);
        return;
      }
      clearSelection();
      onMapStateClick(e);
    });

    // Open the PA named in the URL hash, and keep the hash in step from here on.
    initUrlHash();
  });
}

// PA markers: a circle coloured by ESZ status -- green when the final ESZ is
// notified, yellow for a draft, red when no notification has been found --
// with the PA's name as a text label beside it.
const PA_MARKER_STATUSES = ['final', 'draft', 'none'];
const PA_MARKER_STATUS_COLOR = { final: STATUS_COLOR.final, draft: STATUS_COLOR.draft, none: '#dc2626' };
// Marker size by area: the mappable PAs with a known area are split into
// equal thirds (small / medium / large), scaled by these factors; PAs with
// no known area get the small size.
const PA_MARKER_SIZE_SCALES = [1, 1.5, 2];
// Circle radius (px) of a small-bucket marker by zoom; the others scale up.
const PA_MARKER_RADIUS_STOPS = [3, 2, 7, 3, 10, 4, 14, 5];
// Below this zoom the label abbreviates the PA type (see abbreviatePaName).
const PA_LABEL_FULL_NAME_ZOOM = 14;
const PA_LABEL_FONT = ['open_sans_semibold'];

function paMarkerRadius(extra = 0) {
  const expr = ['interpolate', ['linear'], ['zoom']];
  for (let i = 0; i < PA_MARKER_RADIUS_STOPS.length; i += 2) {
    expr.push(PA_MARKER_RADIUS_STOPS[i], ['+', ['*', PA_MARKER_RADIUS_STOPS[i + 1], ['get', 'markerScale']], extra]);
  }
  return expr;
}

const PA_MARKER_COLOR_EXPR = ['match', ['get', 'eszStatus'],
  'final', PA_MARKER_STATUS_COLOR.final, 'draft', PA_MARKER_STATUS_COLOR.draft, PA_MARKER_STATUS_COLOR.none];

// "Periyar Tiger Reserve" -> "Periyar TR", etc.; shown below
// PA_LABEL_FULL_NAME_ZOOM.
const PA_NAME_ABBREVIATIONS = [
  [/\bNational Park\b/gi, 'NP'],
  [/\bWildlife Sanctuary\b/gi, 'WLS'],
  [/\bBird Sanctuary\b/gi, 'BS'],
  [/\bTiger Reserve\b/gi, 'TR'],
];
function abbreviatePaName(name) {
  return PA_NAME_ABBREVIATIONS.reduce((n, [re, short]) => n.replace(re, short), name || '');
}

const PA_LABEL_TEXT_FIELD = ['step', ['zoom'], ['get', 'shortName'], PA_LABEL_FULL_NAME_ZOOM, ['get', 'name']];
const PA_LABEL_LAYOUT = {
  'text-font': PA_LABEL_FONT,
  'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 12, 14, 13],
  // Beside the circle, trying right first; offset in ems, clear of the
  // largest circle.
  'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
  'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.35, ['get', 'markerScale']], 14, ['*', 0.5, ['get', 'markerScale']]],
  'text-justify': 'auto',
  'text-max-width': 10,
};
const PA_LABEL_PAINT = { 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 };

// Base circles + labels for every PA, plus an "active" circle + label pair
// for one PA (hovered on the map or in the list, else the selected one),
// drawn on top with a black ring and a full-name label that's never hidden by
// collisions -- see setActivePaMarker.
function addPaMarkerLayers() {
  map.addLayer({
    id: 'protected-areas-markers',
    type: 'circle',
    source: 'protected-areas',
    paint: {
      'circle-radius': paMarkerRadius(),
      'circle-color': PA_MARKER_COLOR_EXPR,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
    },
    // Small PAs draw on top, so a large circle doesn't bury them.
    layout: { 'circle-sort-key': ['-', 0, ['get', 'markerScale']] },
  });
  map.addLayer({
    id: 'protected-areas-labels',
    type: 'symbol',
    source: 'protected-areas',
    layout: {
      ...PA_LABEL_LAYOUT,
      'text-field': PA_LABEL_TEXT_FIELD,
      // Larger PAs win label collisions.
      'symbol-sort-key': ['-', 0, ['get', 'markerScale']],
    },
    paint: PA_LABEL_PAINT,
  });
  map.addLayer({
    id: 'protected-areas-active',
    type: 'circle',
    source: 'protected-areas',
    filter: ['==', ['get', 'wikidataId'], ''],
    paint: {
      'circle-radius': paMarkerRadius(1),
      'circle-color': PA_MARKER_COLOR_EXPR,
      'circle-stroke-color': '#000000',
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: 'protected-areas-active-label',
    type: 'symbol',
    source: 'protected-areas',
    filter: ['==', ['get', 'wikidataId'], ''],
    layout: {
      ...PA_LABEL_LAYOUT,
      'text-field': ['get', 'name'],
      'text-font': ['open_sans_bold'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: PA_LABEL_PAINT,
  });
}

// Activates one PA's marker (by wikidataId), or with null falls back to the
// selected PA (if any).
function setActivePaMarker(wikidataId) {
  if (!map || !map.getLayer('protected-areas-active')) return;
  const id = wikidataId || selectedWikidataId || '';
  const active = entryByPaKey.get(id) ? id : '';
  map.setFilter('protected-areas-active', ['==', ['get', 'wikidataId'], active]);
  map.setFilter('protected-areas-active-label', ['==', ['get', 'wikidataId'], active]);
  // Drop its base label so the active full-name label isn't doubled.
  map.setFilter('protected-areas-labels', active ? ['!=', ['get', 'wikidataId'], active] : null);
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
// Ocean mask: just above the basemap (and the state mask), under every
// other overlay.
function addOceanLayers() {
  map.addSource('ocean', {
    type: 'vector',
    tiles: [OCEAN_TILES_URL],
    maxzoom: 14,
    attribution: '<a href="https://shortbread-tiles.org/schema/1.0/" target="_blank" rel="noopener">Shortbread vector tiles</a>',
  });
  map.addLayer({
    id: 'ocean-fill',
    type: 'fill',
    source: 'ocean',
    'source-layer': 'ocean',
    paint: { 'fill-color': '#ebfaff', 'fill-opacity': 0.5 },
  });
  map.addLayer({
    id: 'ocean-line',
    type: 'line',
    source: 'ocean',
    'source-layer': 'ocean',
    paint: { 'line-color': '#e6e6e6', 'line-width': 0.2 },
  });
}

// Natural Earth countries: a grey mask over every country except India, plus
// thin country outlines. Sits just above the basemap and the state mask, under
// every other overlay.
function addCountryLayers() {
  map.addSource('natural-earth-countries', {
    type: 'vector',
    url: `pmtiles://${NATURAL_EARTH_PMTILES_URL}`,
    attribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>',
  });
  map.addLayer({
    id: 'country-mask',
    type: 'fill',
    source: 'natural-earth-countries',
    'source-layer': 'countries',
    filter: ['!=', ['get', 'ADM0_A3_IN'], 'IND'],
    paint: { 'fill-color': COUNTRY_MASK_COLOR, 'fill-opacity': COUNTRY_MASK_OPACITY },
  });
  map.addLayer({
    id: 'country-line',
    type: 'line',
    source: 'natural-earth-countries',
    'source-layer': 'countries',
    paint: { 'line-color': '#6b7280', 'line-width': 0.75 },
  });
}

// Compact attribution, collapsed to its (i) button. MapLibre opens the compact
// box itself the first time it fills with attributions, so close it once
// when that happens; the button toggles it as usual after that.
function addCollapsedAttribution() {
  const control = new maplibregl.AttributionControl({ compact: true });
  map.addControl(control, 'bottom-right');
  const el = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (!el) return;
  const collapse = () => {
    if (!el.classList.contains('maplibregl-compact-show')) return false;
    el.classList.remove('maplibregl-compact-show');
    el.setAttribute('open', ''); // same state the (i) button leaves it in when closing
    return true;
  };
  if (collapse()) return;
  const observer = new MutationObserver(() => { if (collapse()) observer.disconnect(); });
  observer.observe(el, { attributes: true, attributeFilter: ['class'] });
}

// The georeferenced gazette maps: above the basemap masks, under every vector
// overlay (boundaries, ESZs, reserves, OSM PAs, markers). Loading is async; a
// failure leaves the rest of the map untouched.
function addNotificationMapsLayer() {
  const layer = new WarpedMapLayer({ layerId: NOTIFICATION_MAPS_LAYER_ID, opacity: NOTIFICATION_MAPS_OPACITY });
  map.addLayer(layer);
  layer.addGeoreferenceAnnotationByUrl(NOTIFICATION_MAPS_ANNOTATIONS_URL)
    .catch((err) => console.warn('Notification maps failed to load:', err));
}

function setNotificationMapsLayerVisibility(visible) {
  if (map.getLayer(NOTIFICATION_MAPS_LAYER_ID)) {
    map.setLayoutProperty(NOTIFICATION_MAPS_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
}

function initNotificationMapsLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-notification-maps');
  checkbox.addEventListener('change', () => setNotificationMapsLayerVisibility(checkbox.checked));
}

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

// LGD state/UT boundaries from Indian Open Maps (vector tiles, source layer
// "LGD_States", name in STNAME as upper case). Drawn as a faint outline for
// every state with its name label, plus a highlight outline for the active
// state -- the selected (expanded / clicked) one, or a hovered accordion
// header previewing another -- and a white mask over every other state while
// one is active (see setActiveStateOutline).
const STATE_BOUNDARY_TILES_URL = 'https://indianopenmaps.com/not-so-open/states/lgd/{z}/{x}/{y}.pbf';
const STATE_NAME_EXPR = ['upcase', ['to-string', ['get', 'STNAME']]];
const STATE_MASK_COLOR = '#ffffff';
const STATE_MASK_OPACITY = 0.8;
const STATE_ACTIVE_FILL_COLOR = '#fdf3c4'; // off-yellow
// The active state's tint fades out as you zoom in: 0.8 up to z12, 0 by z18.
const STATE_ACTIVE_FILL_OPACITY_STOPS = [12, 0.8, 18, 0];
// Dashboard state names (from Wikidata) whose LGD STNAME is spelled differently.
const LGD_STATE_NAME_OVERRIDES = {
  'Andaman and Nicobar Islands': 'ANDAMAN & NICOBAR',
  'Dadra and Nagar Haveli and Daman and Diu': 'DADRA,NAGAR HAVELI,DAMAN & DIU',
  'Jammu and Kashmir': 'JAMMU & KASHMIR',
  'National Capital Territory of Delhi': 'DELHI',
};

function lgdStateName(stateName) {
  return (LGD_STATE_NAME_OVERRIDES[stateName] || stateName).toUpperCase();
}

function addStateBoundaryLayers() {
  map.addSource('state-boundaries', {
    type: 'vector',
    tiles: [STATE_BOUNDARY_TILES_URL],
    minzoom: 0,
    maxzoom: 10,
    attribution: "<a href='https://lgdirectory.gov.in' target='_blank' rel='noopener'>Local Government Directory</a>, <a href='https://datameet.org' target='_blank' rel='noopener'>Datameet Community</a>",
  });
  map.addLayer({
    id: 'state-boundaries-mask',
    type: 'fill',
    source: 'state-boundaries',
    'source-layer': 'LGD_States',
    // Covers every state at all times (so map clicks can hit-test states via
    // this layer); setActiveStateOutline drives the colour and opacity --
    // white at 0.8 on every state that isn't active (all of them until one
    // is), and an off-yellow tint on the active one that fades out by z18.
    paint: { 'fill-color': STATE_MASK_COLOR, 'fill-opacity': STATE_MASK_OPACITY },
  });
  map.addLayer({
    id: 'state-boundaries-line',
    type: 'line',
    source: 'state-boundaries',
    'source-layer': 'LGD_States',
    paint: {
      'line-color': '#9ca3af',
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 1.2],
    },
  });
  map.addLayer({
    id: 'state-boundaries-label',
    type: 'symbol',
    source: 'state-boundaries',
    'source-layer': 'LGD_States',
    layout: {
      'text-field': ['get', 'STNAME'],
      // PT Sans Bold (the source's suggested font) isn't on this glyph server.
      'text-font': ['open_sans_bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 6, 15],
      'text-padding': 50,
      'text-max-width': 8,
      'symbol-sort-key': 1,
    },
    paint: {
      'text-color': '#000000',
      'text-opacity': 0.8,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
  });
  map.addLayer({
    id: 'state-boundaries-active',
    type: 'line',
    source: 'state-boundaries',
    'source-layer': 'LGD_States',
    filter: ['==', STATE_NAME_EXPR, ''],
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': '#000000',
      'line-width': 1,
    },
  });
  // Label above the active outline so the line doesn't strike through it.
  map.moveLayer('state-boundaries-label');
  // The mask only fades the basemap: it sits directly above the OSM raster,
  // under every overlay (ESZs, reserves, OSM PAs, markers, boundaries).
  const layerIds = map.getStyle().layers.map((l) => l.id);
  const aboveBasemap = layerIds[layerIds.indexOf('osm') + 1];
  if (aboveBasemap && aboveBasemap !== 'state-boundaries-mask') map.moveLayer('state-boundaries-mask', aboveBasemap);
  // Every state's tiles are loaded at the initial all-India view -- cache
  // their bboxes before the user can zoom away.
  map.once('idle', () => cacheStateBounds());
}

// Per-state bbox (keyed by LGD name) from the boundary polygons, cached the
// first time each state's tiles are seen. querySourceFeatures only covers
// tiles currently loaded, so the cache is filled for every state at once on
// the first idle at the all-India view (see addStateBoundaryLayers) and
// topped up from whatever's loaded on later lookups.
const stateBoundsCache = new Map();

function cacheStateBounds(filter) {
  const features = map.querySourceFeatures('state-boundaries', { sourceLayer: 'LGD_States', filter });
  for (const f of features) {
    const name = String(f.properties.STNAME || '').toUpperCase();
    if (!name) continue;
    const bounds = stateBoundsCache.get(name) || new maplibregl.LngLatBounds();
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const polygon of polygons) for (const [lng, lat] of polygon[0]) bounds.extend([lng, lat]);
    stateBoundsCache.set(name, bounds);
  }
}

function stateBoundaryBounds(stateName) {
  const name = lgdStateName(stateName);
  if (!stateBoundsCache.has(name)) cacheStateBounds(['==', STATE_NAME_EXPR, name]);
  return stateBoundsCache.get(name) || null;
}

// Outlines one state (by dashboard name) and masks every other state white,
// or clears both with null.
function setActiveStateOutline(stateName) {
  if (!map || !map.getLayer('state-boundaries-active')) return;
  const name = stateName ? lgdStateName(stateName) : '';
  map.setFilter('state-boundaries-active', ['==', STATE_NAME_EXPR, name]);
  const isActive = ['==', STATE_NAME_EXPR, name];
  map.setPaintProperty('state-boundaries-mask', 'fill-color',
    stateName ? ['case', isActive, STATE_ACTIVE_FILL_COLOR, STATE_MASK_COLOR] : STATE_MASK_COLOR);
  // A zoom interpolate has to be the outermost expression, so the
  // active/inactive case goes inside each stop.
  const [z0, o0, z1, o1] = STATE_ACTIVE_FILL_OPACITY_STOPS;
  map.setPaintProperty('state-boundaries-mask', 'fill-opacity', stateName
    ? ['interpolate', ['linear'], ['zoom'],
      z0, ['case', isActive, o0, STATE_MASK_OPACITY],
      z1, ['case', isActive, o1, STATE_MASK_OPACITY]]
    : STATE_MASK_OPACITY);
  // Hovered state's label: full opacity and placed first in collision
  // detection, so a neighbour's label can't knock it out.
  map.setPaintProperty('state-boundaries-label', 'text-opacity',
    stateName ? ['case', ['==', STATE_NAME_EXPR, name], 1, 0.8] : 0.8);
  map.setLayoutProperty('state-boundaries-label', 'symbol-sort-key',
    stateName ? ['case', ['==', STATE_NAME_EXPR, name], 0, 1] : 1);
  // Markers for PAs outside the active state fade back.
  if (map.getLayer('protected-areas-markers')) {
    const opacity = stateName ? ['case', ['in', `|${stateName}|`, ['get', 'statesKey']], 1, 0.5] : 1;
    map.setPaintProperty('protected-areas-markers', 'circle-opacity', opacity);
    map.setPaintProperty('protected-areas-markers', 'circle-stroke-opacity', opacity);
    map.setPaintProperty('protected-areas-labels', 'text-opacity', opacity);
  }
}

// Adds the Eco-Sensitive Zone overlay as a fill + label layer pair, shown
// by default -- hidden when the map-layer-control checkbox is unchecked.
function addEszLayer() {
  addOsmPaHatchImages();
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
    paint: { 'fill-pattern': NIC_ESZ_HATCH.image, 'fill-opacity': NIC_ESZ_HATCH_OPACITY },
  });
  map.addLayer(sourceTagLayer('india-esz-source-tag', 'india-esz', ESZ_LAYER_SOURCE_LAYER, 'BHARATMAPS', '#166534'));
  // e.g. "NELLAI WLS ESZ"
  map.addLayer({
    id: 'india-esz-label',
    type: 'symbol',
    source: 'india-esz',
    'source-layer': ESZ_LAYER_SOURCE_LAYER,
    minzoom: PARIVESH_LABEL_MINZOOM,
    filter: ['has', 'Name'],
    layout: { ...PARIVESH_LABEL_LAYOUT, 'text-field': ['concat', ['get', 'Name'], ' ESZ'] },
    paint: PARIVESH_LABEL_PAINT,
  });
}

function setEszLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  for (const id of ['india-esz-fill', 'india-esz-source-tag', 'india-esz-label']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
  }
}

function initEszLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-esz');
  checkbox.addEventListener('change', () => setEszLayerVisibility(checkbox.checked));
}

// Adds the Wildlife Reserves & Corridors overlay (national parks, wildlife
// sanctuaries, tiger conservation corridors) as a fill + label layer pair.
// Shown by default, same toggle pattern as the ESZ layer above.
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
    paint: { 'fill-color': 'green', 'fill-opacity': PARIVESH_FILL_OPACITY },
  });
  // Dotted outline, so the faint fill's extent still reads.
  map.addLayer({
    id: 'india-wildlife-reserve-line',
    type: 'line',
    source: 'india-wildlife-reserve',
    'source-layer': WILDLIFE_RESERVE_LAYER_SOURCE_LAYER,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#16a34a',
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 12, 1.5],
      'line-dasharray': [0.1, 2],
      'line-opacity': 0.8,
    },
  });
  map.addLayer(sourceTagLayer('india-wildlife-reserve-source-tag', 'india-wildlife-reserve', WILDLIFE_RESERVE_LAYER_SOURCE_LAYER, 'BHARATMAPS', '#166534'));
  // e.g. "Periyar Tiger reserve"
  map.addLayer({
    id: 'india-wildlife-reserve-label',
    type: 'symbol',
    source: 'india-wildlife-reserve',
    'source-layer': WILDLIFE_RESERVE_LAYER_SOURCE_LAYER,
    minzoom: PARIVESH_LABEL_MINZOOM,
    filter: ['has', 'newname'],
    layout: {
      ...PARIVESH_LABEL_LAYOUT,
      'text-field': ['concat', ['get', 'newname'], ' ', ['coalesce', ['get', 'type'], '']],
    },
    paint: PARIVESH_LABEL_PAINT,
  });
}

function setWildlifeReserveLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  for (const id of ['india-wildlife-reserve-fill', 'india-wildlife-reserve-line', 'india-wildlife-reserve-source-tag', 'india-wildlife-reserve-label']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
  }
}

function initWildlifeReserveLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-wildlife-reserve');
  checkbox.addEventListener('change', () => setWildlifeReserveLayerVisibility(checkbox.checked));
}

// OSM protected areas, drawn above the Parivesh overlays: ESZ and
// eco-sensitive-area hatching at the bottom, then buffer zones, then the core
// areas filled by ESZ notification status, all with a 1px outline in their
// status colour.
function addOsmProtectedAreaLayer() {
  addOsmPaHatchImages();
  map.addSource('osm-protected-areas', {
    type: 'vector',
    url: `pmtiles://${OSM_PA_PMTILES_URL}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });
  const zone = osmPaZoneExpr();
  const statusById = osmPaStatusById();
  osmIdToPaKey = buildOsmIdToPaKey();
  const statusColor = osmPaStatusMatchExpr(statusById, (s) => PA_MARKER_STATUS_COLOR[s], OSM_PA_UNLINKED_COLOR);
  const eszHatch = osmPaStatusMatchExpr(statusById, osmPaEszHatchImage, osmPaEszHatchImage('unlinked'));
  const base = { source: 'osm-protected-areas', 'source-layer': OSM_PA_SOURCE_LAYER };
  map.addLayer({
    ...base,
    id: 'osm-pa-hatch',
    type: 'fill',
    filter: ['match', zone, ['esz', 'esa'], true, false],
    paint: { 'fill-pattern': ['case', ['==', zone, 'esa'], OSM_PA_ESA_HATCH.image, eszHatch] },
  });
  map.addLayer({
    ...base,
    id: 'osm-pa-buffer',
    type: 'fill',
    filter: ['==', zone, 'buffer'],
    paint: { 'fill-color': OSM_PA_BUFFER_COLOR, 'fill-opacity': OSM_PA_BUFFER_OPACITY },
  });
  map.addLayer({
    ...base,
    id: 'osm-pa-fill',
    type: 'fill',
    filter: ['==', zone, 'core'],
    paint: { 'fill-color': statusColor, 'fill-opacity': OSM_PA_CORE_OPACITY },
  });
  map.addLayer({
    ...base,
    id: 'osm-pa-line',
    type: 'line',
    // Outlined in the same status colour as the core fill (grey when unlinked).
    paint: { 'line-color': statusColor, 'line-width': 1 },
  });
  map.addLayer(sourceTagLayer('osm-pa-source-tag', base.source, base['source-layer'], 'OSM', statusColor));
  // Polygon names in dark-green italics, set apart from the PA marker labels
  // (which are placed first, so they win any collision).
  map.addLayer({
    ...base,
    id: 'osm-pa-label',
    type: 'symbol',
    minzoom: OSM_PA_LABEL_MINZOOM,
    filter: ['==', ['geometry-type'], 'Polygon'],
    layout: {
      'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
      'text-font': ['open_sans_regular_italic'],
      'text-size': ['interpolate', ['linear'], ['zoom'], OSM_PA_LABEL_MINZOOM, 10, 12, 12],
      'text-max-width': 8,
      'text-padding': 4,
    },
    paint: { 'text-color': '#14532d', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
  });
}

// 'esz' | 'esa' | 'buffer' | 'core' for an OSM protected-area feature, from
// its name and protection_title (OSM has no dedicated zone tag): e.g. "Kali
// TR ESZ", protection_title=Eco-Sensitive Zone; "Western Ghats Eco-Sensitive
// Area"; "Anamalai Tiger Reserve Buffer Area", "50m Wetland Buffer Zone",
// "Wetland Zone of Influence". Everything else is a core area.
function osmPaZoneExpr() {
  const text = ['downcase', ['concat',
    ['coalesce', ['get', 'name'], ''], ' | ', ['coalesce', ['get', 'name:en'], ''], ' | ',
    ['coalesce', ['get', 'protection_title'], '']]];
  const has = (...needles) => ['any', ...needles.map((n) => ['in', n, text])];
  return ['case',
    has('sensitive area'), 'esa',
    has('sensitive zone', 'esz'), 'esz',
    has('buffer', 'zone of influence'), 'buffer',
    'core'];
}

// Each linked OSM feature's ESZ notification status: the PA's own polygons
// (osmFeatureIds by wikidata tag, osmRelationIds from the protected-area
// list) and its ESZ polygons (osmEszIds, matched by name in
// build-full-join.js). A feature linked to several PAs takes the most
// advanced status.
function osmPaStatusById() {
  const rank = { final: 2, draft: 1, none: 0 };
  const statusById = new Map();
  for (const entry of paEntries) {
    const status = entry.eszStatus in rank ? entry.eszStatus : 'none';
    const ids = [
      ...(entry.osmFeatureIds || []),
      ...(entry.osmRelationIds || []).map((id) => `relation/${id}`),
      ...(entry.osmEszIds || []),
    ];
    for (const id of ids) {
      const prev = statusById.get(id);
      if (!prev || rank[status] > rank[prev]) statusById.set(id, status);
    }
  }
  return statusById;
}

// A ['match', @id, ...] expression giving valueFor(status) for each linked
// feature and `fallback` for the rest.
function osmPaStatusMatchExpr(statusById, valueFor, fallback) {
  const expr = ['match', ['get', '@id']];
  for (const status of PA_MARKER_STATUSES) {
    const ids = [...statusById].filter(([, s]) => s === status).map(([id]) => id);
    if (ids.length) expr.push(ids, valueFor(status));
  }
  return expr.length > 2 ? [...expr, fallback] : fallback;
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Diagonal-stripe fill patterns: one per ESZ status colour (plus grey for an
// unlinked ESZ), and the eco-sensitive-area one.
function addOsmPaHatchImages() {
  const ratio = 2;
  const hatches = [
    ...PA_MARKER_STATUSES.map((status) => ({
      ...OSM_PA_ESZ_HATCH, image: osmPaEszHatchImage(status), color: hexToRgba(PA_MARKER_STATUS_COLOR[status], OSM_PA_ESZ_HATCH.alpha),
    })),
    { ...OSM_PA_ESZ_HATCH, image: osmPaEszHatchImage('unlinked'), color: hexToRgba(OSM_PA_UNLINKED_COLOR, OSM_PA_ESZ_HATCH.alpha) },
    OSM_PA_ESA_HATCH,
    NIC_ESZ_HATCH,
  ];
  for (const { image, color, spacing, width } of hatches) {
    if (map.hasImage(image)) continue;
    const size = spacing * ratio;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = width * ratio;
    ctx.beginPath();
    // Three parallel 45° lines so the stripe stays continuous across tiles.
    for (const offset of [-size, 0, size]) {
      ctx.moveTo(offset, size);
      ctx.lineTo(offset + size, 0);
    }
    ctx.stroke();
    map.addImage(image, ctx.getImageData(0, 0, size, size), { pixelRatio: ratio });
  }
}

// OSM feature id -> the PA it's linked to (its own polygons, then its ESZ
// polygons), filled in by addOsmProtectedAreaLayer.
let osmIdToPaKey = new Map();

function buildOsmIdToPaKey() {
  const index = new Map();
  for (const field of ['own', 'esz']) {
    for (const entry of paEntries) {
      if (entry.coordinateLatitude == null) continue;
      const ids = field === 'own'
        ? [...(entry.osmFeatureIds || []), ...(entry.osmRelationIds || []).map((id) => `relation/${id}`)]
        : entry.osmEszIds || [];
      for (const id of ids) if (!index.has(id)) index.set(id, entry.paKey);
    }
  }
  return index;
}

// The PA linked to the topmost OSM polygon under a screen point (core fill
// over buffer over ESZ hatch), or null.
const OSM_PA_CLICK_LAYERS = ['osm-pa-fill', 'osm-pa-buffer', 'osm-pa-hatch'];
function osmPaKeyAt(point) {
  const layers = OSM_PA_CLICK_LAYERS.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none');
  if (!layers.length) return null;
  for (const f of map.queryRenderedFeatures(point, { layers })) {
    const key = osmIdToPaKey.get(f.properties['@id']);
    if (key) return key;
  }
  return null;
}

// Ends a PA's selection from the map: clears it and closes its card(s).
function deselectPa(paKey) {
  for (const cardEl of accordionEl.querySelectorAll('.pa-card.is-expanded')) {
    if (cardEl.dataset.paKey === paKey) toggleCard(cardEl, false);
  }
  clearSelection();
}

// The PA under a screen point: the circle whose centre is nearest the
// pointer (within a few px of slop), and only failing that a label -- so a
// big label, e.g. the selected PA's bold one, never hides the circles
// beneath it.
const PA_MARKER_LAYERS = ['protected-areas-markers', 'protected-areas-labels', 'protected-areas-active', 'protected-areas-active-label'];
const PA_CIRCLE_LAYERS = ['protected-areas-markers', 'protected-areas-active'];
const PA_LABEL_LAYERS = ['protected-areas-active-label', 'protected-areas-labels'];
const PA_CIRCLE_HIT_SLOP = 4;
function paMarkerAt(point) {
  const existing = (ids) => ids.filter((id) => map.getLayer(id));
  const s = PA_CIRCLE_HIT_SLOP;
  const circles = map.queryRenderedFeatures(
    [[point.x - s, point.y - s], [point.x + s, point.y + s]],
    { layers: existing(PA_CIRCLE_LAYERS) },
  );
  let nearest = null;
  let nearestDist = Infinity;
  for (const f of circles) {
    const p = map.project(f.geometry.coordinates);
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d < nearestDist) { nearest = f; nearestDist = d; }
  }
  if (nearest) return nearest;
  const labels = map.queryRenderedFeatures(point, { layers: existing(PA_LABEL_LAYERS) });
  return labels[0] || null;
}

function setOsmPaLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  for (const id of ['osm-pa-hatch', 'osm-pa-buffer', 'osm-pa-fill', 'osm-pa-line', 'osm-pa-source-tag', 'osm-pa-label']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
  }
}

function initOsmPaLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-osm-pa');
  checkbox.addEventListener('change', () => setOsmPaLayerVisibility(checkbox.checked));
}

function setPaPointsLayerVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  for (const id of PA_MARKER_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
  }
}

function initPaPointsLayerToggle() {
  const checkbox = document.getElementById('layer-toggle-pa-points');
  checkbox.addEventListener('change', () => setPaPointsLayerVisibility(checkbox.checked));
}

// Builds a GeoJSON point feature straight from a PA entry's already-joined
// fields -- the map never needs to look anything up in a separate payload.
// A PA's area for marker sizing: its OSM polygon's (measured consistently
// by build-osm-protected-areas.js) else Wikidata's, which is sometimes off
// by a unit conversion.
function entrySizeArea(entry) {
  return entry.osmAreaKm2 ?? entry.area ?? null;
}

// Tertile cut-offs over every mappable PA's area, computed once (from the
// unfiltered list, so a marker's size doesn't change with the filters).
let paAreaTertiles = null;
function paMarkerSizeScale(entry) {
  if (!paAreaTertiles) {
    const areas = paEntries
      .filter((e) => e.coordinateLatitude != null)
      .map(entrySizeArea).filter((a) => a != null)
      .sort((a, b) => a - b);
    paAreaTertiles = [areas[Math.floor(areas.length / 3)], areas[Math.floor((2 * areas.length) / 3)]];
  }
  const area = entrySizeArea(entry);
  if (area == null) return PA_MARKER_SIZE_SCALES[0];
  const bucket = area < paAreaTertiles[0] ? 0 : area < paAreaTertiles[1] ? 1 : 2;
  return PA_MARKER_SIZE_SCALES[bucket];
}

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
      // Every state the PA spans, '|'-delimited, for the out-of-state marker
      // dimming in setActiveStateOutline (feature properties can't be arrays).
      statesKey: `|${entry.state.join('|')}|`,
      iucnCategory: entry.iucnCategory,
      area: entry.area,
      pageBanner: entry.pageBanner,
      image: entry.image,
      osmRelationIds: entry.osmRelationIds,
      enwikiUrl: entry.enwikiUrl,
      eszStatus: entry.eszStatus,
      shortName: abbreviatePaName(entry.name),
      markerScale: paMarkerSizeScale(entry),
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
    clearSelection();
  }

  clearTimeout(fitBoundsTimer);
  if (!collection.features.length) return;
  fitBoundsTimer = setTimeout(() => {
    const bounds = new maplibregl.LngLatBounds();
    for (const f of collection.features) bounds.extend(f.geometry.coordinates);
    map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 500 });
    mapViewState = null;
    mapViewPa = null;
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

// The compact strip and the expanded wiki header are both built once, up
// front, as siblings -- expand/collapse then only toggles which one CSS
// shows (see .pa-card.is-expanded rules), rather than tearing down and
// rebuilding either on every toggle. That's what keeps re-expanding a card
// instant and image-flicker-free instead of re-fetching/re-rendering the
// Wikipedia excerpt and Commons gallery each time.
function cardOuterHtml(entry) {
  return `
    <div class="pa-card pa-card--${entry.eszStatus === 'final' || entry.eszStatus === 'draft' ? entry.eszStatus : 'none'}" data-pa-key="${escapeHtml(entry.paKey)}" title="${escapeHtml(entry.name || '')}">
      <div class="pa-card-row" tabindex="0" role="button" aria-expanded="false">
        <div class="pa-card-compact">${cardCompactInnerHtml(entry)}</div>
        <div class="pa-card-expanded-header"></div>
      </div>
      <div class="pa-card-detail"></div>
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
  findMaps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="13" height="16" rx="1.5"/><path d="M6 8.5h7M6 12h3"/><circle cx="15.5" cy="14.5" r="3.3"/><path d="m18 17 3 3"/></svg>',
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
  const osmId = entryOsmFeatureId(entry);
  if (osmId) {
    badges.push(`<a class="pa-title-logo pa-title-logo-osm" href="https://www.openstreetmap.org/${osmId}" target="_blank" rel="noopener" title="View on OpenStreetMap" aria-label="View on OpenStreetMap">${OSM_LOGO}</a>`);
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
  const digits = n.orderNumber ? (n.orderNumber.match(/\d+/) || [])[0] : null;
  if (!digits || !n.notificationDate) return { href: null, label: 'Archive PDF', disabled: true };
  const query = new URLSearchParams({
    query: `collection:"gazetteofindia" AND date:${n.notificationDate} AND description:(${digits})`,
  }).toString();
  return {
    href: `https://archive.org/search?${query}`,
    label: 'Search Archive PDF',
    disabled: true,
  };
}

function boundaryMapDoc(n, entry) {
  if (n.georeferencingLink) return { href: withAllmapsBbox(n.georeferencingLink, entry.allmapsBbox), label: 'Boundary Map', disabled: false };
  if (n.allmapsImagesLink) return { href: withAllmapsBbox(n.allmapsImagesLink, entry.allmapsBbox), label: 'Locate and Georeference Boundary Map', disabled: true };
  return { href: null, label: 'Boundary Map', disabled: true };
}

function boundaryDataDoc(entry) {
  const osmId = entryOsmFeatureId(entry);
  if (osmId) return { href: osmBoundaryHref(osmId), label: 'Boundary Data', disabled: false };
  return { href: null, label: 'Boundary Data', disabled: true };
}

function gazetteMapsPanelHtml(n, entry) {
  const archiveId = archiveIdFromLink(n.notificationArchiveLink);
  if (!archiveId) return '';
  return `<div class="gazette-maps" hidden data-archive-id="${escapeHtml(archiveId)}" data-map-pages="${(n.gazetteMapPages || []).join(',')}" data-bbox="${(entry.allmapsBbox || []).join(',')}"></div>`;
}

function docLinkHtml(doc, icon) {
  const cls = `pa-doc-link${doc.disabled ? ' is-disabled' : ''}`;
  const title = escapeHtml(doc.label);
  if (doc.button) return `<button type="button" class="${cls} gazette-maps-trigger" aria-expanded="false" title="${title}" aria-label="${title}">${icon}</button>`;
  if (!doc.href) return `<span class="${cls}" title="${title}" aria-label="${title}" aria-disabled="true">${icon}</span>`;
  return `<a class="${cls}" href="${doc.href}" target="_blank" rel="noopener" title="${title}" aria-label="${title}">${icon}</a>`;
}

function notificationRowHtml(n, entry) {
  const dotClass = NOTIFICATION_DOT_CLASS[n.notificationStatus] || 'dot-none';
  const docs = [
    [moefPdfDoc(n), DOC_ICON.pdf],
    [archivePdfDoc(n), DOC_ICON.archive],
    [boundaryMapDoc(n, entry), DOC_ICON.map],
    [boundaryDataDoc(entry), DOC_ICON.layers],
  ];
  const archiveId = archiveIdFromLink(n.notificationArchiveLink);
  if (archiveId) {
    const mapCount = (n.gazetteMapPages || []).length;
    const label = mapCount ? `Find maps in this gazette (${mapCount} likely map page${mapCount === 1 ? '' : 's'})` : 'Find maps in this gazette';
    docs.push([{ button: true, label }, DOC_ICON.findMaps]);
  }
  return `
    <li class="pa-notification-row">
      <span class="pa-notification-date">${escapeHtml(formatNotificationDate(n.notificationDate))}</span>
      <span class="pa-notification-type"><i class="dot ${dotClass}" aria-hidden="true"></i>${escapeHtml(notificationTypeLabel(n.notificationStatus))}</span>
      ${n.orderNumber ? `<span class="pa-notification-order">${escapeHtml(n.orderNumber)}</span>` : ''}
      <span class="pa-notification-docs">${docs.map(([doc, icon]) => docLinkHtml(doc, icon)).join('')}</span>
      ${gazetteMapsPanelHtml(n, entry)}
    </li>`;
}

function notificationListHtml(entry) {
  const sorted = [...entry.notifications].sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''));
  if (!sorted.length) return `<p class="pa-detail-empty">No ESZ notification on record yet.</p>`;
  return `<ul class="pa-notification-list">${sorted.map((n) => notificationRowHtml(n, entry)).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// Gazette map thumbnails, opened from the "Find maps" action on a
// notification row. Nothing is fetched until that button is pressed.
//
// 1. Likely map pages come with the data: build:gazette-maps records, per
//    gazette, the pages holding a map-size image embedded in the PDF (from the
//    Servants of Knowledge manifest, which the browser can't read itself: it
//    sends no CORS header) and the pages already georeferenced in Allmaps.
//    These show immediately.
// 2. "Scan all pages" (automatic when nothing was recorded, e.g. older scanned
//    gazettes) loads every page thumbnail from the archive.org IIIF manifest,
//    draws it to a canvas and keeps pages with enough clearly coloured pixels:
//    text and tables are black and white, annexure maps are in colour. Pages
//    are scanned last-first, because the annexures sit at the end.
// Allmaps annotations for the manifest (looked up by the sha1 id Allmaps
// uses) mark pages "Georeferenced"; the rest get "Add Georeferencing".
// Clicking a thumbnail opens that page in the Allmaps editor over the Survey
// of India basemap. "Show all" lists every page, with non-map pages greyed.
//
// Thumbnails come from archive.org's IIIF Image API (about 1 s each, with a
// CORS header so they can be measured). About one URL in four hangs and
// returns a 504 after a minute, and always the same URLs, while a different
// URL for the same page (v2 instead of v3, or a 1px different size) usually
// works. So a page that doesn't load within THUMB_TIMEOUT_MS is retried with
// the next URL variant. Allmaps links and annotation lookups use the v3 image
// id from the manifest, which is what Allmaps keys them by. A page whose
// variants all fail is reported as "couldn't be checked" and shown with
// archive.org's BookReader page image (displayable but, lacking CORS, not
// measurable).
const ALLMAPS_BG_URL = 'https://indianopenmaps.fly.dev/soi/osm/{z}/{x}/{y}.webp';
const GAZETTE_THUMB_SIZE = 160;
// Tuned on 2015-2024 gazettes: text pages score at most 0.02% coloured pixels,
// the faintest georeferenced 2015 map about 0.6%, modern colour maps 3-40%.
const COLOUR_CHROMA_MIN = 40; // max(r,g,b) - min(r,g,b) for a pixel to count as coloured
const COLOUR_FRACTION_MIN = 0.002; // share of coloured pixels for a page to count as a map
const THUMB_TIMEOUT_MS = 8000;
const THUMB_CONCURRENCY = 6;
const COLOUR_CACHE_KEY = 'gazettePageColour:v2';

const gazetteStates = new Map(); // archive id -> state, shared by every row showing that gazette
let colourCache = {};
try { colourCache = JSON.parse(localStorage.getItem(COLOUR_CACHE_KEY) || '{}'); } catch { colourCache = {}; }
function saveColourCache() {
  try { localStorage.setItem(COLOUR_CACHE_KEY, JSON.stringify(colourCache)); } catch { /* storage unavailable */ }
}

function archiveIdFromLink(link) {
  return link?.match(/archive\.org\/details\/([^/?#]+)/)?.[1] || null;
}

async function allmapsId(uri) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(uri));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Where the Allmaps editor opens its georeference map: the PA's Wikidata
// "located in" districts, else its state (entry.allmapsBbox, from
// build-full-join.js), else all of India.
const INDIA_BBOX = [68.1, 6.5, 97.4, 37.1];
const allmapsBboxParam = (bbox) => (bbox || INDIA_BBOX).join(',');

function allmapsEditorUrl(manifestUrl, imageServiceId, bbox) {
  const params = new URLSearchParams({
    url: manifestUrl, 'bg-preset': 'osm', 'bg-url': ALLMAPS_BG_URL, image: imageServiceId, bbox: allmapsBboxParam(bbox),
  });
  return `https://editor.allmaps.org/georeference?${params}`;
}

// The same for an editor link built at enrich time (data/enrichment-cache.csv).
function withAllmapsBbox(url, bbox) {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set('bbox', allmapsBboxParam(bbox));
  return u.href;
}

// Throttles measurable thumbnail loads across every open panel. The most
// recently started scan is served first (a higher batch number wins), in the
// order its pages were queued.
const thumbQueue = [];
let thumbsInFlight = 0;
let thumbBatch = 0;
function queueThumb(task, batch) {
  return new Promise((resolve) => {
    thumbQueue.push({ task, resolve, batch });
    pumpThumbQueue();
  });
}
function pumpThumbQueue() {
  while (thumbsInFlight < THUMB_CONCURRENCY && thumbQueue.length) {
    let next = 0;
    for (let i = 1; i < thumbQueue.length; i += 1) if (thumbQueue[i].batch > thumbQueue[next].batch) next = i;
    const { task, resolve } = thumbQueue.splice(next, 1)[0];
    thumbsInFlight += 1;
    task().then(resolve, () => resolve(null)).finally(() => { thumbsInFlight -= 1; pumpThumbQueue(); });
  }
}

// Measured at the thumbnail's own size: shrinking it further averages thin
// coloured boundary lines away.
function measureColour(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, THUMB_TIMEOUT_MS);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let coloured = 0;
      for (let i = 0; i < data.length; i += 4) {
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        if (max - min > COLOUR_CHROMA_MIN) coloured += 1;
      }
      resolve(coloured / (w * h));
    };
    img.onerror = () => { clearTimeout(timer); reject(new Error(`thumbnail failed: ${url}`)); };
    img.src = url;
  });
}

function thumbVariants(serviceId) {
  const v2 = serviceId.replace('/image/iiif/3/', '/image/iiif/2/');
  const v3 = serviceId.replace('/image/iiif/2/', '/image/iiif/3/');
  const n = GAZETTE_THUMB_SIZE;
  return [`${v2}/full/!${n},${n}/0/default.jpg`, `${v3}/full/!${n},${n}/0/default.jpg`, `${v2}/full/!${n + 1},${n + 1}/0/default.jpg`];
}

function gazetteState(archiveId, candidatePages) {
  if (!gazetteStates.has(archiveId)) {
    gazetteStates.set(archiveId, {
      archiveId,
      manifestUrl: `https://iiif.archive.org/iiif/${archiveId}/manifest.json`,
      candidates: new Set(candidatePages),
      pages: [],
      georeferenced: new Set(),
      loading: null, // promise for manifest + annotations
      error: null,
      scan: 'idle', // 'idle' | 'running' | 'done'
      scanned: 0,
      listeners: new Set(),
    });
  }
  return gazetteStates.get(archiveId);
}

function notifyGazette(state) { state.listeners.forEach((fn) => fn()); }

function loadGazettePages(state) {
  state.loading ??= (async () => {
    try {
      const [manifest, annotations] = await Promise.all([
        fetch(state.manifestUrl).then((r) => { if (!r.ok) throw new Error(`manifest HTTP ${r.status}`); return r.json(); }),
        allmapsId(state.manifestUrl)
          .then((id) => fetch(`https://annotations.allmaps.org/manifests/${id}`))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      for (const a of annotations?.items || []) {
        const src = a.target?.source;
        if (src) state.georeferenced.add(src.id || src['@id']);
      }
      state.pages = (manifest.items || []).map((canvas, index) => {
        const body = canvas.items?.[0]?.items?.[0]?.body;
        const service = [].concat(body?.service || [])[0];
        const serviceId = service?.id || service?.['@id'];
        return serviceId ? {
          index,
          page: index + 1, // archive.org leaf 0 is page 1
          serviceId,
          thumbVariants: thumbVariants(serviceId),
          iiifThumb: thumbVariants(serviceId)[0], // replaced by whichever variant loaded
          pageThumb: `https://archive.org/download/${state.archiveId}/page/n${index}_w${GAZETTE_THUMB_SIZE}.jpg`,
          colour: colourCache[serviceId],
          failed: false,
        } : null;
      }).filter(Boolean);
    } catch (err) {
      state.error = err.message;
    }
    notifyGazette(state);
  })();
  return state.loading;
}

async function scanGazette(state) {
  if (state.scan !== 'idle') return;
  state.scan = 'running';
  notifyGazette(state);
  await loadGazettePages(state);
  const batch = ++thumbBatch;
  let sinceSave = 0;
  state.scanned = 0;
  await Promise.all([...state.pages].reverse().map((p) => {
    if (p.colour != null) { state.scanned += 1; return null; }
    return queueThumb(async () => {
      for (const url of p.thumbVariants) {
        try {
          p.colour = await measureColour(url);
          p.iiifThumb = url;
          p.failed = false;
          break;
        } catch {
          p.failed = true; // not cached, so a later scan tries again
        }
      }
      if (p.failed) return;
      colourCache[p.serviceId] = Math.round(p.colour * 100000) / 100000;
      if (++sinceSave >= 10) { sinceSave = 0; saveColourCache(); }
    }, batch).then(() => { state.scanned += 1; notifyGazette(state); });
  }));
  saveColourCache();
  state.scan = 'done';
  notifyGazette(state);
}

const isMapPage = (state, p) => state.georeferenced.has(p.serviceId)
  || state.candidates.has(p.page)
  || (p.colour != null && p.colour >= COLOUR_FRACTION_MIN);

function gazetteThumbHtml(state, p, ignored, bbox) {
  const georef = state.georeferenced.has(p.serviceId);
  const badge = georef
    ? '<span class="gazette-thumb-badge is-done">Georeferenced</span>'
    : '<span class="gazette-thumb-badge">Add Georeferencing</span>';
  let title = `Page ${p.page}: ${georef ? 'open in the Allmaps editor' : 'add georeferencing in the Allmaps editor'}`;
  if (p.failed) title += " (couldn't check this page for colour)";
  // Same URL and crossorigin mode as the measuring load, so a measured page
  // comes straight from the browser cache.
  const img = p.failed
    ? `<img src="${escapeHtml(p.pageThumb)}" alt="Gazette page ${p.page}" loading="lazy" />`
    : `<img src="${escapeHtml(p.iiifThumb)}" alt="Gazette page ${p.page}" loading="lazy" crossorigin="anonymous" />`;
  return `<a class="gazette-thumb${ignored ? ' is-ignored' : ''}${p.failed ? ' is-unchecked' : ''}" href="${escapeHtml(allmapsEditorUrl(state.manifestUrl, p.serviceId, bbox))}"
      target="_blank" rel="noopener" title="${escapeHtml(title)}">
      ${img}
      ${badge}
      <span class="gazette-thumb-page">p. ${p.page}</span>
    </a>`;
}

function renderGazetteMaps(el, state) {
  const showAll = el.dataset.showAll === 'true';
  const bbox = el.dataset.bbox ? el.dataset.bbox.split(',').map(Number) : null;
  const maps = state.pages.filter((p) => isMapPage(state, p));
  const failed = state.pages.filter((p) => p.failed && !isMapPage(state, p));
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  let status;
  if (state.error) status = `Couldn't load the gazette scan (${escapeHtml(state.error)}).`;
  else if (!state.pages.length) status = 'Loading gazette pages&hellip;';
  else if (state.scan === 'running') status = `Scanning pages for colour maps&hellip; ${state.scanned} of ${state.pages.length}, ${maps.length} found`;
  else if (state.scan === 'done') {
    status = maps.length ? `${plural(maps.length, 'map page')} in this gazette` : 'No colour map pages found in this gazette';
    if (failed.length) status += ` &middot; ${plural(failed.length, 'page')} couldn't be checked`;
  } else {
    status = maps.length
      ? `${plural(maps.length, 'likely map page')}, from images in the gazette PDF and Allmaps`
      : 'No map pages recorded for this gazette';
  }
  const buttons = [];
  if (state.pages.length && state.scan === 'idle') {
    buttons.push('<button type="button" class="gazette-maps-btn" data-gazette-action="scan" title="Check every page for colour maps (slow: about a second a page)">Scan all pages</button>');
  }
  if (state.pages.length) {
    buttons.push(`<button type="button" class="gazette-maps-btn" data-gazette-action="show-all" aria-pressed="${showAll}">${showAll ? 'Show maps only' : `Show all (${state.pages.length})`}</button>`);
  }
  const shown = showAll ? state.pages : maps;
  const scrollLeft = el.querySelector('.gazette-thumbs')?.scrollLeft || 0;
  el.innerHTML = `
    <div class="gazette-maps-status"><span>${status}</span><span class="gazette-maps-actions">${buttons.join('')}</span></div>
    ${shown.length ? `<div class="gazette-thumbs">${shown.map((p) => gazetteThumbHtml(state, p, showAll && !isMapPage(state, p), bbox)).join('')}</div>` : ''}`;
  const strip = el.querySelector('.gazette-thumbs');
  if (strip) strip.scrollLeft = scrollLeft;
}

// Wires a .gazette-maps panel to its gazette's shared state; re-renders as
// pages load and scanning progresses, until the panel leaves the DOM.
function attachGazettePanel(el) {
  const candidates = (el.dataset.mapPages || '').split(',').filter(Boolean).map(Number);
  const state = gazetteState(el.dataset.archiveId, candidates);
  let pending = false;
  const render = () => {
    if (!el.isConnected) { state.listeners.delete(render); return; }
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; if (el.isConnected) renderGazetteMaps(el, state); });
  };
  state.listeners.add(render);
  renderGazetteMaps(el, state);
  loadGazettePages(state).then(() => {
    // Nothing recorded for this gazette: scanning is the only way to find maps.
    if (!state.error && state.candidates.size === 0 && state.georeferenced.size === 0) scanGazette(state);
  });
  return state;
}

// Delegated handler for the "Find maps" row action and the panel buttons.
function handleGazetteMapsClick(e) {
  const trigger = e.target.closest('.gazette-maps-trigger');
  if (trigger) {
    const panel = trigger.closest('.pa-notification-row').querySelector('.gazette-maps');
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open && !panel.dataset.attached) {
      panel.dataset.attached = 'true';
      attachGazettePanel(panel);
    }
    return true;
  }
  const btn = e.target.closest('[data-gazette-action]');
  if (!btn) return false;
  const panel = btn.closest('.gazette-maps');
  const state = gazetteStates.get(panel.dataset.archiveId);
  if (!state) return true;
  if (btn.dataset.gazetteAction === 'scan') scanGazette(state);
  if (btn.dataset.gazetteAction === 'show-all') {
    panel.dataset.showAll = panel.dataset.showAll === 'true' ? 'false' : 'true';
    renderGazetteMaps(panel, state);
  }
  return true;
}

// Replaces the compact row's thumb/name/status with the full wiki-sourced
// header (bigger image + Commons gallery, title with logos, meta, excerpt)
// when a card expands -- this *is* the row's expanded state, not a separate
// panel, so there's no duplicate title/image sitting below it.
function detailHeaderHtml(entry) {
  const thumb = entry.pageBanner || entry.image;
  const meta = [];
  if (entry.iucnCategory) meta.push(escapeHtml(entry.iucnCategory.replace(/^IUCN category [IVXLC]+:\s*/, '')));
  if (entry.area) meta.push(`${entry.area.toLocaleString()} km&sup2;`);
  const stateLabel = stateAsString(entry.state);
  if (stateLabel) meta.push(escapeHtml(stateLabel));

  const links = [];
  const osmId = entryOsmFeatureId(entry);
  if (osmId) {
    const where = osmId.startsWith('relation/') ? 'amche-atlas' : 'OpenStreetMap';
    links.push(`<a href="${osmBoundaryHref(osmId)}" target="_blank" rel="noopener">Boundary in ${where}</a>`);
  }

  return `
    <div class="pa-detail-grid">
      <div class="pa-detail-media">
        ${thumb ? `<a href="${commonsFilePageUrl(thumb)}" target="_blank" rel="noopener"><img class="pa-detail-image" src="${commonsThumbnailUrl(thumb, 120)}" alt="" loading="lazy" /></a>` : ''}
        ${entry.wikidataId ? `<div class="pa-commons-mosaic" aria-label="More images from Wikimedia Commons"></div>` : ''}
      </div>
      <div class="pa-detail-body">
        <h3 class="pa-detail-title"><a class="pa-permalink" href="${escapeHtml(paKeyHash(entry.paKey))}" title="Link to this protected area" aria-label="Link to this protected area">#</a>${paTitleLinksHtml(entry)}</h3>
        ${meta.length ? `<p class="pa-detail-meta">${meta.join(' &middot; ')}</p>` : ''}
        ${links.length ? `<p class="pa-detail-links">${links.join(' &middot; ')}</p>` : ''}
        <p class="pa-detail-excerpt">${entry.enwikiUrl ? 'Loading Wikipedia summary&hellip;' : ''}</p>
      </div>
    </div>`;
}

// The only thing that pops open in the separate detail pane below the row.
function notificationSectionHtml(entry) {
  return `
    <h4 class="pa-notification-heading"><a href="https://www.moef.gov.in/esz-notifications" target="_blank" rel="noopener">History of Eco-Sensitive Zone Notifications</a></h4>
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
  applyExcerpt(cardEl, result, entry.enwikiUrl);
}

function applyExcerpt(cardEl, result, wikiUrl) {
  const excerptEl = cardEl.querySelector('.pa-detail-excerpt');
  if (!excerptEl) return; // card was collapsed/re-rendered before the fetch resolved
  if (!result || !result.extract) { excerptEl.remove(); return; }
  excerptEl.innerHTML = `${escapeHtml(result.extract)} <a class="pa-excerpt-more" href="${wikiUrl}" target="_blank" rel="noopener">Read more on Wikipedia</a>`;
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
  const galleryUrl = `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(category)}`;
  const imagesHtml = images.map((img) => `
    <a href="${img.pageUrl}" target="_blank" rel="noopener">
      <img src="${img.thumbUrl}" alt="" loading="lazy" />
    </a>`).join('');
  mosaicEl.innerHTML = `${imagesHtml}<a class="pa-commons-edit" href="${galleryUrl}" target="_blank" rel="noopener">[Edit Photos]</a>`;
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
  if (!entry.wikidataId || entry.coordinateLatitude == null) { clearSelection(); return; }
  zoomToEntry(entry);
  selectedWikidataId = entry.wikidataId;
  highlightCard(selectedWikidataId);
}

// Zooms the map to a selected PA: fits its OSM boundary's bbox
// (entry.osmBbox, from build-full-join.js) when it's mapped in OSM, else
// flies to its Wikidata point.
function zoomToEntry(entry) {
  if (entry.osmBbox) {
    const [w, s, e, n] = entry.osmBbox;
    map.fitBounds([[w, s], [e, n]], { padding: mapOverlayPadding(24), maxZoom: 14, duration: 800 });
  } else {
    focusFeature(entryToFeature(entry), { zoom: 10 });
  }
  mapViewState = null; // no longer framing a whole state
  mapViewPa = entry.wikidataId;
}

// The open PA: the selected one, else the most recently expanded card that's
// still open (a map click clears the selection but leaves its card open).
function openPaKey() {
  if (selectedWikidataId) return selectedWikidataId;
  const keys = [...expandedCards].filter((k) => entryByPaKey.get(k)?.coordinateLatitude != null);
  return keys.length ? keys[keys.length - 1] : null;
}

// While a PA is open, puts the map back on it if something (a state-header
// hover, another card's hover, a manual pan/zoom) has moved the view away.
// Returns whether there is an open PA.
function returnToOpenPa() {
  const key = openPaKey();
  if (!map || !key) return false;
  const entry = entryByPaKey.get(key);
  if (mapViewPa !== entry.wikidataId) zoomToEntry(entry);
  return true;
}

function toggleCard(cardEl, shouldExpand, { syncMap = true } = {}) {
  const paKey = cardEl.dataset.paKey;
  const entry = entryByPaKey.get(paKey);
  if (!entry) return;
  const rowEl = cardEl.querySelector('.pa-card-row');
  const headerEl = cardEl.querySelector('.pa-card-expanded-header');
  const detailEl = cardEl.querySelector('.pa-card-detail');
  if (shouldExpand) {
    expandedCards.delete(paKey); // re-added last: the most recently opened PA (see openPaKey)
    expandedCards.add(paKey);
    cardEl.classList.add('is-expanded');
    rowEl.setAttribute('aria-expanded', 'true');
    // Only build the header (and kick off the excerpt/mosaic fetches) the
    // first time this card expands -- re-expanding later just shows what's
    // already there.
    if (!headerEl.childElementCount) {
      headerEl.innerHTML = detailHeaderHtml(entry);
      loadExcerpt(entry, cardEl);
      loadCommonsMosaic(entry, cardEl);
    }
    detailEl.innerHTML = notificationSectionHtml(entry);
    if (syncMap) selectEntryOnMap(entry);
  } else {
    expandedCards.delete(paKey);
    cardEl.classList.remove('is-expanded');
    rowEl.setAttribute('aria-expanded', 'false');
    detailEl.innerHTML = '';
    if (selectedWikidataId === entry.wikidataId) clearSelection();
  }
  syncUrlHash();
}

function toggleState(stateName) {
  if (openStates.has(stateName)) {
    openStates.delete(stateName);
    if (stateName === selectedState) deselectState();
  } else {
    openStates.add(stateName);
    selectState(stateName);
  }
  renderAccordion();
}

// Opens a PA's state section(s), scrolls to its card, and expands its detail
// -- used when a map marker is clicked (the marker's own click handler
// already selected the PA and fitted its state, so map sync is skipped here).
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

// Bumped on every card hover enter/leave, so a PA focus waiting on a state
// fit (see onCardHoverEnter) is dropped if the pointer has moved on.
let cardHoverToken = 0;

// Hovering a PA card first makes sure the map is showing the card's state --
// fitting to it if the map is elsewhere (e.g. the pointer came straight from
// another state's header), or letting a fit to it that's still animating
// finish -- and only then pans to the PA and shows its name badge, so the PA
// focus doesn't cut the state fit short.
function onCardHoverEnter(cardEl) {
  // Coming back to the open PA's card brings it back into view.
  if (cardEl.dataset.paKey === openPaKey()) {
    returnToOpenPa();
    return;
  }
  if (selectedWikidataId) return; // a card/marker is selected -- hover is suspended until cleared
  const entry = entryByPaKey.get(cardEl.dataset.paKey);
  if (!entry || entry.coordinateLatitude == null) return;
  const token = ++cardHoverToken;
  const stateName = cardEl.closest('.state-row')?.dataset.stateRow;
  const focusPa = () => {
    if (token !== cardHoverToken || selectedWikidataId) return;
    focusFeature(entryToFeature(entry));
    setActivePaMarker(entry.wikidataId);
  };
  if (stateName) {
    clearTimeout(stateHoverTimer); // a header hover's pending fit is superseded
    setActiveStateOutline(stateName);
    if (mapViewState !== stateName) fitMapToState(stateName);
  }
  if (map.isMoving()) map.once('moveend', focusPa);
  else focusPa();
}

function onCardHoverLeave() {
  cardHoverToken += 1;
  if (selectedWikidataId) return;
  setActivePaMarker(null);
  setActiveStateOutline(selectedState);
}

// The selected state: the most recently expanded accordion state, or one
// clicked on the map. It stays outlined (with the rest of the map masked)
// until it's collapsed or the map is clicked outside every state. Hovering
// another state's header previews that state, then falls back to this one.
let selectedState = null;

// Hovering a state header highlights that state over the all-India view.
// Debounced so sweeping the pointer down the list doesn't fly the map
// through every state on the way.
let stateHoverTimer = null;
// Set once a state hover has moved the map, so leaving the list knows to
// put the selected state's (or the all-India) view back.
let stateHoverMovedMap = false;
// The state the map was last fitted to (null once it's been moved to some
// other view: all-India, or a filter-driven fit), so a PA card hover knows
// whether it has to bring its state into view first.
let mapViewState = null;
// The PA the map was last zoomed to with zoomToEntry (null once the view has
// moved elsewhere), so leaving the list or re-hovering the selected card can
// put the selected PA back in view.
let mapViewPa = null;

function selectState(stateName) {
  clearTimeout(stateHoverTimer);
  selectedState = stateName;
  setActiveStateOutline(stateName);
  fitMapToState(stateName, { force: true });
  stateHoverMovedMap = false; // the map is where the selection wants it
}

function deselectState() {
  clearTimeout(stateHoverTimer);
  selectedState = null;
  stateHoverMovedMap = false;
  setActiveStateOutline(null);
  if (map) map.flyTo({ ...INITIAL_VIEW, duration: 500, essential: true });
  mapViewState = null;
  mapViewPa = null;
}

// LGD (upper-case) state name -> the dashboard's name for it, over every
// state any PA lists (filtered or not).
function dashboardStateName(lgdName) {
  for (const entry of paEntries) {
    for (const state of entry.state) if (lgdStateName(state) === lgdName) return state;
  }
  return null;
}

// Map click: on a state, switch the selection (and the expanded accordion
// row) to it; outside every state, collapse and clear the selected state.
function onMapStateClick(e) {
  const hit = map.queryRenderedFeatures(e.point, { layers: ['state-boundaries-mask'] })[0];
  const lgdName = hit ? String(hit.properties.STNAME || '').toUpperCase() : '';
  if (!lgdName) {
    if (!selectedState) return;
    openStates.delete(selectedState);
    deselectState();
    renderAccordion();
    return;
  }
  // States with no PAs in the dataset have no accordion row, but can still
  // be selected on the map under their LGD name.
  const stateName = dashboardStateName(lgdName) || lgdName;
  if (stateName === selectedState) return;
  if (selectedState) openStates.delete(selectedState);
  openStates.add(stateName);
  selectState(stateName);
  renderAccordion();
  const header = [...accordionEl.querySelectorAll('.state-row-header')].find((el) => el.dataset.state === stateName);
  if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// `force` is for an explicit state selection, which should move the map even
// while a PA is selected; a hover preview never yanks the map away from one.
function fitMapToState(stateName, { force = false } = {}) {
  if (!map || (selectedWikidataId && !force)) return;
  let bounds = stateBoundaryBounds(stateName);
  if (!bounds) {
    // No boundary polygon for this name (e.g. "Unspecified state") -- fall
    // back to the extent of its PA markers.
    const entries = buildStateGroups(filteredEntries).get(stateName) || [];
    bounds = new maplibregl.LngLatBounds();
    for (const entry of entries) {
      if (entry.coordinateLatitude == null) continue;
      bounds.extend([entry.coordinateLongitude, entry.coordinateLatitude]);
    }
    if (bounds.isEmpty()) return;
  }
  clearTimeout(fitBoundsTimer); // a pending filter-driven fit would undo this one
  map.fitBounds(bounds, { padding: mapOverlayPadding(24), maxZoom: 9, duration: 500 });
  mapViewState = stateName;
  mapViewPa = null;
  stateHoverMovedMap = true;
}

// fitBounds padding that clears the map's overlays -- the layer toggle panel
// (top-left) and the attribution box (bottom) -- so a fitted state isn't
// hidden under them in the narrow map column. Each side gets `base` plus
// whatever an overlay pinned to that edge covers.
function mapOverlayPadding(base) {
  const mapRect = map.getContainer().getBoundingClientRect();
  const pad = { top: base, bottom: base, left: base, right: base };
  const overlays = [
    document.getElementById('map-layer-control'),
    map.getContainer().querySelector('.maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib'),
    map.getContainer().querySelector('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib'),
  ];
  for (const el of overlays) {
    if (!el || !el.offsetParent) continue;
    const r = el.getBoundingClientRect();
    const fromTop = r.bottom - mapRect.top;
    const fromBottom = mapRect.bottom - r.top;
    if (fromTop < mapRect.height / 2) pad.top = Math.max(pad.top, fromTop + base);
    else if (fromBottom < mapRect.height / 2) pad.bottom = Math.max(pad.bottom, fromBottom + base);
  }
  // fitBounds throws if padding leaves no room; give up the extra in that case.
  if (pad.top + pad.bottom >= mapRect.height - 40) return base;
  return pad;
}

// Flies to the all-India view for a state-header hover (unless the map is
// already there); leaving the list puts the open PA / selected state back.
function showIndiaView() {
  if (!map) return;
  const atIndia = !mapViewState && !mapViewPa
    && Math.abs(map.getZoom() - INITIAL_VIEW.zoom) < 0.05
    && map.getCenter().distanceTo(maplibregl.LngLat.convert(INITIAL_VIEW.center)) < 20000;
  if (!atIndia) map.flyTo({ ...INITIAL_VIEW, duration: 500, essential: true });
  mapViewState = null;
  mapViewPa = null;
  stateHoverMovedMap = true;
}

function resetMapAfterStateHover() {
  clearTimeout(stateHoverTimer);
  if (!map) return;
  // While a PA is open, the map always goes back to it.
  if (returnToOpenPa()) {
    stateHoverMovedMap = false;
    return;
  }
  if (!stateHoverMovedMap) return;
  if (selectedState) {
    fitMapToState(selectedState);
  } else {
    map.flyTo({ ...INITIAL_VIEW, duration: 500, essential: true });
    mapViewState = null;
    mapViewPa = null;
  }
  stateHoverMovedMap = false;
}

function initAccordionEvents() {
  accordionEl.addEventListener('click', (e) => {
    if (handleGazetteMapsClick(e)) return;
    // An expanded row hosts real links (Wikipedia, Commons, amche-atlas...)
    // -- let those navigate instead of toggling the card closed.
    if (e.target.closest('a[href]')) return;
    const row = e.target.closest('.pa-card-row');
    if (row) {
      const card = row.closest('.pa-card');
      if (card) toggleCard(card, !card.classList.contains('is-expanded'));
      return;
    }
    const header = e.target.closest('.state-row-header');
    if (header) toggleState(header.dataset.state);
  });
  accordionEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.pa-card-row');
    if (row && e.target === row) {
      e.preventDefault();
      const card = row.closest('.pa-card');
      toggleCard(card, !card.classList.contains('is-expanded'));
    }
  });
  // mouseenter/mouseleave don't bubble, so delegation uses mouseover/mouseout
  // with a relatedTarget check to only fire once per card boundary crossing.
  accordionEl.addEventListener('mouseover', (e) => {
    const stateHeader = e.target.closest('.state-row-header');
    if (stateHeader && !stateHeader.contains(e.relatedTarget)) {
      // Highlight the state as if selected, over the all-India view --
      // except the selected state's own header, which leaves the map on it
      // (clicking a header re-renders the list, so this fires again right
      // after the click has fitted the map to the newly selected state).
      clearTimeout(stateHoverTimer);
      setActiveStateOutline(stateHeader.dataset.state);
      if (stateHeader.dataset.state !== selectedState) stateHoverTimer = setTimeout(showIndiaView, 150);
    }
    const card = e.target.closest('.pa-card');
    if (card && !card.contains(e.relatedTarget)) onCardHoverEnter(card);
  });
  accordionEl.addEventListener('mouseout', (e) => {
    const stateHeader = e.target.closest('.state-row-header');
    if (stateHeader && !stateHeader.contains(e.relatedTarget)) {
      clearTimeout(stateHoverTimer);
      setActiveStateOutline(selectedState);
    }
    const card = e.target.closest('.pa-card');
    if (card && !card.contains(e.relatedTarget)) onCardHoverLeave();
  });
  // mouseleave on the accordion itself fires once, when the pointer exits the list.
  accordionEl.addEventListener('mouseleave', resetMapAfterStateHover);
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

// Mapping progress below the map, over the PAs passing the current filters:
// - ESZ maps georeferenced: PAs with an ESZ notification whose gazette has
//   at least one map georeferenced in Allmaps (counts from build:gazette-maps);
// - Digitized on OSM: PAs linked to an OSM boundary.
function setProgress(prefix, done, total, desc) {
  const pct = total ? (done / total) * 100 : 0;
  document.getElementById(`progress-${prefix}-value`).textContent = total ? `${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%` : '–';
  const bar = document.getElementById(`progress-${prefix}-bar`);
  bar.setAttribute('aria-valuenow', pct.toFixed(1));
  bar.querySelector('.mapping-progress-fill').style.width = `${pct}%`;
  document.getElementById(`progress-${prefix}-desc`).textContent = desc;
}

function renderMappingProgress() {
  const fmt = (n) => n.toLocaleString();
  const notified = filteredEntries.filter((e) => e.notifications.length > 0);
  const withMaps = notified.filter((e) => e.notifications.some((n) => n.gazetteMaps > 0));
  const georeferenced = notified.filter((e) => e.notifications.some((n) => n.georeferencedMaps > 0));
  setProgress('georef', georeferenced.length, notified.length,
    `${fmt(georeferenced.length)} of ${fmt(notified.length)} protected areas with an ESZ notification · `
    + `${fmt(withMaps.length)} have map images found in their gazette`);
  const onOsm = filteredEntries.filter(entryHasBoundaryData);
  setProgress('osm', onOsm.length, filteredEntries.length,
    `${fmt(onOsm.length)} of ${fmt(filteredEntries.length)} protected areas have an OSM boundary linked by Wikidata ID`);
  document.getElementById('mapping-progress-scope').textContent = anyFiltersActive()
    ? 'For the protected areas matching the current filters.'
    : 'For all protected areas in the dashboard.';
}

function applyFilters() {
  filteredEntries = computeFilteredEntries();
  renderAccordion();
  updateMapFilter();
  renderMappingProgress();
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
  initOsmPaLayerToggle();
  initNotificationMapsLayerToggle();
  initAccordionEvents();
  applyFilters();
  initFilterEvents();
  initDownloadDropdown();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#d03b3b">Failed to load dashboard data: ${err.message}</p>`);
});
