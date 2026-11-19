# india-esz-dashboard

A frontend dashboard to show current status of ESZ notifications by the Ministry of Environment Forests & Climate Change (MoEFCC), Government of India. **[Live dashboard &rarr;](https://publicmap.github.io/india-esz-dashboard/)**

**Features**

- Mirror the ESZ notification HTML table on https://www.moef.gov.in/esz-notifications, updated weekly. [View](data/raw/moef-esz-notifications-table.html)
- Interactive map dashboard showing:
    - KPIs for total protected areas vs. draft/final ESZ notification coverage
    - Protected area locations colored by ESZ notification status, with a filterable/sortable notification table
    - PA boundaries (where mapped on OpenStreetMap) explorable via a custom [amche-atlas](https://amche.in/dev/) atlas
- Download the notification list and protected area list as CSV/JSON, and protected area locations as GeoJSON
- Conflation with protected area data on wikidata.org

## About Eco-Sensitive Zones (ESZs)

ESZs are designated buffer areas around protected habitats like national parks and wildlife sanctuaries. They act as shock absorbers to minimize human impact on fragile ecosystems, typically spanning up to 10 kilometers, though boundaries remain site-specific

The purpose of declaring ESZs is to create buffer zones for the protected areas by regulating and managing the activities around such areas. They also act as a transition zone from areas of high protection to areas involving lesser protection.

Source: [Wikipedia](https://en.wikipedia.org/wiki/Eco-sensitive_zone)

**About ESZ Notifications**

>![ESZ notification status of protected areas in India](assets/img/pib-moefcc-note.png)<br>
Source: [PIB, Ministry of Environment Forests & Climate Change, Government of India](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=126299&reg=48&lang=2)


- 1970: The Indian Board for Wildlife (IBWL) is created as an advisory body to provide guidance on issues relating to the protection and conservation of wildlife and their habitats.  
- 2002: The 21st IBWL meeting adopts the [Wildlife Conservation Strategy 2002](https://moef.gov.in/uploads/2018/03/WILDLIFE%20CONSERVATION%20STRATEGY%202002.pdf) chaired by Shri Atal Bihari Bajpai, then honourable Prime Minister of India, which proposed notifying 10km buffer zones of eco-fragile zones around protected areas where mining an polluting industries will be prohibited
- 2003: The National Board for Wildlife (NBWL) is constituted as a statutory body to replace IBWL
- 2004: The [Goa Foundation](http://goafoundation.org) filed a landmark case [(PIL Writ Petition 460/2004)](https://indiankanoon.org/doc/81576067/) in the Supreme Court of India for clarification regarding iron ore mining within 10km of protected areas in Goa state
- 2006: Supreme Court of India directs all State/UTs to define Eco-Sensitive Zones (ESZ) around protected areas within 4 weeks failing which a [10km ESZ will apply as default](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=126299&reg=48&lang=2)
- 2011: [Guidelines for declaration of ESZ](https://cpc.parivesh.nic.in/writereaddata/Guidelines_for_EcoSensitive_Zones_around_Protected_Areas.pdf) pulbished by MoEFCC outlining procedures to State/UTs to demarcate and notify ESZ with the following details:
```
(i) Delineation of the physical boundaries on a topo-sheet with precise
description in geographic terms together with a description of the
significant features/attributes that would potentially qualify the area as
eco-sensitive zone. A description of the boundaries alongwith the list of
villages with exception and exemption in the delineated buffer zone area.
(ii) An inventory of the existing legal status of rights, entitlements, privileges and obligations of the local communities.
(iii) A description of bio-diversity values including bio-geographical
representatives, endemism, species richness, geo-morphological
characteristics, and unique land use practices including aesthetic and
cultural values.
(iv) A description of the resource base indicating the economic potential and
livelihood implication for the people residing in and around the
proposed eco-sensitive area.
(v) An inventory of activities to be regulated and/ or prohibited in the
proposed eco-sensitive zone.
(vi) List of the protected areas for declaring eco-sensitive zone.
- 2012: Due to lack of progress on ESZ identification, [CEC reccomends a safety zone of 100m-2000m metres](https://hash-cookies.s3.amazonaws.com/CEC%20buffer%20zones%20report%2020.9.2012.pdf) in the interim based on protected area size
```
- 2015: Goa becomes the first state to publish final ESZ notifications for all 6 protected areas in the state
- 2017: 
- 2022: [Supreme Court mandates a minimum 1km ESZ](https://api.sci.gov.in/supremecourt/1995/2997/2997_1995_5_1501_36130_Order_03-Jun-2022.pdf) around all protected areas
- 2023: [Supreme Court dilutes 1km minimum ESZ in 2022 order to define minimum ESZ](https://api.sci.gov.in/supremecourt/1995/2997/2997_1995_8_1501_43924_Judgement_26-Apr-2023.pdf) to be protected area specific citing uniform minimums being impossible to implement.
- 2023: MoEFCC release [updated guidelines for seeking recommendations of the
Standing Committee of NBWL for activities in protected areas and ESZ](https://cdnbbsr.s3waas.gov.in/s3fa5f68379610ec97bf9b19dfeb19d910/uploads/2025/09/202509051613268164.pdf)
- 2025: [IGNFA]() publishes a [Discussion paper on ESZ](https://www.ignfa.gov.in/publications/an-evaluative-discusion-esz-paper.pdf) which advocates for a risk based approach to ESZ declaration

## Data pipeline

```
npm install
npm run update   # fetch -> parse -> clean -> enrich:osm -> enrich:wikidata -> enrich:archive -> enrich:allmaps -> build:gazette-maps -> build:osm-protected-areas -> build:geojson -> build:full-join -> build:atlas
```

Runs weekly via `.github/workflows/update.yml`; the dashboard (`index.html`) is redeployed to GitHub Pages afterwards by `.github/workflows/pages.yml`. Enable Pages once under repo Settings &rarr; Pages &rarr; Source: "GitHub Actions".

`npm run update` is just those steps chained together. Each can also be run on its own,
which is useful when re-running only the part affected by a correction (see
[Contributing corrections](#contributing-corrections) below) instead of the whole
pipeline:

| # | Command | Reads | Writes | What it does |
| - | --- | --- | --- | --- |
| 1 | `npm run fetch` | https://moef.gov.in/esz-notifications, three Wikipedia protected-area list pages | `data/raw/moef-esz-notifications-table.html`, `data/raw/{national-parks,wildlife-sanctuaries,tiger-reserves}-table.html` | Scrapes the raw MoEF ESZ notifications table HTML, plus the Wikipedia national parks/wildlife sanctuaries/tiger reserves list tables (each combined from that page's per-state sub-tables into one table) |
| 2 | `npm run parse` | the raw tables from step 1 | `data/moef/esz-notifications.json`, `data/wikipedia/{national-parks,wildlife-sanctuaries,tiger-reserves}.{csv,json}` | Parses the MoEF table into one structured record per Draft/Final notification (`parse:moef`) and the three Wikipedia tables into one structured record per protected area (`parse:wikipedia`) |
| 3 | `npm run clean` | `data/moef/esz-notifications.json`, `data/corrections.csv` | `data/moef/esz-notifications.json` | Applies manual corrections, splits multi-park notifications into one record per area, canonicalizes names/types |
| 4 | `npm run enrich:wikidata` | `data/moef/esz-notifications.json`, live Wikidata SPARQL, `data/wikipedia/{national-parks,wildlife-sanctuaries,tiger-reserves}.json`, `data/osm/protected-areas.csv` (if present) | `data/wikidata/protected-areas.{csv,json}`, `data/wikidata/qa-log.md`, `data/moef/esz-notifications.{csv,json}` (+ `wikidataId`/`matchConfidence`), `data/enrichment-cache.csv` | Fetches the full Wikidata list of Indian protected areas; cross-references it against the three Wikipedia lists to correct outdated `protectedAreaType` categorization and add any protected area Wikipedia has that Wikidata doesn't (building `data/wikidata/protected-areas.json` as the master PA list); cross-references OSM boundaries by `wikidata` tag; links each MoEF notification to its master-list item |
| 5 | `npm run enrich:archive` | `data/moef/esz-notifications.json`, archive.org search | `data/moef/esz-notifications.{csv,json}` (+ `notificationArchiveLink`), `data/enrichment-cache.csv` | Looks up each notification's official gazette scan on archive.org |
| 6 | `npm run enrich:allmaps` | `data/enrichment-cache.csv` | `data/enrichment-cache.csv` (+ Allmaps fields) | Adds Allmaps IIIF georeferencing links for toposheet scans found in step 5 |
| 7 | `npm run build:gazette-maps` | `data/moef/esz-notifications.json`, Servants of Knowledge + archive.org IIIF manifests, Allmaps annotations API | `data/gazette-maps/collection.json`, `data/gazette-maps/manifests/<id>.json`, `data/gazette-maps/mosaic.json`, `data/gazette-maps/mosaic-annotations.json` | For each gazette matched in step 5, builds a IIIF manifest of its map images (images embedded in the PDF, plus page scans that have been georeferenced) with the Allmaps georeferencing embedded, a IIIF Collection of those manifests, and a mosaic of every georeferenced map to load as one layer |
| 8 | `npm run build:osm-protected-areas` | Postpass (OSM) | `data/osm/india-protected-areas-all.{geojson,mbtiles}` | Downloads every OSM feature with `boundary=protected_area`, `boundary=national_park` or a `protect_class` tag in the India bbox, keeps those whose interior point is inside India, and tiles them with [tippecanoe](https://github.com/felt/tippecanoe) (must be installed) |
| 9 | `npm run build:geojson` | `data/wikidata/protected-areas.json`, `data/moef/esz-notifications.json` | `data/protected-areas.geojson` | Builds the point-feature GeoJSON (PA location + ESZ status) |
| 10 | `npm run build:full-join` | `data/wikidata/protected-areas.json`, `data/moef/esz-notifications.json` | `data/full-join.json` | Builds the full outer join of Wikidata PAs and MoEF notifications (keyed by `wikidataId`, falling back to state+name for unmatched records) with a precomputed representative notification per PA &mdash; the single file `index.html`/`assets/app.js` load to render the table and map |
| 11 | `npm run build:atlas` | `data/protected-areas.geojson` | `data/amche-atlas.json` | Builds the [amche-atlas](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) config (PA points + live OSM-relation boundary layers) |

Steps 4–6 cache their lookups in `data/enrichment-cache.csv`, so re-running them after
the first full run is fast — only new/changed notifications are re-fetched. Step 7 caches the
gazette IIIF manifests in `.cache/gazettes/` and reuses them; it always refetches Allmaps
georeferencing. Run `npm run build:gazette-maps -- --refresh` now and then to re-download
everything.

The gazette text and images aren't part of the update. `npm run dump:gazettes` saves each
matched gazette's OCR text (`ocr.txt`, from egazette.servantsofknowledge.in), its metadata
and the map images embedded in its PDF to `.cache/gazettes/<id>/`. Use `--limit N`,
`--ids a,b`, `--no-text`, `--no-images` or `--refresh` as needed.

Outputs:
- `data/moef/esz-notifications.{csv,json}` — one row per protected area per notification, with a `wikidataId` join key
- `data/wikipedia/national-parks.{csv,json}` — one row per national park, from [List of national parks of India](https://en.wikipedia.org/wiki/List_of_national_parks_of_India)
- `data/wikipedia/wildlife-sanctuaries.{csv,json}` — one row per wildlife sanctuary, from [List of wildlife sanctuaries of India](https://en.wikipedia.org/wiki/List_of_wildlife_sanctuaries_of_India)
- `data/wikipedia/tiger-reserves.{csv,json}` — one row per tiger reserve (with coordinates), from [Tiger reserves of India](https://en.wikipedia.org/wiki/Tiger_reserves_of_India)
- `data/wikidata/protected-areas.{csv,json}` — the master protected-area list: every Wikidata item in scope (`protectedAreaType` corrected against the Wikipedia lists where they disagree), plus a `dataSource: "wikipedia"` entry (synthetic `WIKIPEDIA:...` id, no real Wikidata QID) for any Wikipedia protected area with no Wikidata match, cross-referenced with OSM boundary ids where matched
- `data/wikidata/qa-log.md` — QA report for both cross-reference passes: **Wikidata ↔ Wikipedia joins** (type corrections, multi-matched items, new master-list entries, unmatched items on either side) and **Wikidata ↔ OSM joins** (unmatched items, outdated ids, coordinate/name mismatches) — for manual review
- `data/protected-areas.geojson` — PA point locations with ESZ status
- `data/full-join.json` — full outer join of the two above, one entry per protected area with its notification history nested; this is what the dashboard actually loads (downloadable CSV/JSON/GeoJSON links on the page still point at the individual files above)
- `data/amche-atlas.json` — custom [amche-atlas](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) config (PA points + OSM-relation boundary layers)
- `data/gazette-maps/collection.json` — IIIF Collection of one manifest per gazette (`data/gazette-maps/manifests/`), each listing that gazette's map images with Allmaps georeferencing embedded
- `data/gazette-maps/mosaic.json` / `mosaic-annotations.json` — every georeferenced gazette map as a single layer: a IIIF Manifest for [Allmaps Viewer](https://viewer.allmaps.org/?url=https://publicmap.github.io/india-esz-dashboard/data/gazette-maps/mosaic.json), and an AnnotationPage for Allmaps' map plugins and tile server (`https://allmaps.xyz/{z}/{x}/{y}.png?url=https://publicmap.github.io/india-esz-dashboard/data/gazette-maps/mosaic-annotations.json`)
- `data/osm/india-protected-areas-all.{geojson,mbtiles}` — every OSM protected area in India, all OSM tags as properties (layer `protected_areas` in the MBTiles)
- `data/enrichment-cache.csv` — persistent cache of Wikidata/archive.org lookups so repeat runs are fast

### Digitizing boundaries from a gazette notification

`scripts/digitize-gazette-maps.py` turns the maps and coordinate tables in a Gazette of India
ESZ notification into GeoJSON. It runs separately from the npm pipeline, one gazette at a time,
and needs only [uv](https://docs.astral.sh/uv/), which installs its Python dependencies:

```
uv run scripts/digitize-gazette-maps.py https://egazette.servantsofknowledge.in/details/in.gazette.central.e.2024-11-29.259220/
```

It accepts a gazette URL or identifier. The PDF comes from egazette.servantsofknowledge.in,
with archive.org as a fallback. For scanned gazettes it uses the archive's OCR text. Then it:

1. Parses every coordinate table under its Annexure. Decimal and D°M′S″ values are both
   read, including PDFs where the degree sign comes out as a `0` (`920 39’49”`).
2. Georeferences each framed map. It finds the graticule ticks, then picks the
   interval, origin and boundary colour that put the most table points on a drawn line.
3. Traces the boundary lines of the best map, or the one named in `labels.json`, and
   closes dash gaps. It then polygonizes the enclosed faces and groups them into zones.

Output in `data/gazette-maps/<gazette-id>/`:

- `boundaries.geojson`: one polygon per zone (e.g. `core`, `buffer`, `esz`) with its area
- `faces.geojson`: every traced face, with its edge styles, ESZ-village count and area, for review
- `table-points.geojson`: the table points, plus each boundary table's outline in listed order
- `<map>.tif` / `<map>-preview.png`: georeferenced map images and a QA overlay
- `report.json`: georeference fit, zone areas next to the areas stated in the text, and the
  distance from the listed boundary points to the traced boundary
- `labels.json` (hand-written, optional): which map and line colour to use, plus seed
  `[lon, lat]` points that assign faces to zones. Without it, a face is labelled `esz` when it
  contains listed ESZ villages or is mostly edged in yellow dashes.

Limits: it can trace boundaries only when they're drawn in a distinct colour on a map with a
graticule frame. Rotated or greyscale scans and black-line toposheets still produce table
outlines, and the toposheets also get a GeoTIFF, but nothing is traced. Check the preview
image and `report.json` (`table_fit_m`, `warning`) before trusting a trace.

## Contributing corrections

This is scraped and joined data from a government site and Wikidata, so it's imperfect —
corrections are welcome via pull request. Depending on what's wrong, fix it at a
different point in the pipeline rather than editing the generated `data/*.json`/`*.csv`
outputs directly, since those get overwritten the next time the pipeline runs:

- **A MoEF notification's protected area name, state, or type is wrong or garbled**
  (e.g. a mis-scraped name, a multi-park notification that didn't split correctly) —
  add a row to [`data/corrections.csv`](data/corrections.csv) keyed by the *exact*
  `paName`/`state` as they currently appear in `data/moef/esz-notifications.json`, with
  `correctPaName`/`correctState`/`correctPaType` set to the fix (leave a column blank to
  leave that field alone). Applied by `scripts/clean-moef-data.js`. Re-run `npm run
  clean` (or the full pipeline from step 3 onward) to verify.
- **A state name is wrong or inconsistent everywhere it appears** (e.g. an old/misspelled
  state name used across many notifications) — add a row to
  [`data/corrections.csv`](data/corrections.csv) with `paName`/`correctPaName`/
  `correctPaType` left blank, just `state` (the exact value to match) and `correctState`
  (the fix). This renames the state on *every* MoEF record with that state, instead of
  needing one row per protected area.
- **A notification's S.O./order number is mis-typed on the MoEF site itself**
  (verified against the actual gazette, e.g. on archive.org) — add a row to
  [`data/corrections.csv`](data/corrections.csv) with `orderNumber` set to the
  *exact* wrong value as it currently appears in `data/moef/esz-notifications.json`
  and `correctOrderNumber` set to the fix (all other columns blank). Applied by
  `scripts/clean-moef-data.js`, which also fixes the same literal number
  embedded in that record's `notificationSummary` text.
- **A Wikidata field is wrong or missing** (state, admin territorial entity, coordinates,
  IUCN category, etc.) — fix it at the source: edit the item on
  [wikidata.org](https://www.wikidata.org/), then re-run `npm run enrich:wikidata` (or
  `npm run update`) to pull the fix back into this repo. For rows missing a `state` or
  `locatedInAdminTerritorialEntity` value, `npm run suggest:missing-state` /
  `npm run suggest:missing-located-in` can suggest one by reading the item's Wikipedia
  article — see [`scripts/plugins/README.md`](scripts/plugins/README.md) for that
  workflow before batch-editing Wikidata.
- **A gazette/archive.org or toposheet link is wrong** — the `toposheet page` column in
  [`data/enrichment-cache.csv`](data/enrichment-cache.csv) is a manual override read by
  `scripts/enrich-allmaps.js`; other archive fields are safe to blank out to force
  `npm run enrich:archive` to re-look them up on the next run.
- **Something else** (pipeline bug, dashboard bug, new feature) — open an issue or PR as
  usual.