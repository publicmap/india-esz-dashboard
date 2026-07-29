# LLM Prompt

- Model: Anthropic Sonnet 5 via Claude CLI
- Project [README](README.md)
- Token Estimate: 100k

## Project Components

- Github actions to update moef-esz-notifications-table.html every week from https://www.moef.gov.in/esz-notifications
- Clean and convert the table to structured html table format with the following fields:
  - Moef S.No
  - State Name
  - Protected Area Name
  - Protected Area Type:
    - `Tiger Reserve`: Tiger*
    - `National Park`: NP, National
    - `Bird Sanctuary`: Bird*
    - Fallback `Wildlife Sanctuary`: WLS, Wild*, Santuary
  - Notification Status (Draft, Final)
  - Notification Date
  - Notification Summary 
  - Notification PDF Link
  - Notification Archive Link
    - Parse this by searching archive.org `gazetteofindia` collection for the SO Number eg. https://archive.org/advancedsearch.php?q=collection%3A%22gazetteofindia%22%20AND%20title%3A%22S.O.%20118(E)%22&fl%5B%5D=identifier&fl%5B%5D=title&rows=50&output=json
  - Maps (Array of map title and map link)
    - Several rows have links to one or more individual mapss
  - Notification Upload Date
  - Order Number (S.O. Number)
- Query Wikidata to get a complete list of protected areas (Q473972) with the following fields
  - part of
  - image
  - IUCN protected areas category
  - located in the administrative territorial entity
  - coordinate location
  - significant place
  - heritage designation
  - area
  - official website
  - page banner
  - Commons category
  - OpenStreetMap relation ID
  - enwiki link
- Add a `wikidataId` join key to the MoEF table for linking PAs across data sources
- A map dashboard to explore the above two datasets and export data as CSV and JSON that is stored on Github
 - For the map dashboard, build a custom atlas JSON for [amche-atlas](https://amche.in/dev/) via [URL API](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) and dynamic osm layers
 - Add KPI for total PAs in the country vs number of PAs with draft ESZ notifications vs number of PAs with final ESZ notifications vs number of PAs with final ESZ notifications and show progress bar
 - Use [OpenStreetMap relation IDs](https://www.openstreetmap.org/relation/281033) to show PA boundaries
