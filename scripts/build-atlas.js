// Builds data/amche-atlas.json -- a custom atlas config for amche-atlas
// (https://amche.in/dev/, URL API: https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md)
// so the dataset can be explored as a full map, not just individual links.
//
// Two kinds of layers are generated:
//   1. A single `geojson` layer of every protected area point (from
//      data/protected-areas.geojson), colored by ESZ notification status.
//   2. One `overpass` layer per protected area that has an OSM relation ID,
//      which resolves the actual PA boundary polygon live via the Overpass
//      API (`relation(<id>); out geom;`) rather than us having to fetch and
//      re-host the geometry ourselves.
//
// NOTE: assumes this repo is published at github.com/publicmap/india-esz-dashboard
// (matches the local `Github/publicmap/` checkout path and sibling amche-atlas
// repo's org) -- update GITHUB_RAW_BASE below if it ends up elsewhere.

import { readFile, writeFile } from 'node:fs/promises';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/publicmap/india-esz-dashboard/main';

// Fixed status palette (see dataviz skill references/palette.md) -- never
// themed per-mode, and always paired with an icon/label in the UI since
// "warning" and "none" are sub-3:1 contrast on a light surface by design.
const STATUS_COLOR = {
  final: '#0ca30c', // status/good
  draft: '#fab219', // status/warning
  none: '#898781', // muted ink -- "not yet notified" is neutral, not bad
};

const STATUS_LABEL = {
  final: 'Final ESZ notified',
  draft: 'Draft ESZ notified',
  none: 'Not yet notified',
};

function circleColorExpression() {
  return [
    'match',
    ['get', 'eszStatus'],
    'final', STATUS_COLOR.final,
    'draft', STATUS_COLOR.draft,
    STATUS_COLOR.none,
  ];
}

async function main() {
  const geojson = JSON.parse(await readFile('data/protected-areas.geojson', 'utf8'));

  const pointsLayer = {
    id: 'protected-areas',
    type: 'geojson',
    title: 'Protected Areas (ESZ status)',
    description: 'All Indian protected areas with a known location, colored by Eco-Sensitive Zone notification status.',
    url: `${GITHUB_RAW_BASE}/data/protected-areas.geojson`,
    initiallyChecked: true,
    attribution: 'Wikidata, MoEFCC ESZ notifications',
    style: {
      'circle-color': circleColorExpression(),
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 10, 8],
      'circle-stroke-color': '#111827',
      'circle-stroke-width': 0.5,
    },
    inspect: {
      id: 'wikidataId',
      title: 'name',
      label: 'name',
      fields: ['protectedAreaType', 'state', 'eszStatus', 'notificationStatus', 'notificationDate', 'orderNumber', 'iucnCategory', 'area'],
    },
  };

  const boundaryLayers = [];
  for (const feature of geojson.features) {
    const props = feature.properties;
    const relationIds = props.osmRelationIds || [];
    if (relationIds.length === 0) continue;

    const query = `${relationIds.map((id) => `relation(${id});`).join('\n')}\nout geom;`;
    boundaryLayers.push({
      id: `pa-boundary-${props.wikidataId}`,
      type: 'overpass',
      title: `${props.name} (boundary)`,
      description: `${STATUS_LABEL[props.eszStatus]}${props.state ? ` &middot; ${props.state}` : ''}`,
      tags: [props.state, STATUS_LABEL[props.eszStatus]].filter(Boolean),
      query,
      initiallyChecked: props.eszStatus !== 'none',
      attribution: '&copy; OpenStreetMap contributors (via Overpass API)',
      style: {
        'line-color': STATUS_COLOR[props.eszStatus],
        'line-width': 2,
        'fill-color': STATUS_COLOR[props.eszStatus],
        'fill-opacity': 0.15,
      },
    });
  }

  const atlas = {
    name: 'MoEF ESZ Notifications',
    description: 'Protected areas of India and the status of their Eco-Sensitive Zone (ESZ) notifications by MoEFCC. Green = final ESZ notified, amber = draft only, grey = not yet notified.',
    center: [82, 22],
    zoom: 4.2,
    inspect: pointsLayer.inspect,
    layers: [pointsLayer, ...boundaryLayers],
  };

  await writeFile('data/amche-atlas.json', JSON.stringify(atlas, null, 2), 'utf8');
  console.log(`Wrote data/amche-atlas.json: 1 point layer + ${boundaryLayers.length} PA boundary layers.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
