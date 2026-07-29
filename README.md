# moef-esz-notifications

A frontend dashboard to show current status of ESZ notifications by the Ministry of Environment Forests & Climate Change (MoEFCC), Government of India. **[Live dashboard &rarr;](https://publicmap.github.io/moef-esz-notifications/)**

Features include:

- Mirror the ESZ notification table on https://www.moef.gov.in/esz-notifications updated weekly
- Master list of protected areas in India with ESZ notification status in CSV format
- Interactive map dashboard showing:
    - KPIs for total protected areas vs. draft/final ESZ notification coverage
    - Protected area locations colored by ESZ notification status, with a filterable/sortable notification table
    - PA boundaries (where mapped on OpenStreetMap) explorable via a custom [amche-atlas](https://amche.in/dev/) atlas
- Download the notification list and protected area list as CSV/JSON, and protected area locations as GeoJSON

## Data pipeline

```
npm install
npm run update   # fetch -> parse -> clean -> enrich:wikidata -> enrich:archive -> build:geojson -> build:atlas
```

Runs weekly via `.github/workflows/update.yml`; the dashboard (`index.html`) is redeployed to GitHub Pages afterwards by `.github/workflows/pages.yml`. Enable Pages once under repo Settings &rarr; Pages &rarr; Source: "GitHub Actions".

Outputs, all in `data/`:
- `moef-esz-notifications.{csv,json}` — one row per protected area per notification, with a `wikidataId` join key
- `wikidata-protected-areas.{csv,json}` — full Wikidata list of Indian protected areas
- `protected-areas.geojson` — PA point locations with ESZ status, used by the dashboard map
- `amche-atlas.json` — custom [amche-atlas](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) config (PA points + OSM-relation boundary layers)
- `enrichment-cache.csv` — persistent cache of Wikidata/archive.org lookups so repeat runs are fast

**About Eco-Sensitive Zones (ESZs)**

ESZs are designated buffer areas around protected habitats like national parks and wildlife sanctuaries. They act as shock absorbers to minimize human impact on fragile ecosystems, typically spanning up to 10 kilometers, though boundaries remain site-specific

The purpose of declaring ESZs is to create buffer zones for the protected areas by regulating and managing the activities around such areas. They also act as a transition zone from areas of high protection to areas involving lesser protection.

Source: [Wikipedia](https://en.wikipedia.org/wiki/Eco-sensitive_zone)

**About ESZ Notifications**

- 2002: The Indian Board for Wildlife proposed 10km buffer zones under the Environment Protection Act of 1986 to insulate national parks and sanctuaries
- 2004: The Goa Foundation filed a landmark case [(PIL Writ Petition 460/2004)](https://indiankanoon.org/doc/81576067/) in the Supreme Court of India demanding action against authorities for failing to notify ESZs around protected wildlife areas
- 2006: Supreme Court of India directs all State/UTs to define ESZ around protected areas within 4 weeks
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
- 2022: [Supreme Court mandates a minimum 1km ESZ](https://api.sci.gov.in/supremecourt/1995/2997/2997_1995_5_1501_36130_Order_03-Jun-2022.pdf) around all protected areas