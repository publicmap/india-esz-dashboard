// Dashboard logic: loads the three published data files, computes KPIs,
// renders the MapLibre map + filterable notification table, and wires up
// CSV export. No build step / framework -- kept dependency-free besides
// MapLibre GL (loaded via CDN <script> tag in index.html).

const GITHUB_RAW_ATLAS_URL = 'https://raw.githubusercontent.com/publicmap/moef-esz-notifications/main/data/amche-atlas.json';
const AMCHE_ATLAS_BASE = 'https://amche.in/dev/';

const STATUS_COLOR = { final: '#0ca30c', draft: '#fab219', none: '#898781' };

let moefRecords = [];
let wikidataPAs = [];
let paGeojson = null;
let filteredRecords = [];
let sortState = { key: 'notificationDate', dir: 'desc' };

async function loadData() {
  const [moefRes, wdRes, geoRes] = await Promise.all([
    fetch('data/moef-esz-notifications.json'),
    fetch('data/wikidata-protected-areas.json'),
    fetch('data/protected-areas.geojson'),
  ]);
  moefRecords = await moefRes.json();
  wikidataPAs = await wdRes.json();
  paGeojson = await geoRes.json();
}

function computeKPIs() {
  const notificationsByWikidataId = new Map();
  for (const r of moefRecords) {
    if (!r.wikidataId) continue;
    const list = notificationsByWikidataId.get(r.wikidataId) || [];
    list.push(r);
    notificationsByWikidataId.set(r.wikidataId, list);
  }

  let final = 0, draftOnly = 0, none = 0;
  for (const pa of wikidataPAs) {
    const notifications = notificationsByWikidataId.get(pa.wikidataId);
    if (!notifications) { none += 1; continue; }
    const hasFinal = notifications.some((n) => n.notificationStatus === 'Final');
    const hasDraft = notifications.some((n) => n.notificationStatus === 'Draft');
    if (hasFinal) final += 1;
    else if (hasDraft) draftOnly += 1;
    else none += 1;
  }

  const total = wikidataPAs.length;
  const unmatched = moefRecords.filter((r) => !r.wikidataId).length;

  return { total, final, draftOnly, none, unmatched };
}

function renderKPIs() {
  const { total, final, draftOnly, none, unmatched } = computeKPIs();
  document.getElementById('stat-total').textContent = total.toLocaleString();
  document.getElementById('stat-final').textContent = final.toLocaleString();
  document.getElementById('stat-draft').textContent = draftOnly.toLocaleString();
  document.getElementById('stat-none').textContent = none.toLocaleString();

  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  document.getElementById('stat-final-pct').textContent = `${pct(final)} of protected areas`;
  document.getElementById('stat-draft-pct').textContent = `${pct(draftOnly)} of protected areas`;
  document.getElementById('stat-none-pct').textContent = `${pct(none)} of protected areas`;

  document.getElementById('seg-final').style.width = pct(final);
  document.getElementById('seg-draft').style.width = pct(draftOnly);
  document.getElementById('seg-none').style.width = pct(none);

  document.getElementById('match-caveat').textContent =
    `${moefRecords.length - unmatched} of ${moefRecords.length} MoEF notification records (${(((moefRecords.length - unmatched) / moefRecords.length) * 100).toFixed(0)}%) ` +
    `matched to a Wikidata protected area; ${unmatched} notifications reference protected areas not yet in the Wikidata list above and are excluded from the map and KPIs (but included in the table and downloads below).`;
}

function initAtlasLink() {
  const url = `${AMCHE_ATLAS_BASE}?atlas=${encodeURIComponent(GITHUB_RAW_ATLAS_URL)}`;
  document.getElementById('open-atlas-link').href = url;
}

let map;
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [82, 22],
    zoom: 3.6,
  });
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
      const p = f.properties;
      const statusLabel = p.eszStatus === 'final' ? 'Final ESZ notified' : p.eszStatus === 'draft' ? 'Draft ESZ notified' : 'Not yet notified';
      const links = [];
      links.push(`<a href="${p.wikidataUrl}" target="_blank" rel="noopener">Wikidata</a>`);
      if (p.enwikiUrl) links.push(`<a href="${p.enwikiUrl}" target="_blank" rel="noopener">Wikipedia</a>`);
      if (p.notificationPdfLink) links.push(`<a href="${p.notificationPdfLink}" target="_blank" rel="noopener">Notification PDF</a>`);
      if (p.notificationArchiveLink) links.push(`<a href="${p.notificationArchiveLink}" target="_blank" rel="noopener">Gazette archive</a>`);
      // MapLibre's GeoJSON source encodes array/object properties as JSON
      // strings when tiling internally, but returns plain arrays for small
      // untiled sources -- handle either shape defensively.
      let osmIds = p.osmRelationIds || [];
      if (typeof osmIds === 'string') {
        try { osmIds = JSON.parse(osmIds); } catch { osmIds = []; }
      }
      if (!Array.isArray(osmIds)) osmIds = [];
      if (osmIds.length) {
        const atlasUrl = `${AMCHE_ATLAS_BASE}?layers=osm:relation/${osmIds[0]}`;
        links.push(`<a href="${atlasUrl}" target="_blank" rel="noopener">View boundary in amche-atlas</a>`);
      }

      const html = `
        <p class="popup-title">${p.name}</p>
        <p class="popup-row">${p.protectedAreaType || 'Protected area'} &middot; ${p.state || 'Unknown state'}</p>
        <p class="popup-row"><i class="dot dot-${p.eszStatus}" style="display:inline-block;vertical-align:middle;margin-right:4px;"></i>${statusLabel}${p.notificationDate ? ` (${p.notificationDate})` : ''}</p>
        <div class="popup-links">${links.join(' &middot; ')}</div>
      `;
      new maplibregl.Popup({ maxWidth: '280px' }).setLngLat(f.geometry.coordinates).setHTML(html).addTo(map);
    });
    map.on('mouseenter', 'protected-areas-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'protected-areas-circles', () => { map.getCanvas().style.cursor = ''; });
  });
}

function populateFilterOptions() {
  const states = [...new Set(moefRecords.map((r) => r.state).filter(Boolean))].sort();
  const types = [...new Set(moefRecords.map((r) => r.protectedAreaType).filter(Boolean))].sort();

  const stateSelect = document.getElementById('filter-state');
  for (const s of states) stateSelect.appendChild(new Option(s, s));

  const typeSelect = document.getElementById('filter-type');
  for (const t of types) typeSelect.appendChild(new Option(t, t));
}

function applyFilters() {
  const search = document.getElementById('filter-search').value.trim().toLowerCase();
  const state = document.getElementById('filter-state').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  filteredRecords = moefRecords.filter((r) => {
    if (state && r.state !== state) return false;
    if (type && r.protectedAreaType !== type) return false;
    if (status && r.notificationStatus !== status) return false;
    if (search) {
      const haystack = `${r.protectedAreaName} ${r.state} ${r.protectedAreaType || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  sortRecords();
  renderTable();
}

function sortRecords() {
  const { key, dir } = sortState;
  filteredRecords.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return dir === 'asc' ? cmp : -cmp;
  });
}

function renderTable() {
  const tbody = document.querySelector('#notifications-table tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (const r of filteredRecords) {
    const tr = document.createElement('tr');
    const dotClass = r.notificationStatus === 'Final' ? 'dot-final' : 'dot-draft';
    const links = [];
    if (r.notificationPdfLink) links.push(`<a href="${r.notificationPdfLink}" target="_blank" rel="noopener">PDF</a>`);
    if (r.notificationArchiveLink) links.push(`<a href="${r.notificationArchiveLink}" target="_blank" rel="noopener">Archive</a>`);
    if (r.wikidataId) links.push(`<a href="https://www.wikidata.org/wiki/${r.wikidataId}" target="_blank" rel="noopener">Wikidata</a>`);

    tr.innerHTML = `
      <td>${r.state || ''}</td>
      <td>${r.protectedAreaName || ''}</td>
      <td>${r.protectedAreaType || ''}</td>
      <td><span class="status-pill"><i class="dot ${dotClass}"></i>${r.notificationStatus || ''}</span></td>
      <td>${r.notificationDate || ''}</td>
      <td>${r.orderNumber || ''}</td>
      <td>${links.join(' &middot; ') || '&ndash;'}</td>
    `;
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
  document.getElementById('result-count').textContent = `${filteredRecords.length.toLocaleString()} of ${moefRecords.length.toLocaleString()} notification records`;
}

function initSorting() {
  document.querySelectorAll('#notifications-table thead th[data-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      else sortState = { key, dir: 'asc' };
      sortRecords();
      renderTable();
    });
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

function initFilterEvents() {
  ['filter-search', 'filter-state', 'filter-type', 'filter-status'].forEach((id) => {
    document.getElementById(id).addEventListener('input', applyFilters);
  });
  document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-state').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    applyFilters();
  });
  document.getElementById('export-filtered').addEventListener('click', exportFilteredCsv);
}

async function main() {
  await loadData();
  renderKPIs();
  initAtlasLink();
  initMap();
  populateFilterOptions();
  initSorting();
  initFilterEvents();
  filteredRecords = [...moefRecords];
  sortRecords();
  renderTable();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#d03b3b">Failed to load dashboard data: ${err.message}</p>`);
});
