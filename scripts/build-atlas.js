// Builds data/amche-atlas.json -- a custom atlas config for amche-atlas
// (https://amche.in/dev/, URL API: https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md)
// so the dataset can be explored as a full map, not just individual links.
//
// Two kinds of layers are generated:
//   1. A single `geojson` layer of every protected area point (from
//      data/protected-areas.geojson), colored by ESZ notification status.
//   2. One `osm` dynamic layer (see "Dynamic layer shortcuts" in the API
//      docs above) per OSM relation ID on a protected area, which resolves
//      the actual PA boundary polygon once via the Overpass API rather than
//      us having to fetch and re-host the geometry ourselves. Note: only
//      `initiallyChecked`/`opacity` survive amche-atlas's dynamic-layer
//      expansion today, so the custom `title`/`style`/`tags`/etc. below are
//      inert until that layer type gains config passthrough -- kept in place
//      for when it does.
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
      'text-field': ['get', 'name'],
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
    for (const relationId of relationIds) {
      // The `osm` dynamic layer shorthand resolves a single OSM element by
      // reference -- its `id` doubles as both the layer's unique id and the
      // `<node|way|relation>/<id>` reference passed to the Overpass API.
      boundaryLayers.push({
        id: `relation/${relationId}`,
        type: 'osm',
        title: `${props.name} (boundary)`,
        description: `${STATUS_LABEL[props.eszStatus]}${props.state ? ` &middot; ${props.state}` : ''}`,
        tags: [props.state, STATUS_LABEL[props.eszStatus]].filter(Boolean),
        initiallyChecked: props.eszStatus !== 'none',
        attribution: '&copy; OpenStreetMap contributors (via Overpass API)',
        style: {
          'line-color': STATUS_COLOR[props.eszStatus],
          'line-width': 2,
          'fill-color': STATUS_COLOR[props.eszStatus],
          'fill-opacity': 0.15,
          'text-field': ['get', 'name'],
        },
      });
    }
  }

  const satelliteLayer = {
    id: 'mapbox-satellite',
    type: 'raster-style-layer',
    title: 'Satellite',
    styleLayer: 'mapbox-satellite',
    initiallyChecked: true,
    attribution: 'Mapbox Satellite',
  };

  const atlas = {
    name: 'MoEF ESZ Notifications',
    description: 'Protected areas of India and the status of their Eco-Sensitive Zone (ESZ) notifications by MoEFCC. Green = final ESZ notified, amber = draft only, grey = not yet notified.',
    center: [82, 22],
    zoom: 4.2,
    inspect: pointsLayer.inspect,
    layers: [pointsLayer, ...boundaryLayers, satelliteLayer],
  };

  await writeFile('data/amche-atlas.json', JSON.stringify(atlas, null, 2), 'utf8');
  console.log(`Wrote data/amche-atlas.json: 1 point layer + ${boundaryLayers.length} PA boundary layers.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
