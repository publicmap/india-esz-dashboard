// Dashboard logic: loads the three published data files, computes KPIs,
// renders the MapLibre map + grouped/filterable notification table (via
// Tabulator), and wires up CSV export. No build step -- dependencies are
// loaded as ES modules straight from a CDN.

import { registerCorrectionProtocol } from 'https://cdn.jsdelivr.net/npm/@india-boundary-corrector/maplibre-protocol@0.2.2/+esm';
import { TabulatorFull as Tabulator } from 'https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator_esm.min.js';

const GITHUB_RAW_ATLAS_URL = 'https://raw.githubusercontent.com/publicmap/india-esz-dashboard/main/data/amche-atlas.json';
const AMCHE_ATLAS_BASE = 'https://amche.in/dev/';
const WIKIPEDIA_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const STATUS_COLOR = { final: '#0ca30c', draft: '#fab219', none: '#898781' };

let moefRecords = [];
let wikidataPAs = [];
let paGeojson = null;
let filteredRecords = [];
let featuresByWikidataId = new Map();
let wikidataById = new Map();

// Per-protected-area (by wikidataId, or state+name when unmatched) record of
// whether a Final and/or Draft notification exists -- drives the "PA has
// both, hide the draft by default" collapsing behaviour in the table.
const paStatusMap = new Map();
// PA keys the user has manually toggled open to reveal their collapsed draft row(s).
const openDraftGroups = new Set();
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

// Same idea, for the "State" dropdown. Wikidata PAs carry `state` as an array
// (a handful span multiple states); MoEF records carry it as a single string.
const UNSPECIFIED_STATE = '__unspecified__';
let paStateFilter = '';

function matchesStateFilter(state) {
  if (!paStateFilter) return true;
  const list = Array.isArray(state) ? state : [state].filter(Boolean);
  if (paStateFilter === UNSPECIFIED_STATE) return list.length === 0;
  return list.includes(paStateFilter);
}

async function loadData() {
  const [moefRes, wdRes, geoRes] = await Promise.all([
    fetch('data/moef-esz-notifications.json'),
    fetch('data/wikidata-protected-areas.json'),
    fetch('data/protected-areas.geojson'),
  ]);
  moefRecords = await moefRes.json();
  wikidataPAs = await wdRes.json();
  paGeojson = await geoRes.json();
  featuresByWikidataId = new Map(paGeojson.features.map((f) => [f.properties.wikidataId, f]));
  wikidataById = new Map(wikidataPAs.map((w) => [w.wikidataId, w]));
}

// Attaches internal grouping fields to each record and builds paStatusMap.
// _paKey groups a PA's notification records even when it has no wikidataId
// (fallback to state+name); _typeGroup gives the handful of type-less
// records a group to sit in without touching the real protectedAreaType field.
function preprocessRecords() {
  for (const r of moefRecords) {
    r._paKey = r.wikidataId || `${r.state}::${r.protectedAreaName}`;
    r._typeGroup = r.protectedAreaType || 'Unspecified type';
    const info = paStatusMap.get(r._paKey) || { hasFinal: false, hasDraft: false };
    if (r.notificationStatus === 'Final') info.hasFinal = true;
    if (r.notificationStatus === 'Draft') info.hasDraft = true;
    paStatusMap.set(r._paKey, info);
  }
}

// The other side of the full join: Wikidata PAs that no MoEF notification
// references at all (paStatusMap has no entry for their wikidataId). These
// have no rows in moefRecords, so the table would otherwise omit them even
// though the map (and the KPIs above) already count them as "not notified".
function computeNoNotificationPAs() {
  return wikidataPAs
    .filter((pa) => !paStatusMap.has(pa.wikidataId))
    .map((pa) => ({
      _paKey: pa.wikidataId,
      _typeGroup: pa.protectedAreaType || 'Unspecified type',
      wikidataId: pa.wikidataId,
      protectedAreaName: pa.wikidataLabel,
      protectedAreaType: pa.protectedAreaType,
      state: pa.state,
      notificationStatus: null,
      notificationDate: null,
      orderNumber: null,
      notificationPdfLink: null,
      notificationArchiveLink: null,
      moefSNo: null,
    }));
}

// Returns one entry per distinct protected area referenced only by MoEF
// notifications with no wikidataId (grouped by state+name, same as
// paStatusMap's fallback key) -- the "right-hand" side of the full join that
// Wikidata doesn't know about yet.
function computeUnmatchedPAs() {
  const map = new Map();
  for (const r of moefRecords) {
    if (r.wikidataId) continue;
    if (!matchesTypeFilter(r.protectedAreaType)) continue;
    if (!matchesStateFilter(r.state)) continue;
    const key = r._paKey;
    const entry = map.get(key) || {
      state: r.state, protectedAreaName: r.protectedAreaName, protectedAreaType: r.protectedAreaType,
      recordCount: 0, statuses: new Set(),
    };
    entry.recordCount += 1;
    if (r.notificationStatus) entry.statuses.add(r.notificationStatus);
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => (a.state || '').localeCompare(b.state || '') || a.protectedAreaName.localeCompare(b.protectedAreaName));
}

// Full outer join between the Wikidata PA list and the MoEF notifications:
// every Wikidata PA, plus every distinct PA that MoEF references but
// Wikidata doesn't (yet) know about, each counted once and classified by its
// best notification status.
function computeKPIs() {
  let final = 0, draftOnly = 0, none = 0, matchedCount = 0;
  for (const pa of wikidataPAs) {
    if (!matchesTypeFilter(pa.protectedAreaType)) continue;
    if (!matchesStateFilter(pa.state)) continue;
    matchedCount += 1;
    const info = paStatusMap.get(pa.wikidataId);
    if (!info) { none += 1; continue; }
    if (info.hasFinal) final += 1;
    else if (info.hasDraft) draftOnly += 1;
    else none += 1;
  }

  const unmatchedPAs = computeUnmatchedPAs();
  for (const pa of unmatchedPAs) {
    if (pa.statuses.has('Final')) final += 1;
    else if (pa.statuses.has('Draft')) draftOnly += 1;
    else none += 1;
  }

  const total = matchedCount + unmatchedPAs.length;
  const unmatchedRecordCount = moefRecords.filter((r) => !r.wikidataId && matchesTypeFilter(r.protectedAreaType) && matchesStateFilter(r.state)).length;

  return { total, final, draftOnly, none, matchedCount, unmatchedPaCount: unmatchedPAs.length, unmatchedRecordCount };
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

// Wikidata PAs with no coordinateLatitude/Longitude -- these can't be placed
// on the map (they're absent from paGeojson/featuresByWikidataId) even
// though they're counted in the KPIs and listed in the table.
function computeNoCoordinatePAs() {
  return wikidataPAs
    .filter((pa) => !featuresByWikidataId.has(pa.wikidataId))
    .filter((pa) => matchesTypeFilter(pa.protectedAreaType))
    .filter((pa) => matchesStateFilter(pa.state))
    .sort((a, b) => {
      const s = stateAsString(a.state).localeCompare(stateAsString(b.state));
      if (s) return s;
      return (a.wikidataLabel || '').localeCompare(b.wikidataLabel || '');
    });
}

function noCoordRowHtml(pa) {
  const state = Array.isArray(pa.state) ? pa.state.join(', ') : (pa.state || '');
  return `
    <tr>
      <td>${escapeHtml(state)}</td>
      <td>${escapeHtml(pa.wikidataLabel || '')}</td>
      <td>${escapeHtml(pa.protectedAreaType || '')}</td>
      <td><a href="${pa.wikidataUrl}" target="_blank" rel="noopener">Edit on Wikidata</a></td>
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

// MapLibre's GeoJSON source encodes array/object properties as JSON
// strings when tiling internally, but returns plain arrays for small
// untiled sources -- handle either shape defensively.
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Builds the initial (synchronous) popup markup from Wikidata-sourced info
// only -- name, image/banner, IUCN category/area, and identity links.
// Deliberately omits notification status/date/PDF/archive links since those
// are already shown in the table row for this PA.
function buildPopupHtml(p) {
  const wd = p.wikidataId ? wikidataById.get(p.wikidataId) : null;
  const bannerUrl = wd && (wd.pageBanner || wd.image);

  const meta = [];
  if (wd && wd.iucnCategory) meta.push(escapeHtml(wd.iucnCategory.replace(/^IUCN category [IVXLC]+:\s*/, '')));
  if (wd && wd.area) meta.push(`${wd.area.toLocaleString()} km&sup2;`);
  if (p.state) meta.push(escapeHtml(p.state));

  const links = [];
  if (p.wikidataUrl) {
    links.push(`<a href="${p.wikidataUrl}" target="_blank" rel="noopener">View on Wikidata</a>`);
    links.push(`<a href="${p.wikidataUrl}" target="_blank" rel="noopener">Edit on Wikidata</a>`);
  }
  if (p.enwikiUrl) links.push(`<a href="${p.enwikiUrl}" target="_blank" rel="noopener">Wikipedia</a>`);
  const osmIds = asArray(p.osmRelationIds);
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
  // Registers the ibc:// protocol so OSM's raster tiles render India's
  // official boundaries instead of the internationally-disputed ones.
  registerCorrectionProtocol(maplibregl);

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
    map.addSource('protected-areas', { type: 'geojson', data: paGeojson });
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

// One PA can have multiple notification records (redraft/amendment); dedupe
// by wikidataId so the map doesn't stack duplicate markers.
function filteredFeatureCollection() {
  const seen = new Set();
  const features = [];
  for (const r of filteredRecords) {
    if (!r.wikidataId || seen.has(r.wikidataId)) continue;
    const feature = featuresByWikidataId.get(r.wikidataId);
    if (!feature) continue;
    seen.add(r.wikidataId);
    features.push(feature);
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
// no-notification rows (built from wikidataPAs) carry it as an array --
// normalize to a sortable/searchable string either way.
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

  const info = paStatusMap.get(rowData._paKey);
  if (status === 'Final' && info && info.hasDraft) {
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
  const info = paStatusMap.get(data._paKey);
  const isNestedDraft = data.notificationStatus === 'Draft' && Boolean(info && info.hasFinal);
  row.getElement().classList.toggle('nested-draft-row', isNestedDraft);
}

// Hides a Draft row when its PA also has a Final notification, unless the
// user toggled that PA's "View draft" button open.
function draftVisibilityFilter(rowData) {
  if (rowData.notificationStatus !== 'Draft') return true;
  const info = paStatusMap.get(rowData._paKey);
  if (!info || !info.hasFinal) return true;
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
let tableRecords = [];

function initTable() {
  // Full outer join for the table too: every MoEF notification record, plus
  // one synthetic "not notified" row per Wikidata PA that no notification
  // references, so the table lists every PA the map (and KPIs) show.
  tableRecords = [...moefRecords, ...computeNoNotificationPAs()];
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
    const feature = featuresByWikidataId.get(row.getData().wikidataId);
    if (!feature) return;
    focusFeature(feature);
    openPopupForFeature(feature);
  });
  table.on('rowMouseLeave', () => {
    if (selectedWikidataId) return;
    closePopup();
  });
  table.on('rowClick', (e, row) => {
    const feature = featuresByWikidataId.get(row.getData().wikidataId);
    if (!feature) return;
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

// Union of PA types across both the Wikidata list and MoEF notifications, so
// the dropdown covers types even when a PA has no notification record (and
// therefore wouldn't otherwise appear via moefRecords alone).
function collectProtectedAreaTypes() {
  const types = new Set();
  for (const pa of wikidataPAs) if (pa.protectedAreaType) types.add(pa.protectedAreaType);
  for (const r of moefRecords) if (r.protectedAreaType) types.add(r.protectedAreaType);
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
  const hasUnspecified = wikidataPAs.some((pa) => !pa.protectedAreaType) || moefRecords.some((r) => !r.protectedAreaType);
  if (hasUnspecified) {
    const opt = document.createElement('option');
    opt.value = UNSPECIFIED_TYPE;
    opt.textContent = 'Unspecified type';
    select.appendChild(opt);
  }
  select.addEventListener('change', () => setPaTypeFilter(select.value));
}

// Same idea as collectProtectedAreaTypes, but flattening the WD `state`
// arrays (a few PAs span multiple states) alongside MoEF's single-string field.
function collectStates() {
  const states = new Set();
  for (const pa of wikidataPAs) for (const s of Array.isArray(pa.state) ? pa.state : []) states.add(s);
  for (const r of moefRecords) if (r.state) states.add(r.state);
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
  const hasUnspecified = wikidataPAs.some((pa) => !Array.isArray(pa.state) || pa.state.length === 0);
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
  preprocessRecords();
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
