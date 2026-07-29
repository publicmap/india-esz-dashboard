# LLM Prompt

- Model: Anthropic Sonnet 5 via Claude CLI
- Project [README](README.md)

## Project Components

- Github actions to update moef-esz-notifications-table.html every week from https://www.moef.gov.in/esz-notifications
- Clean and convert the table to structured html table format with the following fields:
  - Moef S.No
  - State Name
  - Protected Area Name
  - Protected Area Type (Tiger Reserve, National Park, Wildlife Sanctuary..)
  - Notification Status (Draft, Final)
  - Notification Date
  - Notification Summary 
  - Notification PDF Link
  - Maps (Array of map title and map link)
  - Notification Upload Date
  - Order Number (S.O. Number)
- Query Wikidata to get a complete list of protected areas (Q473972) and full join to the above table with the following additional fields
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
- A map dashboard to explore the above table and export data as CSV and JSON that is stored on Github
 - For the map dashboard, build a custom atlas JSON for [amche-atlas](https://amche.in/dev/) via [URL API](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) and dynamic osm layers
 - Add KPI for total PAs in the country vs number of PAs with draft ESZ notifications vs number of PAs with final ESZ notifications vs number of PAs with final ESZ notifications and show progress bar
 - Use [OpenStreetMap relation IDs](https://www.openstreetmap.org/relation/281033) to show PA boundaries
