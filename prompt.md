# LLM Prompt

- Model: Anthropic Sonnet 5 via Claude CLI
- Project [README](README.md)
- Token Estimate: 250k

## Project Components

### Phas 1: Data preperation

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
    - See archive link section
  - Maps (Array of map title and map link)
    - Several rows have links to one or more individual maps
  - Notification Upload Date
  - Order Number (S.O. Number)
- Query Wikidata to get a complete list of protected areas (Q473972) with the following fields
  - part of
  - image
  - IUCN protected areas category
  - located in the administrative territorial entity
  - state name
    - by recursively using the property `located in the administrative territorial entity` and getting the instance of `state`
  - coordinate location
  - significant place
  - heritage designation
  - area
  - official website
  - page banner
  - Commons category
  - OpenStreetMap relation ID
  - enwiki link
  - wikidata link
- Add a `wikidataId` join key to the MoEF table for linking PAs across data sources

### Phase 2: Data dashboard

A static web page deployed on github pages

- Add KPI for total PAs in the country vs number of PAs with draft ESZ notifications vs number of PAs with final ESZ notifications vs number of PAs with final ESZ notifications and show progress bar
- A map based dashboard to explore the above datasets and export data as CSV and JSON that is stored on Github
 - For the map dashboard, build a custom atlas JSON for [amche-atlas](https://amche.in/dev/) via [URL API](https://github.com/publicmap/amche-atlas/blob/dev/docs/API.md) and dynamic osm layers
 - Use [OpenStreetMap relation IDs](https://www.openstreetmap.org/relation/281033) to show PA boundaries
 - Hovering over the table rows should center the map on the PA location
 - Clicking the table row should toggle zoom to z10 and open the popup
 - Similiarly clicking the map marker should select and scroll to the table row
 - Correct the India boundaries using https://github.com/ramSeraph/india_boundary_corrector

### MoEF Data cleaing

**Multiple Parks**
Several notifications affect more than a single park. These rows should be expanded into multiple rows each with a single park. Some example protectedAreaName:
- Marine National Park and Marine Sanctuary
- Kamlang Wildlife Sanctuary and Namdapha Tiger Reserve
- Nameri National Park and Sonai-Rupai Wildlife
- Valmiki Wildlife Sanctuary Valmiki National Park and Valmiki Tiger Reserve
- Bhagwan Mahaveer Wildlife Sanctuary and National Park
- Marine National Park and Marine Sanctuary
- Betla National Park, Palamau Wildlife Sanctuary and Mahuadanr Wolf Sanctuary Sanctuary
- Eravikulam National Park, Chinnar Wildlife Sanctuary, Anamudi Shola National Park, Pampadum Shola National Park and Kurinjimala Sanctuary

**Inconsistent names**
The Moef table has inconsistent park names and type across the draft and final status which need to be cleaned up. The following pairs are the same parks and will have to be canonicalized by choosing the best one:

Pulicat Bird Sanctuary	Bird Sanctuary	Draft
Pulicat Wildlife Sanctuary	Wildlife Sanctuary	Final
Great Indian Bustard Rollapadu Wildlife Sanctuary	Wildlife Sanctuary	Draft
Great Indian Bustard Rollapadu Wildlife Sanctuary	Wildlife Sanctuary	Final
Kambalkonda Wildlife Sanctuary	Wildlife Sanctuary	Draft
Kambalakonda Wildlife Sanctuary	Wildlife Sanctuary	Final
Coringa Wildlife Santuary	Wildlife Sanctuary	Draft
Coringa Wildlife Sanctuary	Wildlife Sanctuary	Final
Cuthbert Bay Wildlife	Wildlife Sanctuary	Draft
Cuthbert Bay Sanctuary	Wildlife Sanctuary	Final
Mount harriet National Park	National Park	Draft
Mount Harriet National Park	National Park	Final
Mount Harriet National Park	National Park	Final
Eagle Nest Wildlife Sanctuary	Wildlife Sanctuary	Draft
Eagle Nest Wildlife	Wildlife Sanctuary	Final
Bhimbandh Wildlife Sanctuary	Wildlife Sanctuary	Draft
Bhimbandh Wildlife Sanctuary,	Wildlife Sanctuary	Final
Khijadia Wildlife Sanctuary	Wildlife Sanctuary	Draft
Khijadiya Wildlife Sanctuary	Wildlife Sanctuary	Final
Eravikulam National Park, Chinnar Wildlife Sanctuary, Anamudi Shola National Park, Pampadum Shola National Park and Kurinjimala Sanctuary
Eravikulam National Park + 4 PAs

For cases where it is hard to code a logic create a corrections.tsv that has the input values and the canonical values for manual overrides. Fields should include PA name, state, correct PA name, correct state, correct PA type

### Fuzzy wikidata joins

Joining wikidataId to the MoEF table will require fuzzy joins due to inconsistent names
- Tokenize names
- Score matches and pick the best match which is not already matched to another park

### Archive links

Parse this by searching archive.org `gazetteofindia` collection eg. https://archive.org/advancedsearch.php?q=collection%3A%22gazetteofindia%22%20AND%20title%3A%22S.O.%20118(E)%22&fl%5B%5D=identifier&fl%5B%5D=title&rows=50&output=json . See [sample gazette](https://archive.org/details/in.gazette.central.e.2024-09-06.256983/page/n1/mode/2up)
- notification date should match the publication date
- Search title for the SO number
- Search text contents for the SO number or PA name

 Maintain a CSV cache of archive links so previoulsy matched ones do not need to be searched again. 
 - SO number will be the primary key
 - Include the wikidataId
 - Include parsed data from the [archive meta](https://dn710004.ca.archive.org/0/items/in.gazette.central.e.2024-09-06.256983/in.gazette.central.e.2024-09-06.256983_meta.xml) in the cache for QA
   - identifier
   - collection[]
   - creator
   - date
   - description
     - Ministry
     - Department
     - Subject
     - Gazette Source

In the cache if an archiveLink is found with the other fields empty it means it was manually entered and the archive metadata must be updated by re-searching archive.org 

**Allmaps IIIF URLs**

Add cols for 'allmaps images' 'toposheet page' 'toposheet thumbnail' 'allmaps editor' and 'tms'

  this will be populated using the archive iiif manifest

  eg for https://archive.org/details/in.gazette.central.e.2017-08-10.178009
  allmaps images url is https://editor.allmaps.org/images?url=https://iiif.archive.org/iiif/in.gazette.central.e.2017-08-10.178009/manifest.json&bg-preset=osm&bg-url=https://indianopenmaps.fly.dev/soi/osm/{z}/{x}/{y}.webp

  if archive url includes pg https://archive.org/details/in.gazette.central.e.2017-08-10.178009/page/n27/mode/2up
  in the cache populate the 'toposheet page' and use the iiif manifest https://iiif.archive.org/iiif/in.gazette.central.e.2017-08-10.178009/manifest.json to parse the image id for the allmaps editor url https://editor.allmaps.org/georeference?url=https%3A%2F%2Fiiif.archive.org%2Fiiif%2Fin.gazette.central.e.2017-08-10.178009%2Fmanifest.json&bg-preset=osm&bg-url=https%3A%2F%2Findianopenmaps.fly.dev%2Fsoi%2Fosm%2F%7Bz%7D%2F%7Bx%7D%2F%7By%7D.webp&image=https%3A%2F%2Fiiif.archive.org%2Fimage%2Fiiif%2F3%2Fin.gazette.central.e.2017-08-10.178009%252F178009_jp2.zip%252F178009_jp2%252F178009_0027.jp2
  add the thumbnail link to the page for 200px size
  add the tms link like https://allmaps.xyz/images/80713f728801d925/{z}/{x}/{y}@2x.png

  if toposheet page is filled in a different from the page in the url, the toposheet page value should get preference since it is expected to be a manual correction. use this page number for the allmaps urls


## General architecture

- Keep seperate files for code that produces seperate output to allow for easy debugging and testing

  
