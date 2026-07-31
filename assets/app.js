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

async function loadData() {
  const res = await fetch('data/full-join.json');
  paEntries = await res.json();
  entryByPaKey = new Map(paEntries.map((e) => [e.paKey, e]));
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
    && matchesStateFilter(entry.state) && matchesSearch(entry));
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
// stragglers behind a large notified majority.
function computeStateNotificationStats() {
  const byState = new Map();
  for (const entry of paEntries) {
    for (const state of entry.state) {
      if (!state) continue;
      const rec = byState.get(state) || { total: 0, notified: 0 };
      rec.total += 1;
      if (entry.eszStatus === 'final' || entry.eszStatus === 'draft') rec.notified += 1;
      byState.set(state, rec);
    }
  }
  let fullyNotified = 0;
  for (const rec of byState.values()) {
    if (rec.total > 0 && rec.notified === rec.total) fullyNotified += 1;
  }
  return { fullyNotified, totalStates: byState.size };
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

  const { fullyNotified, totalStates } = computeStateNotificationStats();
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

// PA entries with no wikidataId -- the "right-hand" side of the full join
// that Wikidata doesn't know about yet.
function computeUnmatchedPAs() {
  return paEntries
    .filter((entry) => !entry.wikidataId)
    .filter((entry) => matchesTypeFilter(entry.protectedAreaType))
    .filter((entry) => matchesStateFilter(entry.state))
    .map((entry) => ({
      state: entry.state[0] || '',
      protectedAreaName: entry.name,
      protectedAreaType: entry.protectedAreaType,
      recordCount: entry.notifications.length,
      statuses: [...new Set(entry.notifications.map((n) => n.notificationStatus).filter(Boolean))],
    }))
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || a.protectedAreaName.localeCompare(b.protectedAreaName));
}

function unmatchedRowHtml(pa) {
  const statuses = [...pa.statuses].sort().join(', ') || '–';
  return `
    <tr>
      <td>${escapeHtml(pa.state || '')}</td>
      <td>${escapeHtml(pa.protectedAreaName || '')}</td>
      <td>${escapeHtml(pa.protectedAreaType || '')}</td>
      <td>${pa.recordCount}</td>
      <td>${escapeHtml(statuses)}</td>
    </tr>`;
}

function renderQaList() {
  const unmatchedPAs = computeUnmatchedPAs();
  document.getElementById('qa-count').textContent = unmatchedPAs.length.toLocaleString();
  document.getElementById('qa-table-body').innerHTML = unmatchedPAs.map(unmatchedRowHtml).join('');
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

function notificationRowHtml(n) {
  const dotClass = n.notificationStatus === 'Final' ? 'dot-final' : n.notificationStatus === 'Draft' ? 'dot-draft' : 'dot-none';
  const links = [];
  if (n.orderNumber && n.notificationPdfLink) links.push(`<a href="${n.notificationPdfLink}" target="_blank" rel="noopener">${escapeHtml(n.orderNumber)}</a>`);
  else if (n.orderNumber) links.push(escapeHtml(n.orderNumber));
  if (n.notificationArchiveLink) links.push(`<a href="${n.notificationArchiveLink}" target="_blank" rel="noopener">Archive</a>`);
  if (n.georeferencingLink) links.push(`<a href="${n.georeferencingLink}" target="_blank" rel="noopener">Georeference</a>`);
  return `
    <li class="pa-notification-row">
      <span class="status-pill"><i class="dot ${dotClass}" aria-hidden="true"></i>${escapeHtml(n.notificationStatus || 'Not notified')}</span>
      <span class="pa-notification-date">${escapeHtml(n.notificationDate || '–')}</span>
      <span class="pa-notification-links">${links.join(' &middot; ') || '–'}</span>
    </li>`;
}

function notificationListHtml(entry) {
  const sorted = [...entry.notifications].sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''));
  if (!sorted.length) return `<p class="pa-detail-empty">No ESZ notification on record yet.</p>`;
  return `<ul class="pa-notification-list">${sorted.map(notificationRowHtml).join('')}</ul>`;
}

function detailHtml(entry) {
  const thumb = entry.pageBanner || entry.image;
  const meta = [];
  if (entry.iucnCategory) meta.push(escapeHtml(entry.iucnCategory.replace(/^IUCN category [IVXLC]+:\s*/, '')));
  if (entry.area) meta.push(`${entry.area.toLocaleString()} km&sup2;`);
  const stateLabel = stateAsString(entry.state);
  if (stateLabel) meta.push(escapeHtml(stateLabel));

  const links = [];
  if (entry.wikidataUrl) links.push(`<a href="${entry.wikidataUrl}" target="_blank" rel="noopener">Wikidata</a>`);
  if (entry.enwikiUrl) links.push(`<a href="${entry.enwikiUrl}" target="_blank" rel="noopener">Wikipedia</a>`);
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
        <h3 class="pa-detail-title">${escapeHtml(entry.name || '')}</h3>
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

function applyFilters() {
  filteredEntries = computeFilteredEntries();
  renderAccordion();
  updateMapFilter();
  document.getElementById('result-count').textContent =
    `${filteredEntries.length.toLocaleString()} of ${paEntries.length.toLocaleString()} protected areas`;
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

function setPaTypeFilter(value) {
  paTypeFilter = value;
  applyFilters();
  renderQaList();
  renderNoCoordList();
}

function initTypeFilter() {
  const select = document.getElementById('pa-type-filter');
  for (const type of collectProtectedAreaTypes()) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  }
  const hasUnspecified = paEntries.some((entry) => !entry.protectedAreaType);
  if (hasUnspecified) {
    const opt = document.createElement('option');
    opt.value = UNSPECIFIED_TYPE;
    opt.textContent = 'Unspecified type';
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

function setPaStateFilter(value) {
  paStateFilter = value;
  applyFilters();
  renderQaList();
  renderNoCoordList();
}

function initStateFilter() {
  const select = document.getElementById('pa-state-filter');
  for (const state of collectStates()) {
    const opt = document.createElement('option');
    opt.value = state;
    opt.textContent = state;
    select.appendChild(opt);
  }
  const hasUnspecified = paEntries.some((entry) => entry.state.length === 0);
  if (hasUnspecified) {
    const opt = document.createElement('option');
    opt.value = UNSPECIFIED_STATE;
    opt.textContent = 'Unspecified state';
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
    applyFilters();
    renderQaList();
    renderNoCoordList();
  });
  document.getElementById('export-filtered').addEventListener('click', exportFilteredCsv);
}

async function main() {
  await loadData();
  initTypeFilter();
  initStateFilter();
  renderHeroStats();
  renderQaList();
  renderNoCoordList();
  initAtlasLink();
  initMap();
  initAccordionEvents();
  applyFilters();
  initFilterEvents();
  initDownloadDropdown();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#d03b3b">Failed to load dashboard data: ${err.message}</p>`);
});
