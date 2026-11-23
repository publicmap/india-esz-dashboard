// Builds data/natural-earth/countries-ind.pmtiles: Natural Earth 1:10m
// admin-0 countries from India's point of view (ne_10m_admin_0_countries_ind,
// which follows India's claimed boundaries in Jammu & Kashmir, Ladakh and
// Arunachal Pradesh), tiled with tippecanoe as layer `countries` keeping only
// ADM0_A3_IN and NAME. The dashboard map draws the country outlines and greys
// out every country except India.
//
// The source GeoJSON (~13 MB) is cached in .cache/natural-earth/.
//
// Usage: node scripts/build-natural-earth.js [--refresh]
import { mkdir, writeFile, access, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const NE_VERSION = 'v5.1.2';
const SOURCE_URL = `https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@${NE_VERSION}/geojson/ne_10m_admin_0_countries_ind.geojson`;
const CACHE_PATH = '.cache/natural-earth/ne_10m_admin_0_countries_ind.geojson';
const PMTILES_PATH = 'data/natural-earth/countries-ind.pmtiles';

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
  const refresh = process.argv.includes('--refresh');
  if (refresh || !(await exists(CACHE_PATH))) {
    console.log(`Downloading ${SOURCE_URL}...`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`);
    await mkdir('.cache/natural-earth', { recursive: true });
    await writeFile(CACHE_PATH, Buffer.from(await res.arrayBuffer()));
  }
  await mkdir('data/natural-earth', { recursive: true });
  // Temporary name + rename, so a failed run leaves the previous tiles intact.
  const tmp = PMTILES_PATH.replace(/\.pmtiles$/, '.tmp.pmtiles');
  const r = spawnSync('tippecanoe', [
    '-o', tmp, '--force', '-l', 'countries', '-n', 'Natural Earth countries (India point of view)',
    '-A', 'Made with Natural Earth', '-Z0', '-z8', '-y', 'ADM0_A3_IN', '-y', 'NAME',
    '--detect-shared-borders', '--no-tile-size-limit', '--quiet', CACHE_PATH,
  ], { stdio: 'inherit' });
  if (r.error) throw new Error(`tippecanoe not available: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`tippecanoe exited with ${r.status}`);
  await rename(tmp, PMTILES_PATH);
  console.log(`Wrote ${PMTILES_PATH}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
