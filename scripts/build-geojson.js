// Builds data/protected-areas.geojson -- a point-feature GeoJSON of every
// Wikidata protected area that has a coordinate, joined against the MoEF
// notification table to attach an `eszStatus` (final / draft / none) and
// the latest matching notification's details. Used by the dashboard map
// (index.html) and offered as a standalone download, per README's promise
// of a GeoJSON export of protected areas.

import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const wikidataPAs = JSON.parse(await readFile('data/wikidata-protected-areas.json', 'utf8'));
  const moefRecords = JSON.parse(await readFile('data/moef-esz-notifications.json', 'utf8'));

  const notificationsByWikidataId = new Map();
  for (const record of moefRecords) {
    if (!record.wikidataId) continue;
    const list = notificationsByWikidataId.get(record.wikidataId) || [];
    list.push(record);
    notificationsByWikidataId.set(record.wikidataId, list);
  }

  const features = [];
  let skippedNoCoords = 0;

  for (const pa of wikidataPAs) {
    if (pa.coordinateLatitude == null || pa.coordinateLongitude == null) {
      skippedNoCoords += 1;
      continue;
    }

    const notifications = notificationsByWikidataId.get(pa.wikidataId) || [];
    const hasFinal = notifications.some((n) => n.notificationStatus === 'Final');
    const hasDraft = notifications.some((n) => n.notificationStatus === 'Draft');
    const eszStatus = hasFinal ? 'final' : hasDraft ? 'draft' : 'none';

    // Most recent notification of the PA's current best status, for display.
    const relevant = notifications.filter((n) => n.notificationStatus === (hasFinal ? 'Final' : 'Draft'));
    const latest = relevant.sort((a, b) => (b.notificationDate || '').localeCompare(a.notificationDate || ''))[0];

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pa.coordinateLongitude, pa.coordinateLatitude],
      },
      properties: {
        wikidataId: pa.wikidataId,
        wikidataUrl: pa.wikidataUrl,
        name: pa.wikidataLabel,
        protectedAreaType: pa.protectedAreaType,
        state: (pa.state || [])[0] || null,
        iucnCategory: pa.iucnCategory || null,
        area: pa.area || null,
        osmRelationIds: pa.osmRelationIds || [],
        enwikiUrl: pa.enwikiUrl || null,
        eszStatus,
        notificationCount: notifications.length,
        notificationStatus: latest ? latest.notificationStatus : null,
        notificationDate: latest ? latest.notificationDate : null,
        orderNumber: latest ? latest.orderNumber : null,
        notificationPdfLink: latest ? latest.notificationPdfLink : null,
        notificationArchiveLink: latest ? latest.notificationArchiveLink : null,
      },
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  await writeFile('data/protected-areas.geojson', JSON.stringify(geojson, null, 2), 'utf8');

  const byStatus = { final: 0, draft: 0, none: 0 };
  for (const f of features) byStatus[f.properties.eszStatus] += 1;
  console.log(`Wrote ${features.length} PA point features to data/protected-areas.geojson (${skippedNoCoords} skipped, no coordinates).`);
  console.log('By ESZ status:', byStatus);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
