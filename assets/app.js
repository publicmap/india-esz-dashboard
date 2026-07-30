// Dashboard logic: loads a single pre-joined data file, computes KPIs,
// renders the MapLibre map + grouped/filterable notification table (via
// Tabulator), and wires up CSV export. No build step -- dependencies are
// loaded as ES modules straight from a CDN.

import { TabulatorFull as Tabulator } from 'https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator_esm.min.js';
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
// is the only thing fetched over the network to render the table and map;
// the per-source CSV/JSON/GeoJSON exports linked from the toolbar are
// downloaded directly from GitHub instead of being loaded by the page.
let paEntries = [];
// Keyed by entry.paKey (== wikidataId when matched, else the state+name
// fallback key) -- the join key shared with each flattened table row's
// `_paKey`, used to look up a PA's aggregate status/metadata from a row or a
// map feature without re-scanning the full entry list.
let entryByPaKey = new Map();
let tableRecords = [];
let filteredRecords = [];
let searchTerm = '';

// Top-down PA-type filter driven by the "Protected areas in India" dropdown --
// applies to the KPIs, the QA unmatched list, the table, and (via the table's
// filtered records) the map. '' means no filter; UNSPECIFIED_TYPE is a
// sentinel for records/PAs with no protectedAreaType at all.
const UNSPECIFIED_TYPE = '__unspecified__';
let paTypeFilter = '';

function matchesTypeFilter(type) {
  if (!paTypeFilter) return true;
  if (paTypeFilter === UNSPECIFIED_TYPE) return !type;
  return type === paTypeFilter;
}

// Same idea, for the "State" dropdown. Every PA entry carries `state` as an
// array (a handful of Wikidata PAs span multiple states); flattened table
// rows carry a single-string `state` sourced from the notification itself.
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

// Flattens the joined PA entries into one row per notification record (for
// PAs with no notifications at all, a single synthetic "not notified" row) --
// the shape the table (and CSV export) has always worked with.
function buildTableRecords() {
  const rows = [];
  for (const entry of paEntries) {
    if (entry.notifications.length === 0) {
      rows.push({
        _paKey: entry.paKey,
        _typeGroup: entry.protectedAreaType || 'Unspecified type',
        wikidataId: entry.wikidataId,
        protectedAreaName: entry.name,
        protectedAreaType: entry.protectedAreaType,
        state: entry.state,
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
      rows.push({
        ...n,
        _paKey: entry.paKey,
        _typeGroup: n.protectedAreaType || 'Unspecified type',
        wikidataId: entry.wikidataId,
      });
    }
  }
  return rows;
}

// Full outer join KPIs: every PA entry (Wikidata-listed or MoEF-only) counted
// once and classified by its precomputed eszStatus.
function computeKPIs() {
  let final = 0, draftOnly = 0, none = 0, matchedCount = 0, unmatchedPaCount = 0, unmatchedRecordCount = 0;
  for (const entry of paEntries) {
    if (!matchesTypeFilter(entry.protectedAreaType)) continue;
    if (!matchesStateFilter(entry.state)) continue;
    if (entry.wikidataId) matchedCount += 1;
    else { unmatchedPaCount += 1; unmatchedRecordCount += entry.notifications.length; }
    if (entry.eszStatus === 'final') final += 1;
    else if (entry.eszStatus === 'draft') draftOnly += 1;
    else none += 1;
  }
  const total = matchedCount + unmatchedPaCount;
  return { total, final, draftOnly, none, matchedCount, unmatchedPaCount, unmatchedRecordCount };
}

function renderKPIs() {
  const { total, final, draftOnly, none, matchedCount, unmatchedPaCount, unmatchedRecordCount } = computeKPIs();
  document.getElementById('stat-total').textContent = total.toLocaleString();
  document.querySelector('.filter-hero').classList.toggle('filter-hero--active', Boolean(paTypeFilter || paStateFilter));
  document.getElementById('stat-final').textContent = final.toLocaleString();
  document.getElementById('stat-draft').textContent = draftOnly.toLocaleString();
  document.getElementById('stat-none').textContent = none.toLocaleString();

  const pct = (n) => `${(total ? (n / total) * 100 : 0).toFixed(1)}%`;
  document.getElementById('stat-final-pct').textContent = `${pct(final)} of protected areas`;
  document.getElementById('stat-draft-pct').textContent = `${pct(draftOnly)} of protected areas`;
  document.getElementById('stat-none-pct').textContent = `${pct(none)} of protected areas`;

  document.getElementById('seg-final').style.width = pct(final);
  document.getElementById('seg-draft').style.width = pct(draftOnly);
  document.getElementById('seg-none').style.width = pct(none);

  const filterBits = [];
  if (paStateFilter) filterBits.push(`state "${paStateFilter === UNSPECIFIED_STATE ? 'Unspecified state' : paStateFilter}"`);
  if (paTypeFilter) filterBits.push(`type "${paTypeFilter === UNSPECIFIED_TYPE ? 'Unspecified type' : paTypeFilter}"`);
  const filterNote = filterBits.length ? ` matching ${filterBits.join(' and ')}` : '';
  document.getElementById('match-caveat').textContent =
    `Statistics above are a full join of ${matchedCount.toLocaleString()} Wikidata protected areas${filterNote} and ${unmatchedPaCount.toLocaleString()} additional protected areas ` +
    `(from ${unmatchedRecordCount.toLocaleString()} MoEF notification records) that aren't in the Wikidata list yet -- ${total.toLocaleString()} protected areas in total. ` +
    `The latter have no known location, so they're left off the map, but are included in the KPIs above, the table, and downloads below. See the QA list below to help match them.`;
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
// the map even though they're counted in the KPIs and listed in the table.
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

// Builds the initial (synchronous) popup markup from the PA entry's
// Wikidata-sourced fields -- name, image/banner, IUCN category/area, and
// identity links. Deliberately omits notification status/date/PDF/archive
// links since those are already shown in the table row for this PA.
function buildPopupHtml(p) {
  const bannerUrl = p.pageBanner || p.image;

  const meta = [];
  if (p.iucnCategory) meta.push(escapeHtml(p.iucnCategory.replace(/^IUCN category [IVXLC]+:\s*/, '')));
  if (p.area) meta.push(`${p.area.toLocaleString()} km&sup2;`);
  if (p.state) meta.push(escapeHtml(p.state));

  const links = [];
  if (p.wikidataUrl) {
    links.push(`<a href="${p.wikidataUrl}" target="_blank" rel="noopener">View on Wikidata</a>`);
    links.push(`<a href="${p.wikidataUrl}" target="_blank" rel="noopener">Edit on Wikidata</a>`);
  }
  if (p.enwikiUrl) links.push(`<a href="${p.enwikiUrl}" target="_blank" rel="noopener">Wikipedia</a>`);
  const osmIds = p.osmRelationIds || [];
  if (osmIds.length) {
    const atlasUrl = `${AMCHE_ATLAS_BASE}?layers=osm:relation/${osmIds[0]}`;
    links.push(`<a href="${atlasUrl}" target="_blank" rel="noopener">View boundary in amche-atlas</a>`);
  }

  return `
    ${bannerUrl ? `<img class="popup-banner" src="${bannerUrl}" alt="" loading="lazy" />` : ''}
    <p class="popup-title">${escapeHtml(p.name || '')}</p>
    ${meta.length ? `<p class="popup-row popup-meta">${meta.join(' &middot; ')}</p>` : ''}
    <p class="popup-row popup-extract" data-extract-for="${p.wikidataId || ''}">${p.enwikiUrl ? 'Loading Wikipedia summary&hellip;' : ''}</p>
    <div class="popup-links">${links.join(' &middot; ')}</div>
  `;
}

// Tracks the most recently requested enrichment so a slow/late response for
// a popup the user has since closed/replaced doesn't clobber the new one.
let popupEnrichmentId = 0;

async function enrichPopupWithWikipedia(p) {
  if (!p.enwikiUrl) return;
  const requestId = ++popupEnrichmentId;
  const title = decodeURIComponent(p.enwikiUrl.split('/').pop());

  let summary;
  try {
    const res = await fetch(`${WIKIPEDIA_SUMMARY_API}${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error(`Wikipedia summary request failed: ${res.status}`);
    summary = await res.json();
  } catch {
    summary = null;
  }

  if (requestId !== popupEnrichmentId || !activePopup) return;
  const popupEl = activePopup.getElement();
  if (!popupEl) return;
  const extractEl = popupEl.querySelector(`.popup-extract[data-extract-for="${p.wikidataId || ''}"]`);
  if (!extractEl) return;

  if (!summary) { extractEl.remove(); return; }

  extractEl.textContent = summary.extract || '';
  if (!extractEl.textContent) extractEl.remove();

  if (!popupEl.querySelector('.popup-banner')) {
    const thumbUrl = summary.originalimage?.source || summary.thumbnail?.source;
    if (thumbUrl) {
      const img = document.createElement('img');
      img.className = 'popup-banner';
      img.alt = '';
      img.loading = 'lazy';
      img.src = thumbUrl;
      popupEl.querySelector('.maplibregl-popup-content')?.insertBefore(img, popupEl.querySelector('.maplibregl-popup-content').firstChild);
    }
  }
  activePopup.setLngLat(activePopup.getLngLat()); // force reflow so MapLibre repositions for new content height
}

function openPopupForFeature(feature) {
  showPopup(feature.geometry.coordinates, buildPopupHtml(feature.properties));
  enrichPopupWithWikipedia(feature.properties);
}

let activePopup = null;
let selectedWikidataId = null;
const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-hover-popup', offset: 10, anchor: 'bottom' });

function closePopup() {
  if (activePopup) { activePopup.remove(); activePopup = null; }
}

function clearSelection() {
  selectedWikidataId = null;
  highlightTableRow(null);
}

function showPopup(coordinates, html) {
  closePopup();
  activePopup = new maplibregl.Popup({ maxWidth: '300px' }).setLngLat(coordinates).setHTML(html).addTo(map);
  // Closing the popup (via its "x" button, or being replaced/removed
  // programmatically) is what ends a selection -- keep the two in sync.
  activePopup.on('close', clearSelection);
}

// Pans/flies the map to a PA feature. Pass `zoom` to fly in (table row
// click); omit it to just re-center at the current zoom (table row hover).
function focusFeature(feature, { zoom } = {}) {
  const center = feature.geometry.coordinates;
  if (zoom != null) map.flyTo({ center, zoom, essential: true });
  else map.panTo(center, { duration: 300 });
}

function highlightTableRow(wikidataId) {
  if (!table) return;
  for (const row of table.getRows()) row.getElement().classList.remove('selected-row');
  if (!wikidataId) return;
  const rows = table.getRows().filter((row) => row.getData().wikidataId === wikidataId);
  rows.forEach((row) => row.getElement().classList.add('selected-row'));
  if (rows.length) rows[0].getElement().scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      highlightTableRow(selectedWikidataId);
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
// data before the table (and its filters) has finished building.
function allFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: paEntries.filter((entry) => entry.coordinateLatitude != null).map(entryToFeature),
  };
}

// One PA can have multiple notification records (redraft/amendment); dedupe
// by wikidataId so the map doesn't stack duplicate markers.
function filteredFeatureCollection() {
  const seen = new Set();
  const features = [];
  for (const r of filteredRecords) {
    if (!r.wikidataId || seen.has(r.wikidataId)) continue;
    const entry = entryByPaKey.get(r._paKey);
    if (!entry || entry.coordinateLatitude == null) continue;
    seen.add(r.wikidataId);
    features.push(entryToFeature(entry));
  }
  return { type: 'FeatureCollection', features };
}

let fitBoundsTimer = null;

// Keeps the map markers in sync with the table's active filters, closing
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

function sortInitialRecords(records) {
  const statusRank = { Final: 0, Draft: 1 };
  return [...records].sort((a, b) => {
    const s = stateAsString(a.state).localeCompare(stateAsString(b.state));
    if (s) return s;
    const t = (a._typeGroup || '').localeCompare(b._typeGroup || '');
    if (t) return t;
    const n = (a.protectedAreaName || '').localeCompare(b.protectedAreaName || '');
    if (n) return n;
    const sr = (statusRank[a.notificationStatus] ?? 2) - (statusRank[b.notificationStatus] ?? 2);
    if (sr) return sr;
    return (b.notificationDate || '').localeCompare(a.notificationDate || '');
  });
}

// Shows the Final/Draft pill, plus -- for a Final row whose PA also has a
// Draft -- a toggle button that reveals that (otherwise-hidden) Draft row
// immediately below it in the flat table. draftVisibilityFilter is what
// actually hides/shows the Draft row; this button just flips openDraftGroups
// and asks the table to re-filter.
// PA keys the user has manually toggled open to reveal their collapsed draft row(s).
const openDraftGroups = new Set();

function statusFormatter(cell) {
  const rowData = cell.getRow().getData();
  const status = cell.getValue();

  const wrap = document.createElement('span');
  wrap.className = 'status-cell';

  const pill = document.createElement('span');
  pill.className = 'status-pill';
  const dot = document.createElement('i');
  dot.className = `dot ${status === 'Final' ? 'dot-final' : status === 'Draft' ? 'dot-draft' : 'dot-none'}`;
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode(status || 'Not notified'));
  wrap.appendChild(pill);

  const entry = entryByPaKey.get(rowData._paKey);
  if (status === 'Final' && entry && entry.hasDraft) {
    const paKey = rowData._paKey;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm draft-toggle';
    btn.textContent = openDraftGroups.has(paKey) ? 'Hide draft' : 'View draft';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowOpen = !openDraftGroups.has(paKey);
      if (nowOpen) openDraftGroups.add(paKey);
      else openDraftGroups.delete(paKey);
      btn.textContent = nowOpen ? 'Hide draft' : 'View draft';
      table.refreshFilter();
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function anchorEl(href, label) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = label;
  return a;
}

function linksFormatter(cell) {
  const r = cell.getRow().getData();
  const wrap = document.createElement('span');
  const anchors = [];
  if (r.notificationPdfLink) anchors.push(anchorEl(r.notificationPdfLink, 'PDF'));
  if (r.notificationArchiveLink) anchors.push(anchorEl(r.notificationArchiveLink, 'Archive'));
  if (r.wikidataId) anchors.push(anchorEl(`https://www.wikidata.org/wiki/${r.wikidataId}`, 'Wikidata'));
  if (!anchors.length) { wrap.textContent = '–'; return wrap; }
  anchors.forEach((a, i) => {
    if (i) wrap.appendChild(document.createTextNode(' · '));
    wrap.appendChild(a);
  });
  return wrap;
}

// Marks a revealed Draft row (one whose PA also has a Final row, currently
// toggled open) so it can be styled as visually nested under its Final row.
function rowFormatter(row) {
  const data = row.getData();
  const entry = entryByPaKey.get(data._paKey);
  const isNestedDraft = data.notificationStatus === 'Draft' && Boolean(entry && entry.hasFinal);
  row.getElement().classList.toggle('nested-draft-row', isNestedDraft);
}

// Hides a Draft row when its PA also has a Final notification, unless the
// user toggled that PA's "View draft" button open.
function draftVisibilityFilter(rowData) {
  if (rowData.notificationStatus !== 'Draft') return true;
  const entry = entryByPaKey.get(rowData._paKey);
  if (!entry || !entry.hasFinal) return true;
  return openDraftGroups.has(rowData._paKey);
}

function searchFilter(rowData) {
  if (!searchTerm) return true;
  const haystack = `${rowData.protectedAreaName || ''} ${stateAsString(rowData.state)} ${rowData.protectedAreaType || ''} ${rowData.orderNumber || ''}`.toLowerCase();
  return haystack.includes(searchTerm);
}

// Driven by the top "Protected areas in India" dropdowns -- kept as plain row
// filters (rather than the State/Type columns' header filters) so that each
// is the single source of truth for KPIs, table, and map alike.
function typeFilter(rowData) {
  return matchesTypeFilter(rowData.protectedAreaType);
}

function stateFilter(rowData) {
  return matchesStateFilter(rowData.state);
}

let table;

function initTable() {
  table = new Tabulator('#notifications-table', {
    data: sortInitialRecords(tableRecords),
    layout: 'fitColumns',
    rowFormatter,
    columns: [
      { title: 'State', field: 'state', width: 150, formatter: (cell) => escapeHtml(stateAsString(cell.getValue())) },
      { title: 'Protected area', field: 'protectedAreaName', minWidth: 220 },
      { title: 'Type', field: 'protectedAreaType', width: 170 },
      {
        title: 'Status',
        field: 'notificationStatus',
        formatter: statusFormatter,
        width: 110,
      },
      { title: 'Date', field: 'notificationDate', width: 100 },
      { title: 'S.O. number', field: 'orderNumber', width: 120 },
      { title: 'Links', field: 'moefSNo', formatter: linksFormatter, headerSort: false, minWidth: 170 },
    ],
  });

  table.on('tableBuilt', () => {
    table.addFilter(draftVisibilityFilter);
    table.addFilter(typeFilter);
    table.addFilter(stateFilter);
    table.addFilter(searchFilter);
  });

  table.on('dataFiltered', (filters, rows) => {
    filteredRecords = rows.map((row) => row.getData());
    updateMapFilter();
    document.getElementById('result-count').textContent =
      `${filteredRecords.length.toLocaleString()} of ${tableRecords.length.toLocaleString()} rows`;
  });

  table.on('rowMouseEnter', (e, row) => {
    if (selectedWikidataId) return; // a row/marker is selected -- hover is suspended until cleared
    const entry = entryByPaKey.get(row.getData()._paKey);
    if (!entry || entry.coordinateLatitude == null) return;
    const feature = entryToFeature(entry);
    focusFeature(feature);
    openPopupForFeature(feature);
  });
  table.on('rowMouseLeave', () => {
    if (selectedWikidataId) return;
    closePopup();
  });
  table.on('rowClick', (e, row) => {
    const entry = entryByPaKey.get(row.getData()._paKey);
    if (!entry || entry.coordinateLatitude == null) return;
    const feature = entryToFeature(entry);
    focusFeature(feature, { zoom: 10 });
    openPopupForFeature(feature);
    selectedWikidataId = feature.properties.wikidataId;
    highlightTableRow(selectedWikidataId);
  });
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportFilteredCsv() {
  const columns = ['moefSNo', 'state', 'protectedAreaName', 'protectedAreaType', 'notificationStatus', 'notificationDate', 'orderNumber', 'notificationPdfLink', 'notificationArchiveLink', 'wikidataId'];
  const rows = [columns.join(',')];
  for (const r of filteredRecords) {
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
  table.refreshFilter();
  renderKPIs();
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
  table.refreshFilter();
  renderKPIs();
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

function initFilterEvents() {
  const searchInput = document.getElementById('filter-search');
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    table.refreshFilter();
  });
  document.getElementById('reset-filters').addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    document.getElementById('pa-type-filter').value = '';
    paTypeFilter = '';
    document.getElementById('pa-state-filter').value = '';
    paStateFilter = '';
    table.refreshFilter();
    renderKPIs();
    renderQaList();
    renderNoCoordList();
  });
  document.getElementById('reset-pa-filters').addEventListener('click', () => {
    document.getElementById('pa-type-filter').value = '';
    paTypeFilter = '';
    document.getElementById('pa-state-filter').value = '';
    paStateFilter = '';
    table.refreshFilter();
    renderKPIs();
    renderQaList();
    renderNoCoordList();
  });
  document.getElementById('export-filtered').addEventListener('click', exportFilteredCsv);
}

async function main() {
  await loadData();
  tableRecords = buildTableRecords();
  initTypeFilter();
  initStateFilter();
  renderKPIs();
  renderQaList();
  renderNoCoordList();
  initAtlasLink();
  initMap();
  initTable();
  initFilterEvents();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#d03b3b">Failed to load dashboard data: ${err.message}</p>`);
});
