# Protected-area QA log

Generated 2026-08-04T17:34:22.545Z by `scripts/enrich-wikidata.js`.

## Wikidata ↔ Wikipedia joins

Cross-referenced against 745 records from `data/wikipedia/{national-parks,wildlife-sanctuaries,tiger-reserves}.json`.

### Summary

- **Wikidata protectedAreaType corrected from Wikipedia**: 45
- **Wikipedia list entry type disagrees with final master-list type**: 62
- **Wikidata item matched by multiple Wikipedia entries**: 68
- **Fuzzy Wikidata<->Wikipedia matches**: 35
- **Wikipedia entries with no Wikidata match (added to master list)**: 164
- **Wikidata items with no Wikipedia match**: 45

### Wikidata protectedAreaType corrected from Wikipedia

Wikidata's P31-derived type disagreed with the matched Wikipedia entry's -- corrected in favor of Wikipedia (more actively maintained for these three categories).

| wikidataId | wikidataLabel | oldType | newType | wikipediaSource | wikipediaUrl | matchConfidence |
| --- | --- | --- | --- | --- | --- | --- |
| Q1815612 | Namdapha National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Namdapha_National_Park | exact |
| Q192764 | Kaziranga National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Kaziranga_National_Park | exact |
| Q506511 | Manas National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Manas_National_Park | exact |
| Q2989157 | Nameri National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Nameri_National_Park | exact |
| Q2989176 | Orang National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Orang_National_Park | exact |
| Q2428291 | Valmiki National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Valmiki_National_Park | exact |
| Q1427976 | Indravati National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Indravati_National_Park | exact |
| Q60398704 | Marine Sanctuary (Gulf of Kutch) | Wildlife Sanctuary | National Park | national-parks | https://en.wikipedia.org/wiki/Marine_National_Park,_Gulf_of_Kutch | exact |
| Q111181101 | Limber Wildlife Sanctuary | Wildlife Sanctuary | National Park | national-parks | https://en.wikipedia.org/wiki/Kazinag_National_Park | exact |
| Q665110 | Bandipur National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Bandipur_National_Park | exact |
| Q1520200 | Nagarhole National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Nagarhole_National_Park | exact |
| Q548153 | Periyar National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Periyar_National_Park | exact |
| Q806310 | Bandhavgarh National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Bandhavgarh_National_Park | exact |
| Q5557523 | Ghughua Fossil Park | (none) | National Park | national-parks | https://en.wikipedia.org/wiki/Ghughua_Fossil_Park | exact |
| Q1480481 | Kanha National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Kanha_Tiger_Reserve | exact |
| Q1143016 | Kuno Wildlife Sanctuary | Wildlife Sanctuary | National Park | national-parks | https://en.wikipedia.org/wiki/Kuno_National_Park | exact |
| Q2604975 | Madhav National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Madhav_National_Park | exact |
| Q1858071 | Panna National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Panna_National_Park | exact |
| Q2720864 | Pench National Park | National Park | Tiger Reserve | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pench_Tiger_Reserve | exact |
| Q3092341 | Sanjay National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Sanjay_National_Park | exact |
| Q733659 | Satpura National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Satpura_Tiger_Reserve | exact |
| Q763034 | Nawegaon National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Navegaon_National_Park | exact |
| Q61529 | Simlipal National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Simlipal_National_Park | exact |
| Q1466242 | Ranthambore National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Ranthambore_National_Park | exact |
| Q2372700 | Mudumalai National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Mudumalai_National_Park | exact |
| Q253455 | Dudhwa National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Dudhwa_National_Park | exact |
| Q949297 | Jim Corbett National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Jim_Corbett_National_Park | exact |
| Q181933 | Rajaji National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Rajaji_National_Park | exact |
| Q532440 | Sundarbans National Park | National Park | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Sundarbans_National_Park | exact |
| Q17014014 | Kolleru Bird Sanctuary | Bird Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kolleru_Wildlife_Sanctuary | exact |
| Q22231355 | Kamlang Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Kamlang_Wildlife_Sanctuary | exact |
| Q4673468 | Achanakmar Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Achanakmar_Wildlife_Sanctuary | exact |
| Q24946728 | Sitanadi Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Sitanadi_Wildlife_Sanctuary | exact |
| Q7786671 | Thol Lake | (none) | Bird Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Thol_Lake_Bird_Sanctuary | exact |
| Q4900541 | Bhadra Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Bhadra_Wildlife_Sanctuary | exact |
| Q3523324 | Karimpuzha National Park | National Park | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Karimpuzha_Wildlife_Sanctuary | exact |
| Q48731965 | Veerangana Durgavati Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Veerangana_Durgavati_Wildlife_Sanctuary | exact |
| Q4944241 | Bor Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Bor_Wildlife_Sanctuary | exact |
| Q123399066 | Bandh Baretha | (none) | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bandh_Baretha | exact |
| Q121754153 | Ramgarh Vishdhari Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Ramgarh_Vishdhari_Wildlife_Sanctuary | exact |
| Q5609778 | Grizzled Squirrel Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Srivilliputhur-Megamalai_Tiger_Reserve | fuzzy |
| Q6379588 | Kawal Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Kawal_Wildlife_Sanctuary | exact |
| Q48729855 | Parvati Arga Bird Sanctuary | Bird Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Parvati_Arga_Wildlife_Sanctuary | exact |
| Q7293072 | Ranipur  Wildlife Sanctuary | Wildlife Sanctuary | Tiger Reserve | tiger-reserves | https://en.wikipedia.org/wiki/Ranipur_Wildlife_Sanctuary | exact |
| Q7408881 | Samaspur Sanctuary | Wildlife Sanctuary | Bird Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Samaspur_Bird_Sanctuary | exact |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

Adds the Wikipedia-confirmed `instance of` (P31) value. Does **not** remove the old P31 value -- some items legitimately hold more than one (e.g. a Tiger Reserve that is also a National Park); remove the stale one by hand only if it truly no longer applies.

Lines are in table order -- cross-check each against the `matchConfidence` column above before running; a `fuzzy` row is less certain than an `exact` one and deserves a closer look first.

Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:

```
Q1815612	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Namdapha_National_Park"
Q192764	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kaziranga_National_Park"
Q506511	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Manas_National_Park"
Q2989157	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Nameri_National_Park"
Q2989176	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Orang_National_Park"
Q2428291	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Valmiki_National_Park"
Q1427976	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Indravati_National_Park"
Q60398704	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/Marine_National_Park,_Gulf_of_Kutch"
Q111181101	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kazinag_National_Park"
Q665110	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bandipur_National_Park"
Q1520200	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Nagarhole_National_Park"
Q548153	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Periyar_National_Park"
Q806310	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bandhavgarh_National_Park"
Q5557523	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ghughua_Fossil_Park"
Q1480481	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kanha_Tiger_Reserve"
Q1143016	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kuno_National_Park"
Q2604975	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Madhav_National_Park"
Q1858071	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Panna_National_Park"
Q2720864	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pench_Tiger_Reserve"
Q3092341	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sanjay_National_Park"
Q733659	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Satpura_Tiger_Reserve"
Q763034	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Navegaon_National_Park"
Q61529	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Simlipal_National_Park"
Q1466242	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ranthambore_National_Park"
Q2372700	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mudumalai_National_Park"
Q253455	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dudhwa_National_Park"
Q949297	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jim_Corbett_National_Park"
Q181933	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Rajaji_National_Park"
Q532440	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sundarbans_National_Park"
Q17014014	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kolleru_Wildlife_Sanctuary"
Q22231355	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kamlang_Wildlife_Sanctuary"
Q4673468	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Achanakmar_Wildlife_Sanctuary"
Q24946728	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sitanadi_Wildlife_Sanctuary"
Q7786671	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thol_Lake_Bird_Sanctuary"
Q4900541	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bhadra_Wildlife_Sanctuary"
Q3523324	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karimpuzha_Wildlife_Sanctuary"
Q48731965	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Veerangana_Durgavati_Wildlife_Sanctuary"
Q4944241	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bor_Wildlife_Sanctuary"
Q123399066	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bandh_Baretha"
Q121754153	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ramgarh_Vishdhari_Wildlife_Sanctuary"
Q5609778	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Srivilliputhur-Megamalai_Tiger_Reserve"
Q6379588	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kawal_Wildlife_Sanctuary"
Q48729855	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Parvati_Arga_Wildlife_Sanctuary"
Q7293072	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ranipur_Wildlife_Sanctuary"
Q7408881	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/Samaspur_Bird_Sanctuary"
```

</details>

### Wikipedia list entry type disagrees with final master-list type

A Wikipedia list entry's own `protectedAreaType` (e.g. every `wildlife-sanctuaries.json` row defaults to Wildlife Sanctuary) doesn't match the type its matched item ended up with in the final master list (`data/wikidata/protected-areas.json`). Usually this is a *different*, more specific Wikipedia entry for the same place winning (see "matched by multiple Wikipedia entries" below, in which case no action is needed here) -- but since Wikipedia's lists are more actively maintained and more current than Wikidata, a row here can also mean this entry's own Wikipedia list is stale, or a fuzzy match linked the wrong Wikipedia entry to this item.

| wikidataId | wikidataLabel | finalType | wikipediaName | wikipediaType | wikipediaSource | wikipediaUrl | matchConfidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Q2979723 | Galathea National Park | National Park | Galathea Bay Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Galathea_Bay_Wildlife_Sanctuary?action=edit&redlink=1 | exact |
| Q3364468 | North Button Island National Park | National Park | North Brother Island Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/North_Brother_Island_Wildlife_Sanctuary?action=edit&redlink=1 | fuzzy |
| Q770855 | South Button Island National Park | National Park | South Brother Island Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/South_Brother_Island_Wildlife_Sanctuary?action=edit&redlink=1 | fuzzy |
| Q770855 | South Button Island National Park | National Park | South Sentinel Island Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/South_Sentinel_Island_Wildlife_Sanctuary?action=edit&redlink=1 | fuzzy |
| Q1815612 | Namdapha National Park | Tiger Reserve | Namdapha National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Namdapha_National_Park | exact |
| Q192764 | Kaziranga National Park | Tiger Reserve | Kaziranga National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Kaziranga_National_Park | exact |
| Q506511 | Manas National Park | Tiger Reserve | Manas National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Manas_National_Park | exact |
| Q2989157 | Nameri National Park | Tiger Reserve | Nameri National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Nameri_National_Park | exact |
| Q2989176 | Orang National Park | Tiger Reserve | Orang National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Orang_National_Park | exact |
| Q2428291 | Valmiki National Park | Tiger Reserve | Valmiki National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Valmiki_National_Park | exact |
| Q2428291 | Valmiki National Park | Tiger Reserve | Valmiki Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Valmiki_Wildlife_Sanctuary | exact |
| Q1427976 | Indravati National Park | Tiger Reserve | Indravati National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Indravati_National_Park | exact |
| Q2397554 | Bhagwan Mahaveer Sanctuary and Mollem National Park | National Park | Bhagwan Mahavir Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bhagwan_Mahavir_Sanctuary | fuzzy |
| Q337028 | Gir National Park | National Park | Gir Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gir_Wildlife_Sanctuary | exact |
| Q111181101 | Limber Wildlife Sanctuary | National Park | Limber Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Limber_Wildlife_Sanctuary | exact |
| Q5215675 | Anshi National Park | National Park | Dandeli Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Dandeli_Wildlife_Sanctuary | exact |
| Q665110 | Bandipur National Park | Tiger Reserve | Bandipur National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Bandipur_National_Park | exact |
| Q1520200 | Nagarhole National Park | Tiger Reserve | Nagarhole National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Nagarhole_National_Park | exact |
| Q548153 | Periyar National Park | Tiger Reserve | Periyar National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Periyar_National_Park | exact |
| Q548153 | Periyar National Park | Tiger Reserve | Periyar Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Periyar_Wildlife_Sanctuary | exact |
| Q806310 | Bandhavgarh National Park | Tiger Reserve | Bandhavgarh National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Bandhavgarh_National_Park | exact |
| Q1480481 | Kanha National Park | Tiger Reserve | Kanha National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Kanha_National_Park | exact |
| Q2604975 | Madhav National Park | Tiger Reserve | Madhav National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Madhav_National_Park | exact |
| Q1858071 | Panna National Park | Tiger Reserve | Panna National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Panna_National_Park | exact |
| Q2720864 | Pench National Park | Tiger Reserve | Pench National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Pench_National_Park | exact |
| Q3092341 | Sanjay National Park | Tiger Reserve | Sanjay National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Sanjay_National_Park | exact |
| Q3092341 | Sanjay National Park | Tiger Reserve | Sanjay National Park | National Park | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sanjay_National_Park | exact |
| Q733659 | Satpura National Park | Tiger Reserve | Satpura National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Satpura_National_Park | exact |
| Q763034 | Nawegaon National Park | Tiger Reserve | Navegaon National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Navegaon_National_Park | exact |
| Q763034 | Nawegaon National Park | Tiger Reserve | Nawegaon Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Nawegaon_Wildlife_Sanctuary?action=edit&redlink=1 | exact |
| Q2639563 | Tadoba-Andhari Tiger Reserve | Tiger Reserve | Andhari Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Andhari_Wildlife_Sanctuary | fuzzy |
| Q2580141 | Bhitarkanika National Park | National Park | Bhitarkanika Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bhitarkanika_Wildlife_Sanctuary | exact |
| Q61529 | Simlipal National Park | Tiger Reserve | Simlipal National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Simlipal_National_Park | exact |
| Q61529 | Simlipal National Park | Tiger Reserve | Simlipal National Park | National Park | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Simlipal_National_Park | exact |
| Q5224247 | Mukundra Hills Tiger Reserve | Tiger Reserve | Mukundara Hills National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Mukundara_Hills_National_Park | fuzzy |
| Q1466242 | Ranthambore National Park | Tiger Reserve | Ranthambore National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Ranthambore_National_Park | exact |
| Q1661434 | Anaimalai Tiger Reserve | Tiger Reserve | Anamalai Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Anamalai_Wildlife_Sanctuary | exact |
| Q2372700 | Mudumalai National Park | Tiger Reserve | Mudumalai National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Mudumalai_National_Park | exact |
| Q2372700 | Mudumalai National Park | Tiger Reserve | Mudumalai Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Mudumalai_Wildlife_Sanctuary | exact |
| Q253455 | Dudhwa National Park | Tiger Reserve | Dudhwa National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Dudhwa_National_Park | exact |
| Q5589844 | Govind Pashu Vihar National Park and Sanctuary | National Park | Govind Pashu Vihar Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Govind_Pashu_Vihar_Wildlife_Sanctuary | fuzzy |
| Q949297 | Jim Corbett National Park | Tiger Reserve | Jim Corbett National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Jim_Corbett_National_Park | exact |
| Q181933 | Rajaji National Park | Tiger Reserve | Rajaji National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Rajaji_National_Park | exact |
| Q532440 | Sundarbans National Park | Tiger Reserve | Sundarbans National Park | National Park | national-parks | https://en.wikipedia.org/wiki/Sundarbans_National_Park | exact |
| Q22231355 | Kamlang Wildlife Sanctuary | Tiger Reserve | Kamlang Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kamlang_Wildlife_Sanctuary | exact |
| Q4673468 | Achanakmar Wildlife Sanctuary | Tiger Reserve | Achanakmar Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Achanakmar_Wildlife_Sanctuary | exact |
| Q24946728 | Sitanadi Wildlife Sanctuary | Tiger Reserve | Sitanadi Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sitanadi_Wildlife_Sanctuary | exact |
| Q4900541 | Bhadra Wildlife Sanctuary | Tiger Reserve | Bhadra Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bhadra_Wildlife_Sanctuary | exact |
| Q3631211 | Biligiriranga Hills Tiger Reserve | Tiger Reserve | Biligiriranga Hills | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Biligiriranga_Hills | exact |
| Q3635169 | Parambikulam Tiger Reserve | Tiger Reserve | Parambikulam Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Parambikulam_Wildlife_Sanctuary | exact |
| Q7295480 | Ratapani Tiger Reserve | Tiger Reserve | Ratapani Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ratapani_Wildlife_Sanctuary | exact |
| Q48731965 | Veerangana Durgavati Wildlife Sanctuary | Tiger Reserve | Veerangana Durgavati Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Veerangana_Durgavati_Wildlife_Sanctuary | exact |
| Q4944241 | Bor Wildlife Sanctuary | Tiger Reserve | Bor Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bor_Wildlife_Sanctuary | exact |
| Q6372818 | Karnala Bird Sanctuary | Bird Sanctuary | Narnala Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Narnala_Wildlife_Sanctuary?action=edit&redlink=1 | fuzzy |
| Q2429161 | Melghat Tiger Reserve | Tiger Reserve | Melghat | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Melghat | exact |
| Q7426314 | Satkosia Tiger Reserve | Tiger Reserve | Satkosia Gorge Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Satkosia_Gorge_Wildlife_Sanctuary | fuzzy |
| Q121754153 | Ramgarh Vishdhari Wildlife Sanctuary | Tiger Reserve | Ramgarh Vishdhari Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ramgarh_Vishdhari_Wildlife_Sanctuary | exact |
| Q5609778 | Grizzled Squirrel Wildlife Sanctuary | Tiger Reserve | Grizzled Squirrel Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Grizzled_Squirrel_Wildlife_Sanctuary | exact |
| Q2226064 | Sathyamangalam Tiger Reserve | Tiger Reserve | Sathyamangalam Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sathyamangalam_Wildlife_Sanctuary | exact |
| Q6379588 | Kawal Wildlife Sanctuary | Tiger Reserve | Kawal Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kawal_Wildlife_Sanctuary | exact |
| Q7193996 | Pilibhit Tiger Reserve | Tiger Reserve | Pilibhit Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pilibhit_Wildlife_Sanctuary?action=edit&redlink=1 | exact |
| Q7293072 | Ranipur  Wildlife Sanctuary | Tiger Reserve | Ranipur Wildlife Sanctuary | Wildlife Sanctuary | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ranipur_Wildlife_Sanctuary | exact |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No mechanical fix -- review each row individually. If the final type is correct (a more specific Wikipedia entry legitimately won), no action needed. If this entry's own Wikipedia list is out of date, fix it on Wikipedia so the next run picks it up. If `matchConfidence` is `fuzzy` and this looks like the wrong place entirely, the fix is on the matching side, not here -- see the "Fuzzy Wikidata<->Wikipedia matches" section.

</details>

### Wikidata item matched by multiple Wikipedia entries

More than one Wikipedia entry (possibly from different lists) matched the same Wikidata item.

| wikidataId | wikidataLabel | matchedEntries | detail |
| --- | --- | --- | --- |
| Q2979723 | Galathea National Park | Galathea National Park [national-parks] (National Park); Galathea Bay Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3364468 | North Button Island National Park | North Button Island National Park [national-parks] (National Park); North Brother Island Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q770855 | South Button Island National Park | South Button Island National Park [national-parks] (National Park); South Brother Island Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); South Sentinel Island Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3174893 | Sri Venkateswara National Park | Sri Venkateswara National Park [national-parks] (National Park); Sri Venkateswara National Park [wildlife-sanctuaries] (National Park) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1815612 | Namdapha National Park | Namdapha National Park [national-parks] (National Park); Namdapha National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q192764 | Kaziranga National Park | Kaziranga National Park [national-parks] (National Park); Kaziranga National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q506511 | Manas National Park | Manas National Park [national-parks] (National Park); Manas National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2989157 | Nameri National Park | Nameri National Park [national-parks] (National Park); Nameri National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2989176 | Orang National Park | Orang National Park [national-parks] (National Park); Orang National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2428291 | Valmiki National Park | Valmiki National Park [national-parks] (National Park); Valmiki Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Valmiki National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q131465770 | Guru Ghasidas - Tamor Pingla Tiger Reserve | Guru Ghasidas - Tamor Pingla Tiger Reserve [national-parks] (Tiger Reserve); Guru Ghasidas - Tamor Pingla Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1427976 | Indravati National Park | Indravati National Park [national-parks] (National Park); Indravati National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2397554 | Bhagwan Mahaveer Sanctuary and Mollem National Park | Mollem National Park [national-parks] (National Park); Bhagwan Mahavir Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q337028 | Gir National Park | Gir Forest National Park [national-parks] (National Park); Gir Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q60398704 | Marine Sanctuary (Gulf of Kutch) | Marine National Park, Gulf of Kutch [national-parks] (National Park); Marine National Park, Gulf of Kutch [wildlife-sanctuaries] (National Park) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2985156 | Kalesar National Park | Kalesar National Park [national-parks] (National Park); Kalesar National Park [wildlife-sanctuaries] (National Park) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q111181101 | Limber Wildlife Sanctuary | Kazinag National Park [national-parks] (National Park); Limber Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q5215675 | Anshi National Park | Anshi National Park [national-parks] (National Park); Dandeli Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q665110 | Bandipur National Park | Bandipur National Park [national-parks] (National Park); Bandipur National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1520200 | Nagarhole National Park | Nagarhole National Park [national-parks] (National Park); Nagarhole National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q548153 | Periyar National Park | Periyar National Park [national-parks] (National Park); Periyar Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Periyar National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q806310 | Bandhavgarh National Park | Bandhavgarh National Park [national-parks] (National Park); Bandhavgarh National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1480481 | Kanha National Park | Kanha National Park [national-parks] (National Park); Kanha Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2604975 | Madhav National Park | Madhav National Park [national-parks] (National Park); Madhav National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1858071 | Panna National Park | Panna National Park [national-parks] (National Park); Panna National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2720864 | Pench National Park | Pench National Park [national-parks] (National Park); Pench Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Pench Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3092341 | Sanjay National Park | Sanjay National Park [national-parks] (National Park); Sanjay National Park [wildlife-sanctuaries] (National Park); Sanjay National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q733659 | Satpura National Park | Satpura National Park [national-parks] (National Park); Satpura Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q763034 | Nawegaon National Park | Navegaon National Park [national-parks] (National Park); Nawegaon Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Navegaon National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2639563 | Tadoba-Andhari Tiger Reserve | Tadoba Andhari Tiger Reserve [national-parks] (Tiger Reserve); Andhari Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Tadoba Andhari Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2580141 | Bhitarkanika National Park | Bhitarkanika National Park [national-parks] (National Park); Bhitarkanika Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q61529 | Simlipal National Park | Simlipal National Park [national-parks] (National Park); Simlipal National Park [wildlife-sanctuaries] (National Park); Simlipal National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3058213 | Desert National Park | Desert National Park [national-parks] (National Park); Desert National Park [wildlife-sanctuaries] (National Park) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q5224247 | Mukundra Hills Tiger Reserve | Mukundara Hills National Park [national-parks] (National Park); Mukandra Hills Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1466242 | Ranthambore National Park | Ranthambore National Park [national-parks] (National Park); Ranthambore National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2572177 | Sariska Tiger Reserve | Sariska Tiger Reserve [national-parks] (Tiger Reserve); Sariska Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Sariska Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q1661434 | Anaimalai Tiger Reserve | Anaimalai Tiger Reserve [national-parks] (Tiger Reserve); Anamalai Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Anamalai Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2372700 | Mudumalai National Park | Mudumalai National Park [national-parks] (National Park); Mudumalai Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Mudumalai National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q253455 | Dudhwa National Park | Dudhwa National Park [national-parks] (National Park); Dudhwa National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q5589844 | Govind Pashu Vihar National Park and Sanctuary | Govind Pashu Vihar National Park [national-parks] (National Park); Govind Pashu Vihar Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q949297 | Jim Corbett National Park | Jim Corbett National Park [national-parks] (National Park); Jim Corbett National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q181933 | Rajaji National Park | Rajaji National Park [national-parks] (National Park); Rajaji National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2340037 | Buxa Tiger Reserve | Buxa Tiger Reserve [national-parks] (Tiger Reserve); Buxa Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Buxa Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q532440 | Sundarbans National Park | Sundarbans National Park [national-parks] (National Park); Sundarbans National Park Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3895706 | Nagarjunsagar-Srisailam Tiger Reserve | Nagarjunsagar-Srisailam Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Nagarjunsagar-Srisailam Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Nagarjunsagar-Srisailam Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q22231355 | Kamlang Wildlife Sanctuary | Kamlang Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Kamlang Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7125480 | Pakhui Tiger Reserve | Pakke Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Pakke Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q4673468 | Achanakmar Wildlife Sanctuary | Achanakmar Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Achanakmar Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q24946728 | Sitanadi Wildlife Sanctuary | Sitanadi Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Sitanadi Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7126657 | Palamau Tiger Reserve | Palamau Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Palamau Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q4900541 | Bhadra Wildlife Sanctuary | Bhadra Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Bhadra Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3631211 | Biligiriranga Hills Tiger Reserve | Biligiriranga Hills [wildlife-sanctuaries] (Wildlife Sanctuary); Biligiriranga Hills Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3635169 | Parambikulam Tiger Reserve | Parambikulam Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Parambikulam Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7295480 | Ratapani Tiger Reserve | Ratapani Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Ratapani Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q48731965 | Veerangana Durgavati Wildlife Sanctuary | Veerangana Durgavati Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Veerangana Durgavati Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q4944241 | Bor Wildlife Sanctuary | Bor Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Bor Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q6372818 | Karnala Bird Sanctuary | Karnala Bird Sanctuary [wildlife-sanctuaries] (Bird Sanctuary); Narnala Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2429161 | Melghat Tiger Reserve | Melghat [wildlife-sanctuaries] (Wildlife Sanctuary); Melghat Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q6959133 | Nagzira Wildlife Sanctuary | Nagzira Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); New Nagzira Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3457187 | Dampa Tiger Reserve | Dampa Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Dampa Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7426314 | Satkosia Tiger Reserve | Satkosia Gorge Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Satkosia Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q121754153 | Ramgarh Vishdhari Wildlife Sanctuary | Ramgarh Vishdhari Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Ramgarh Vishdhari Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q5609778 | Grizzled Squirrel Wildlife Sanctuary | Grizzled Squirrel Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Srivilliputhur-Megamalai Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q3936889 | Kalakkad Mundanthurai Tiger Reserve | Kalakkad Mundanthurai Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Kalakkad Mundanthurai Tiger Reserve [wildlife-sanctuaries] (Tiger Reserve); Kalakkad Mundanthurai Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q2226064 | Sathyamangalam Tiger Reserve | Sathyamangalam Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Sathyamangalam Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q6379588 | Kawal Wildlife Sanctuary | Kawal Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Kawal Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7193996 | Pilibhit Tiger Reserve | Pilibhit Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Pilibhit Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |
| Q7293072 | Ranipur  Wildlife Sanctuary | Ranipur Wildlife Sanctuary [wildlife-sanctuaries] (Wildlife Sanctuary); Ranipur Wildlife Sanctuary Tiger Reserve [tiger-reserves] (Tiger Reserve) | More than one Wikipedia entry matched the same Wikidata item -- either a genuine reclassification (fine) or a wrong fuzzy match on one of them (review). |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No single correct edit -- this is either a genuine reclassification (the Wikidata item legitimately covers what Wikipedia now splits across multiple articles/types, in which case the protectedAreaType correction above already handles it) or a wrong fuzzy match pulling an unrelated Wikipedia entry onto this item (in which case the fix is on the *matching* side, not a Wikidata edit -- see the "Fuzzy Wikidata<->Wikipedia matches" and "Wikidata items with no Wikipedia match" sections, since a wrongly-absorbed entry usually shows up there as the real item's missed match).

</details>

### Fuzzy Wikidata<->Wikipedia matches

Matched by fuzzy name/state similarity rather than an exact name match -- worth a human sanity check.

| wikidataId | wikidataLabel | wikipediaName | wikipediaSource | wikipediaState |
| --- | --- | --- | --- | --- |
| Q3364468 | North Button Island National Park | North Brother Island Wildlife Sanctuary | wildlife-sanctuaries | Andaman and Nicobar Islands |
| Q770855 | South Button Island National Park | South Brother Island Wildlife Sanctuary | wildlife-sanctuaries | Andaman and Nicobar Islands |
| Q770855 | South Button Island National Park | South Sentinel Island Wildlife Sanctuary | wildlife-sanctuaries | Andaman and Nicobar Islands |
| Q96401141 | Rajiv Gandhi National Park | Rajiv Gandhi National Park (Rameswaram) | national-parks | Andhra Pradesh |
| Q2397554 | Bhagwan Mahaveer Sanctuary and Mollem National Park | Bhagwan Mahavir Sanctuary | wildlife-sanctuaries | Goa |
| Q3330156 | Pampadum Shola National Park | Pambadum Shola National Park | national-parks | Kerala |
| Q2639563 | Tadoba-Andhari Tiger Reserve | Andhari Wildlife Sanctuary | wildlife-sanctuaries | Maharashtra |
| Q3091771 | Ntangki National Park | Intanki National Park | national-parks | Nagaland |
| Q235878 | Kevladev National Park | Keoladeo National Park | national-parks | Rajasthan |
| Q5224247 | Mukundra Hills Tiger Reserve | Mukundara Hills National Park | national-parks | Rajasthan |
| Q5224247 | Mukundra Hills Tiger Reserve | Mukandra Hills Tiger Reserve | tiger-reserves | Rajasthan |
| Q5589844 | Govind Pashu Vihar National Park and Sanctuary | Govind Pashu Vihar National Park | national-parks | Uttarakhand |
| Q5589844 | Govind Pashu Vihar National Park and Sanctuary | Govind Pashu Vihar Wildlife Sanctuary | wildlife-sanctuaries | Uttarakhand |
| Q17033744 | Talley Valley Wildlife Sanctuary | Talle Valley Wildlife Sanctuary | wildlife-sanctuaries | Arunachal Pradesh |
| Q15203562 | Bornadi Wildlife Sanctuary | Barnadi Wildlife Sanctuary | wildlife-sanctuaries | Assam |
| Q7206203 | Pobitora Wildlife Sanctuary | Pabitora Wildlife Sanctuary | wildlife-sanctuaries | Assam |
| Q135350403 | Kusheshwar Asthan Bird Sanctuary | Kusheshwar Asthan Bird Wildlife Sanctuary | wildlife-sanctuaries | Bihar |
| Q19833696 | Balaram Ambaji Widelife Sanctuary | Balaram Ambaji Wildlife Sanctuary | wildlife-sanctuaries | Gujarat |
| Q6881784 | Mitiyala Lion Sanctuary | Mitiyala Wildlife Sanctuary | wildlife-sanctuaries | Gujarat |
| Q1207543 | Indian Wild Ass Sanctuary | Wild Ass Wildlife Sanctuary | wildlife-sanctuaries | Gujarat |
| Q17002798 | Bir Shikargarh Wildlife Sanctuary | Bir Shikargah Wildlife Sanctuary | wildlife-sanctuaries | Haryana |
| Q3846171 | Ranganthittu Bird Sanctuary | Ranganathittu Bird Sanctuary | wildlife-sanctuaries | Karnataka |
| Q112252433 | Rangayyanadurga Four–horned antelope Wildlife Sanctuary | Rangayyanadurga Four-horned antelope Wildlife Sanctuary | wildlife-sanctuaries | Karnataka |
| Q6806784 | Chimmini Wildlife Sanctuary | Chimmony Wildlife Sanctuary | wildlife-sanctuaries | Kerala |
| Q13111992 | Chulannur Peafowl Sanctuary | Choolannur Pea Fowl Sanctuary | wildlife-sanctuaries | Kerala |
| Q6372818 | Karnala Bird Sanctuary | Narnala Wildlife Sanctuary | wildlife-sanctuaries | Maharashtra |
| Q6959133 | Nagzira Wildlife Sanctuary | New Nagzira Wildlife Sanctuary | wildlife-sanctuaries | Maharashtra |
| Q16902313 | Umred Karhandla Wildlife Sanctuary | Umred Pauni Karhandla Wildlife Sanctuary | wildlife-sanctuaries | Maharashtra |
| Q7426314 | Satkosia Tiger Reserve | Satkosia Gorge Wildlife Sanctuary | wildlife-sanctuaries | Odisha |
| Q5609778 | Grizzled Squirrel Wildlife Sanctuary | Srivilliputhur-Megamalai Tiger Reserve | tiger-reserves | Tamil Nadu |
| Q2253195 | Koothankulam Bird Sanctuary | Koonthankulam Bird Sanctuary | wildlife-sanctuaries | Tamil Nadu |
| Q4122004 | Vellode Birds Sanctuary | Vellode Bird Sanctuary | wildlife-sanctuaries | Tamil Nadu |
| Q7635241 | Suhelva Sanctuary | Sohelwa Wildlife Sanctuary | wildlife-sanctuaries | Uttar Pradesh |
| Q7402708 | Sajnekhali Wildlife Sanctuary | Sajnakhali Wildlife Sanctuary | wildlife-sanctuaries | West Bengal |
| Q7461463 | Shahayadri Tiger reserve | Sahyadri Tiger Reserve | tiger-reserves | Maharashtra |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No mechanical fix -- the type/URL correction from this match (if any) is already reflected in the "protectedAreaType corrected" section above. If a row here turns out to be the *wrong* Wikidata item for this Wikipedia entry, the correct item is often sitting in the "Wikidata items with no Wikipedia match" section below (unmatched because this fuzzy match took its Wikipedia entry) -- fix it there instead of here.

</details>

### Wikipedia entries with no Wikidata match (added to master list)

No Wikidata item matched this Wikipedia entry by name/state -- added to the master protected-area list as a new entry with a synthetic `WIKIPEDIA:...` id instead of a Wikidata QID.

| protectedAreaName | protectedAreaType | state | wikipediaSource | wikipediaUrl |
| --- | --- | --- | --- | --- |
| Blackbuck National Park, Velavadar | National Park | Gujarat | national-parks | https://en.wikipedia.org/wiki/Blackbuck_National_Park,_Velavadar |
| Pench National Park(Jawaharlal Nehru) | National Park | Maharashtra | national-parks |  |
| AK National Park | National Park | Meghalaya | national-parks | https://en.wikipedia.org/wiki/AK_National_Park?action=edit&redlink=1 |
| Barren Island (Andaman Islands) | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Barren_Island_(Andaman_Islands) |
| Battimalv Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Battimalv_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Belle Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Belle_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Benett Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Benett_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bingham Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bingham_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Blister Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Blister_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bluff Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bluff_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bondoville Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bondoville_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Brush Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Brush_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Buchanan Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Buchanan_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Chanel Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Chanel_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Cinque Islands Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Cinque_Islands_Wildlife_Sanctuary?action=edit&redlink=1 |
| Clyde Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Clyde_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Cone Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Cone_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Curlew (B.P.) Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Curlew_(B.P.)_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Curlew Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Curlew_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Defence Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Defence_Island_Wildlife_Sanctuary |
| Dot Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Dot_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Dottrell Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Dottrell_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Duncan Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Duncan_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| East Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/East_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| East of Inglis Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/East_of_Inglis_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Egg Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Egg_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Entrance Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Entrance_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Flat Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Flat_Island_Wildlife_Sanctuary |
| Gander Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gander_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Girjan Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Girjan_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Goose Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Goose_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Hump Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Hump_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Interview Island | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Interview_Island |
| James Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/James_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Jungle Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Jungle_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Kyd Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kyd_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Landfall Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Landfall_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Latouche Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Latouche_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Lohabarrack Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Lohabarrack_Wildlife_Sanctuary?action=edit&redlink=1 |
| Mangrove Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Mangrove_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Mask Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Mask_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Mayo Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Mayo_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Megapode Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Megapode_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Montogemery Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Montogemery_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Narcondam Island | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Narcondam_Island |
| North Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/North_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| North Reef Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/North_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Oliver Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Oliver_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Orchid Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Orchid_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Ox Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ox_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Oyster Island‑I Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Oyster_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1 |
| Oyster Island‑II Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Oyster_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1 |
| Paget Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Paget_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Parkinson Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Parkinson_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Passage Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Passage_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Patric Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Patric_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Peacock Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Peacock_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Pitman Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pitman_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Point Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Point_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Potanma Islands Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Potanma_Islands_Wildlife_Sanctuary?action=edit&redlink=1 |
| Ranger Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ranger_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Reef Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Roper Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Roper_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Ross Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ross_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Rowe Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Rowe_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sandy Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sandy_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sea Serpent Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sea_Serpent_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Shark Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Shark_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Shearme Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Shearme_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sir Hugh Rose Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sir_Hugh_Rose_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sisters Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sisters_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Snake Island‑I Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Snake_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1 |
| Snake Island‑II Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Snake_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1 |
| South Reef Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/South_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Spike Island‑I Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Spike_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1 |
| Spike Island‑II Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Spike_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1 |
| Stoat Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Stoat_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Surat Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Surat_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Swamp Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Swamp_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Table (Delgarno) Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Table_(Delgarno)_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Table (Excelsior) Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Table_(Excelsior)_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Talabaicha Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Talabaicha_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Temple Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Temple_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tillongchang Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tillongchang_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tree Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tree_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Trilby Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Trilby_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tuft Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tuft_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Turtle Islands Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Turtle_Islands_Wildlife_Sanctuary |
| West Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/West_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Wharf Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Wharf_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| White Cliff Island Wildlife Sanctuary | Wildlife Sanctuary | Andaman and Nicobar Islands | wildlife-sanctuaries | https://en.wikipedia.org/wiki/White_Cliff_Island_Wildlife_Sanctuary?action=edit&redlink=1 |
| Kanwarjheel Wildlife Sanctuary | Wildlife Sanctuary | Bihar | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kanwarjheel_Wildlife_Sanctuary |
| Kais Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kais_Wildlife_Sanctuary?action=edit&redlink=1 |
| Khokhan Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Khokhan_Wildlife_Sanctuary?action=edit&redlink=1 |
| Lippa Asrang Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Lippa_Asrang_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sainj Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sainj_Wildlife_Sanctuary?action=edit&redlink=1 |
| Shikari Devi Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Shikari_Devi_Wildlife_Sanctuary?action=edit&redlink=1 |
| Shimla Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Shimla_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tundah Wildlife Sanctuary | Wildlife Sanctuary | Himachal Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tundah_Wildlife_Sanctuary?action=edit&redlink=1 |
| Jasrota Wildlife Sanctuary | Wildlife Sanctuary | Jammu and Kashmir | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Jasrota_Wildlife_Sanctuary?action=edit&redlink=1 |
| Nandini Wildlife Sanctuary | Wildlife Sanctuary | Jammu and Kashmir | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Nandini_Wildlife_Sanctuary?action=edit&redlink=1 |
| Ramnagar Rakha Wildlife Sanctuary | Wildlife Sanctuary | Jammu and Kashmir | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Ramnagar_Rakha_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tratte Koot | Wildlife Sanctuary | Jammu and Kashmir | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tratte_Koot |
| Gautam Budha Wildlife Sanctuary | Wildlife Sanctuary | Jharkhand | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gautam_Budha_Wildlife_Sanctuary |
| Parasnath Wildlife Sanctuary | Wildlife Sanctuary | Jharkhand | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Parasnath_Wildlife_Sanctuary?action=edit&redlink=1 |
| Udhwa Lake Wildlife Sanctuary | Wildlife Sanctuary | Jharkhand | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Udhwa_Lake_Wildlife_Sanctuary?action=edit&redlink=1 |
| Arsikere Sloth Bear Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Arsikere_Sloth_Bear_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bankapura Wolf Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bankapura_Wolf_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bhimgad Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bhimgad_Wildlife_Sanctuary |
| Cauvery Extension Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Cauvery_Extension_Wildlife_Sanctuary?action=edit&redlink=1 |
| Gudekote Extension Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gudekote_Extension_Wildlife_Sanctuary?action=edit&redlink=1 |
| Kamasandra Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kamasandra_Wildlife_Sanctuary?action=edit&redlink=1 |
| Uttaregudda Wildlife Sanctuary | Wildlife Sanctuary | Karnataka | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Uttaregudda_Wildlife_Sanctuary?action=edit&redlink=1 |
| Aralam Butterfly Sanctuary | Wildlife Sanctuary | Kerala | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Aralam_Butterfly_Sanctuary |
| Changthang Cold Desert Wildlife Sanctuary | Wildlife Sanctuary | Ladakh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Changthang_Cold_Desert_Wildlife_Sanctuary |
| Karakoram Wildlife Sanctuary | Wildlife Sanctuary | Ladakh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Karakoram_Wildlife_Sanctuary |
| Pitti Wildlife Sanctuary | Wildlife Sanctuary | Lakshadweep | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pitti_Wildlife_Sanctuary?action=edit&redlink=1 |
| Dr. Bhimrao Ambedkar Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Wildlife_Sanctuary |
| Gangau Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gangau_Wildlife_Sanctuary?action=edit&redlink=1 |
| Karmajhiri Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Karmajhiri_Wildlife_Sanctuary?action=edit&redlink=1 |
| Omkareshwar Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries |  |
| Pachmarhi Biosphere Reserve | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pachmarhi_Biosphere_Reserve |
| Sailana Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sailana_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bhamragarh Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bhamragarh_Wildlife_Sanctuary?action=edit&redlink=1 |
| Deolgaon‑Rehkuri Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Deolgaon‑Rehkuri_Wildlife_Sanctuary?action=edit&redlink=1 |
| Gautala Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Gautala_Wildlife_Sanctuary |
| Isapur Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Isapur_Wildlife_Sanctuary?action=edit&redlink=1 |
| Katepurna Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Katepurna_Wildlife_Sanctuary?action=edit&redlink=1 |
| Malvan Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Malvan_Wildlife_Sanctuary?action=edit&redlink=1 |
| Mansingdeo Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Mansingdeo_Wildlife_Sanctuary?action=edit&redlink=1 |
| Naigaon Mayur Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Naigaon_Mayur_Wildlife_Sanctuary?action=edit&redlink=1 |
| New Bor Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/New_Bor_Wildlife_Sanctuary?action=edit&redlink=1 |
| New Maldhok Bird (Gangewadi) Wildlife Sanctuary | Bird Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/New_Maldhok_Bird_(Gangewadi)_Wildlife_Sanctuary?action=edit&redlink=1 |
| Sudhagad Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sudhagad_Wildlife_Sanctuary?action=edit&redlink=1 |
| Tamhini Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Tamhini_Wildlife_Sanctuary?action=edit&redlink=1 |
| Thane Creek Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Thane_Creek_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bunning Wildlife Sanctuary | Wildlife Sanctuary | Manipur | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bunning_Wildlife_Sanctuary?action=edit&redlink=1 |
| Kailam Wildlife Sanctuary | Wildlife Sanctuary | Manipur | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Kailam_Wildlife_Sanctuary?action=edit&redlink=1 |
| Khongjaingamba Ching Wildlife Sanctuary | Wildlife Sanctuary | Manipur | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Khongjaingamba_Ching_Wildlife_Sanctuary?action=edit&redlink=1 |
| Thinungei Bird Sanctuary | Bird Sanctuary | Manipur | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Thinungei_Bird_Sanctuary?action=edit&redlink=1 |
| Zeilad Wildlife Sanctuary | Wildlife Sanctuary | Manipur | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Zeilad_Wildlife_Sanctuary?action=edit&redlink=1 |
| Siju Wildlife Sanctuary | Wildlife Sanctuary | Meghalaya | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Siju_Wildlife_Sanctuary |
| Sunabeda Wildlife Sanctuary | Wildlife Sanctuary | Odisha | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sunabeda_Wildlife_Sanctuary |
| Bir Bhadson Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bir_Bhadson_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bir Dosanjh Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bir_Dosanjh_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bir Gurdialpura Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bir_Gurdialpura_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bir Mehaswala Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bir_Mehaswala_Wildlife_Sanctuary?action=edit&redlink=1 |
| Bir Motibagh Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Bir_Motibagh_Wildlife_Sanctuary?action=edit&redlink=1 |
| Harike Lake Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Harike_Lake_Wildlife_Sanctuary?action=edit&redlink=1 |
| Jhajjar Bacholi Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Jhajjar_Bacholi_Wildlife_Sanctuary?action=edit&redlink=1 |
| Takhni-Rehampur Wildlife Sanctuary | Wildlife Sanctuary | Punjab | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Takhni-Rehampur_Wildlife_Sanctuary?action=edit&redlink=1 |
| National Chambal Wildlife Sanctuary | National Park | Rajasthan | wildlife-sanctuaries | https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary |
| Sawai Madhopur Wildlife Sanctuary | Wildlife Sanctuary | Rajasthan | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sawai_Madhopur_Wildlife_Sanctuary |
| Megamalai Wildlife Sanctuary | Wildlife Sanctuary | Tamil Nadu | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Megamalai_Wildlife_Sanctuary |
| Pulicat Lake Bird Sanctuary | Bird Sanctuary | Tamil Nadu | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pulicat_Lake_Bird_Sanctuary |
| Thanthai Periyar Wildlife Sanctuary | Wildlife Sanctuary | Tamil Nadu | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Thanthai_Periyar_Wildlife_Sanctuary |
| Eturnagaram Wildlife Sanctuary | Wildlife Sanctuary | Telangana | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Eturnagaram_Wildlife_Sanctuary |
| Manjira Wildlife Sanctuary | Wildlife Sanctuary | Telangana | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Manjira_Wildlife_Sanctuary |
| Dr. Bhimrao Ambedkar Bird Sanctuary | Bird Sanctuary | Uttar Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Bird_Sanctuary?action=edit&redlink=1 |
| National Chambal Wildlife Sanctuary | National Park | Uttar Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary |
| Sur Sarovar Sanctuary | Wildlife Sanctuary | Uttar Pradesh | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Sur_Sarovar_Sanctuary |
| Pakhibitan Wildlife Sanctuary | Wildlife Sanctuary | West Bengal | wildlife-sanctuaries | https://en.wikipedia.org/wiki/Pakhibitan_Wildlife_Sanctuary?action=edit&redlink=1 |
| Pench Tiger Reserve | Tiger Reserve | Maharashtra | tiger-reserves | https://en.wikipedia.org/wiki/Pench_Tiger_Reserve |
| Dholpur—Karauli Tiger Reserve | Tiger Reserve | Rajasthan | tiger-reserves | https://en.wikipedia.org/wiki/Dholpur—Karauli_Tiger_Reserve?action=edit&redlink=1 |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

One `CREATE` block per new master-list entry -- makes a brand-new Wikidata item (label, instance-of, country, state, and the enwiki sitelink) sourced to the Wikipedia article that had no Wikidata item at all. **Search by name on Wikidata first before running any of these** -- this list comes from name/state matching against the fetched Indian-protected-area set, which can miss an existing item that's simply typed/labelled outside that set (e.g. missing `P17` India, or a P31 subclass this dashboard doesn't query for).

Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:

```
CREATE
LAST	Len	"Blackbuck National Park, Velavadar"
LAST	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/Blackbuck_National_Park,_Velavadar"
LAST	P17	Q668
LAST	P131	Q1061	S143	Q328	S854	"https://en.wikipedia.org/wiki/Blackbuck_National_Park,_Velavadar"
LAST	Senwiki	"Blackbuck National Park, Velavadar"
CREATE
LAST	Len	"Pench National Park(Jawaharlal Nehru)"
LAST	P31	Q46169	S143	Q328
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328
CREATE
LAST	Len	"AK National Park"
LAST	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/AK_National_Park?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1195	S143	Q328	S854	"https://en.wikipedia.org/wiki/AK_National_Park?action=edit&redlink=1"
LAST	Senwiki	"AK National Park"
CREATE
LAST	Len	"Barren Island (Andaman Islands)"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Barren_Island_(Andaman_Islands)"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Barren_Island_(Andaman_Islands)"
LAST	Senwiki	"Barren Island (Andaman Islands)"
CREATE
LAST	Len	"Battimalv Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Battimalv_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Battimalv_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Battimalv Island Wildlife Sanctuary"
CREATE
LAST	Len	"Belle Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Belle_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Belle_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Belle Island Wildlife Sanctuary"
CREATE
LAST	Len	"Benett Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Benett_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Benett_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Benett Island Wildlife Sanctuary"
CREATE
LAST	Len	"Bingham Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bingham_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bingham_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bingham Island Wildlife Sanctuary"
CREATE
LAST	Len	"Blister Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Blister_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Blister_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Blister Island Wildlife Sanctuary"
CREATE
LAST	Len	"Bluff Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bluff_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bluff_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bluff Island Wildlife Sanctuary"
CREATE
LAST	Len	"Bondoville Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bondoville_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bondoville_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bondoville Island Wildlife Sanctuary"
CREATE
LAST	Len	"Brush Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Brush_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Brush_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Brush Island Wildlife Sanctuary"
CREATE
LAST	Len	"Buchanan Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Buchanan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Buchanan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Buchanan Island Wildlife Sanctuary"
CREATE
LAST	Len	"Chanel Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Chanel_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Chanel_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Chanel Island Wildlife Sanctuary"
CREATE
LAST	Len	"Cinque Islands Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cinque_Islands_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cinque_Islands_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Cinque Islands Wildlife Sanctuary"
CREATE
LAST	Len	"Clyde Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Clyde_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Clyde_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Clyde Island Wildlife Sanctuary"
CREATE
LAST	Len	"Cone Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cone_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cone_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Cone Island Wildlife Sanctuary"
CREATE
LAST	Len	"Curlew (B.P.) Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Curlew_(B.P.)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Curlew_(B.P.)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Curlew (B.P.) Island Wildlife Sanctuary"
CREATE
LAST	Len	"Curlew Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Curlew_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Curlew_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Curlew Island Wildlife Sanctuary"
CREATE
LAST	Len	"Defence Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Defence_Island_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Defence_Island_Wildlife_Sanctuary"
LAST	Senwiki	"Defence Island Wildlife Sanctuary"
CREATE
LAST	Len	"Dot Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dot_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dot_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Dot Island Wildlife Sanctuary"
CREATE
LAST	Len	"Dottrell Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dottrell_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dottrell_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Dottrell Island Wildlife Sanctuary"
CREATE
LAST	Len	"Duncan Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Duncan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Duncan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Duncan Island Wildlife Sanctuary"
CREATE
LAST	Len	"East Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/East_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/East_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"East Island Wildlife Sanctuary"
CREATE
LAST	Len	"East of Inglis Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/East_of_Inglis_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/East_of_Inglis_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"East of Inglis Island Wildlife Sanctuary"
CREATE
LAST	Len	"Egg Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Egg_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Egg_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Egg Island Wildlife Sanctuary"
CREATE
LAST	Len	"Entrance Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Entrance_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Entrance_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Entrance Island Wildlife Sanctuary"
CREATE
LAST	Len	"Flat Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Flat_Island_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Flat_Island_Wildlife_Sanctuary"
LAST	Senwiki	"Flat Island Wildlife Sanctuary"
CREATE
LAST	Len	"Gander Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gander_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gander_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Gander Island Wildlife Sanctuary"
CREATE
LAST	Len	"Girjan Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Girjan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Girjan_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Girjan Island Wildlife Sanctuary"
CREATE
LAST	Len	"Goose Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Goose_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Goose_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Goose Island Wildlife Sanctuary"
CREATE
LAST	Len	"Hump Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Hump_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Hump_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Hump Island Wildlife Sanctuary"
CREATE
LAST	Len	"Interview Island"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Interview_Island"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Interview_Island"
LAST	Senwiki	"Interview Island"
CREATE
LAST	Len	"James Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/James_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/James_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"James Island Wildlife Sanctuary"
CREATE
LAST	Len	"Jungle Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jungle_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jungle_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Jungle Island Wildlife Sanctuary"
CREATE
LAST	Len	"Kyd Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kyd_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kyd_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Kyd Island Wildlife Sanctuary"
CREATE
LAST	Len	"Landfall Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Landfall_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Landfall_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Landfall Island Wildlife Sanctuary"
CREATE
LAST	Len	"Latouche Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Latouche_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Latouche_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Latouche Island Wildlife Sanctuary"
CREATE
LAST	Len	"Lohabarrack Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Lohabarrack_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Lohabarrack_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Lohabarrack Wildlife Sanctuary"
CREATE
LAST	Len	"Mangrove Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mangrove_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mangrove_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Mangrove Island Wildlife Sanctuary"
CREATE
LAST	Len	"Mask Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mask_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mask_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Mask Island Wildlife Sanctuary"
CREATE
LAST	Len	"Mayo Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mayo_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mayo_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Mayo Island Wildlife Sanctuary"
CREATE
LAST	Len	"Megapode Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Megapode_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Megapode_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Megapode Island Wildlife Sanctuary"
CREATE
LAST	Len	"Montogemery Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Montogemery_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Montogemery_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Montogemery Island Wildlife Sanctuary"
CREATE
LAST	Len	"Narcondam Island"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Narcondam_Island"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Narcondam_Island"
LAST	Senwiki	"Narcondam Island"
CREATE
LAST	Len	"North Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/North_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/North_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"North Island Wildlife Sanctuary"
CREATE
LAST	Len	"North Reef Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/North_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/North_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"North Reef Island Wildlife Sanctuary"
CREATE
LAST	Len	"Oliver Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oliver_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oliver_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Oliver Island Wildlife Sanctuary"
CREATE
LAST	Len	"Orchid Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Orchid_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Orchid_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Orchid Island Wildlife Sanctuary"
CREATE
LAST	Len	"Ox Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ox_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ox_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Ox Island Wildlife Sanctuary"
CREATE
LAST	Len	"Oyster Island‑I Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oyster_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oyster_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Oyster Island‑I Wildlife Sanctuary"
CREATE
LAST	Len	"Oyster Island‑II Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oyster_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Oyster_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Oyster Island‑II Wildlife Sanctuary"
CREATE
LAST	Len	"Paget Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Paget_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Paget_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Paget Island Wildlife Sanctuary"
CREATE
LAST	Len	"Parkinson Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Parkinson_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Parkinson_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Parkinson Island Wildlife Sanctuary"
CREATE
LAST	Len	"Passage Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Passage_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Passage_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Passage Island Wildlife Sanctuary"
CREATE
LAST	Len	"Patric Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Patric_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Patric_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Patric Island Wildlife Sanctuary"
CREATE
LAST	Len	"Peacock Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Peacock_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Peacock_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Peacock Island Wildlife Sanctuary"
CREATE
LAST	Len	"Pitman Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pitman_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pitman_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Pitman Island Wildlife Sanctuary"
CREATE
LAST	Len	"Point Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Point_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Point_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Point Island Wildlife Sanctuary"
CREATE
LAST	Len	"Potanma Islands Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Potanma_Islands_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Potanma_Islands_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Potanma Islands Wildlife Sanctuary"
CREATE
LAST	Len	"Ranger Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ranger_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ranger_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Ranger Island Wildlife Sanctuary"
CREATE
LAST	Len	"Reef Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Reef Island Wildlife Sanctuary"
CREATE
LAST	Len	"Roper Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Roper_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Roper_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Roper Island Wildlife Sanctuary"
CREATE
LAST	Len	"Ross Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ross_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ross_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Ross Island Wildlife Sanctuary"
CREATE
LAST	Len	"Rowe Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Rowe_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Rowe_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Rowe Island Wildlife Sanctuary"
CREATE
LAST	Len	"Sandy Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sandy_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sandy_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sandy Island Wildlife Sanctuary"
CREATE
LAST	Len	"Sea Serpent Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sea_Serpent_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sea_Serpent_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sea Serpent Island Wildlife Sanctuary"
CREATE
LAST	Len	"Shark Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shark_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shark_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Shark Island Wildlife Sanctuary"
CREATE
LAST	Len	"Shearme Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shearme_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shearme_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Shearme Island Wildlife Sanctuary"
CREATE
LAST	Len	"Sir Hugh Rose Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sir_Hugh_Rose_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sir_Hugh_Rose_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sir Hugh Rose Island Wildlife Sanctuary"
CREATE
LAST	Len	"Sisters Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sisters_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sisters_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sisters Island Wildlife Sanctuary"
CREATE
LAST	Len	"Snake Island‑I Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Snake_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Snake_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Snake Island‑I Wildlife Sanctuary"
CREATE
LAST	Len	"Snake Island‑II Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Snake_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Snake_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Snake Island‑II Wildlife Sanctuary"
CREATE
LAST	Len	"South Reef Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/South_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/South_Reef_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"South Reef Island Wildlife Sanctuary"
CREATE
LAST	Len	"Spike Island‑I Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Spike_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Spike_Island‑I_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Spike Island‑I Wildlife Sanctuary"
CREATE
LAST	Len	"Spike Island‑II Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Spike_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Spike_Island‑II_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Spike Island‑II Wildlife Sanctuary"
CREATE
LAST	Len	"Stoat Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Stoat_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Stoat_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Stoat Island Wildlife Sanctuary"
CREATE
LAST	Len	"Surat Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Surat_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Surat_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Surat Island Wildlife Sanctuary"
CREATE
LAST	Len	"Swamp Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Swamp_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Swamp_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Swamp Island Wildlife Sanctuary"
CREATE
LAST	Len	"Table (Delgarno) Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Table_(Delgarno)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Table_(Delgarno)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Table (Delgarno) Island Wildlife Sanctuary"
CREATE
LAST	Len	"Table (Excelsior) Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Table_(Excelsior)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Table_(Excelsior)_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Table (Excelsior) Island Wildlife Sanctuary"
CREATE
LAST	Len	"Talabaicha Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Talabaicha_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Talabaicha_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Talabaicha Island Wildlife Sanctuary"
CREATE
LAST	Len	"Temple Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Temple_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Temple_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Temple Island Wildlife Sanctuary"
CREATE
LAST	Len	"Tillongchang Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tillongchang_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tillongchang_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Tillongchang Island Wildlife Sanctuary"
CREATE
LAST	Len	"Tree Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tree_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tree_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Tree Island Wildlife Sanctuary"
CREATE
LAST	Len	"Trilby Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Trilby_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Trilby_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Trilby Island Wildlife Sanctuary"
CREATE
LAST	Len	"Tuft Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tuft_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tuft_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Tuft Island Wildlife Sanctuary"
CREATE
LAST	Len	"Turtle Islands Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Turtle_Islands_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Turtle_Islands_Wildlife_Sanctuary"
LAST	Senwiki	"Turtle Islands Wildlife Sanctuary"
CREATE
LAST	Len	"West Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/West_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/West_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"West Island Wildlife Sanctuary"
CREATE
LAST	Len	"Wharf Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Wharf_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/Wharf_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Wharf Island Wildlife Sanctuary"
CREATE
LAST	Len	"White Cliff Island Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/White_Cliff_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q40888	S143	Q328	S854	"https://en.wikipedia.org/wiki/White_Cliff_Island_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"White Cliff Island Wildlife Sanctuary"
CREATE
LAST	Len	"Kanwarjheel Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kanwarjheel_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1165	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kanwarjheel_Wildlife_Sanctuary"
LAST	Senwiki	"Kanwarjheel Wildlife Sanctuary"
CREATE
LAST	Len	"Kais Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kais_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kais_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Kais Wildlife Sanctuary"
CREATE
LAST	Len	"Khokhan Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Khokhan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Khokhan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Khokhan Wildlife Sanctuary"
CREATE
LAST	Len	"Lippa Asrang Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Lippa_Asrang_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Lippa_Asrang_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Lippa Asrang Wildlife Sanctuary"
CREATE
LAST	Len	"Sainj Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sainj_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sainj_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sainj Wildlife Sanctuary"
CREATE
LAST	Len	"Shikari Devi Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shikari_Devi_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shikari_Devi_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Shikari Devi Wildlife Sanctuary"
CREATE
LAST	Len	"Shimla Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shimla_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Shimla_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Shimla Wildlife Sanctuary"
CREATE
LAST	Len	"Tundah Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tundah_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1177	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tundah_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Tundah Wildlife Sanctuary"
CREATE
LAST	Len	"Jasrota Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jasrota_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q66278313	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jasrota_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Jasrota Wildlife Sanctuary"
CREATE
LAST	Len	"Nandini Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Nandini_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q66278313	S143	Q328	S854	"https://en.wikipedia.org/wiki/Nandini_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Nandini Wildlife Sanctuary"
CREATE
LAST	Len	"Ramnagar Rakha Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ramnagar_Rakha_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q66278313	S143	Q328	S854	"https://en.wikipedia.org/wiki/Ramnagar_Rakha_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Ramnagar Rakha Wildlife Sanctuary"
CREATE
LAST	Len	"Tratte Koot"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tratte_Koot"
LAST	P17	Q668
LAST	P131	Q66278313	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tratte_Koot"
LAST	Senwiki	"Tratte Koot"
CREATE
LAST	Len	"Gautam Budha Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gautam_Budha_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1184	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gautam_Budha_Wildlife_Sanctuary"
LAST	Senwiki	"Gautam Budha Wildlife Sanctuary"
CREATE
LAST	Len	"Parasnath Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Parasnath_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1184	S143	Q328	S854	"https://en.wikipedia.org/wiki/Parasnath_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Parasnath Wildlife Sanctuary"
CREATE
LAST	Len	"Udhwa Lake Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Udhwa_Lake_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1184	S143	Q328	S854	"https://en.wikipedia.org/wiki/Udhwa_Lake_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Udhwa Lake Wildlife Sanctuary"
CREATE
LAST	Len	"Arsikere Sloth Bear Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Arsikere_Sloth_Bear_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Arsikere_Sloth_Bear_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Arsikere Sloth Bear Wildlife Sanctuary"
CREATE
LAST	Len	"Bankapura Wolf Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bankapura_Wolf_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bankapura_Wolf_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bankapura Wolf Wildlife Sanctuary"
CREATE
LAST	Len	"Bhimgad Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bhimgad_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bhimgad_Wildlife_Sanctuary"
LAST	Senwiki	"Bhimgad Wildlife Sanctuary"
CREATE
LAST	Len	"Cauvery Extension Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cauvery_Extension_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Cauvery_Extension_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Cauvery Extension Wildlife Sanctuary"
CREATE
LAST	Len	"Gudekote Extension Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gudekote_Extension_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gudekote_Extension_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Gudekote Extension Wildlife Sanctuary"
CREATE
LAST	Len	"Kamasandra Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kamasandra_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kamasandra_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Kamasandra Wildlife Sanctuary"
CREATE
LAST	Len	"Uttaregudda Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Uttaregudda_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1185	S143	Q328	S854	"https://en.wikipedia.org/wiki/Uttaregudda_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Uttaregudda Wildlife Sanctuary"
CREATE
LAST	Len	"Aralam Butterfly Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Aralam_Butterfly_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1186	S143	Q328	S854	"https://en.wikipedia.org/wiki/Aralam_Butterfly_Sanctuary"
LAST	Senwiki	"Aralam Butterfly Sanctuary"
CREATE
LAST	Len	"Changthang Cold Desert Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Changthang_Cold_Desert_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q200667	S143	Q328	S854	"https://en.wikipedia.org/wiki/Changthang_Cold_Desert_Wildlife_Sanctuary"
LAST	Senwiki	"Changthang Cold Desert Wildlife Sanctuary"
CREATE
LAST	Len	"Karakoram Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karakoram_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q200667	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karakoram_Wildlife_Sanctuary"
LAST	Senwiki	"Karakoram Wildlife Sanctuary"
CREATE
LAST	Len	"Pitti Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pitti_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q26927	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pitti_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Pitti Wildlife Sanctuary"
CREATE
LAST	Len	"Dr. Bhimrao Ambedkar Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Wildlife_Sanctuary"
LAST	Senwiki	"Dr. Bhimrao Ambedkar Wildlife Sanctuary"
CREATE
LAST	Len	"Gangau Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gangau_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gangau_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Gangau Wildlife Sanctuary"
CREATE
LAST	Len	"Karmajhiri Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karmajhiri_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karmajhiri_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Karmajhiri Wildlife Sanctuary"
CREATE
LAST	Len	"Omkareshwar Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328
CREATE
LAST	Len	"Pachmarhi Biosphere Reserve"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pachmarhi_Biosphere_Reserve"
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pachmarhi_Biosphere_Reserve"
LAST	Senwiki	"Pachmarhi Biosphere Reserve"
CREATE
LAST	Len	"Sailana Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sailana_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1188	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sailana_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sailana Wildlife Sanctuary"
CREATE
LAST	Len	"Bhamragarh Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bhamragarh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bhamragarh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bhamragarh Wildlife Sanctuary"
CREATE
LAST	Len	"Deolgaon‑Rehkuri Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Deolgaon‑Rehkuri_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Deolgaon‑Rehkuri_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Deolgaon‑Rehkuri Wildlife Sanctuary"
CREATE
LAST	Len	"Gautala Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gautala_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Gautala_Wildlife_Sanctuary"
LAST	Senwiki	"Gautala Wildlife Sanctuary"
CREATE
LAST	Len	"Isapur Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Isapur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Isapur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Isapur Wildlife Sanctuary"
CREATE
LAST	Len	"Katepurna Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Katepurna_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Katepurna_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Katepurna Wildlife Sanctuary"
CREATE
LAST	Len	"Malvan Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Malvan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Malvan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Malvan Wildlife Sanctuary"
CREATE
LAST	Len	"Mansingdeo Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mansingdeo_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Mansingdeo_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Mansingdeo Wildlife Sanctuary"
CREATE
LAST	Len	"Naigaon Mayur Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Naigaon_Mayur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Naigaon_Mayur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Naigaon Mayur Wildlife Sanctuary"
CREATE
LAST	Len	"New Bor Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/New_Bor_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/New_Bor_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"New Bor Wildlife Sanctuary"
CREATE
LAST	Len	"New Maldhok Bird (Gangewadi) Wildlife Sanctuary"
LAST	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/New_Maldhok_Bird_(Gangewadi)_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/New_Maldhok_Bird_(Gangewadi)_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"New Maldhok Bird (Gangewadi) Wildlife Sanctuary"
CREATE
LAST	Len	"Sudhagad Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sudhagad_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sudhagad_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Sudhagad Wildlife Sanctuary"
CREATE
LAST	Len	"Tamhini Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tamhini_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Tamhini_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Tamhini Wildlife Sanctuary"
CREATE
LAST	Len	"Thane Creek Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thane_Creek_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thane_Creek_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Thane Creek Wildlife Sanctuary"
CREATE
LAST	Len	"Bunning Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bunning_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1193	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bunning_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bunning Wildlife Sanctuary"
CREATE
LAST	Len	"Kailam Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kailam_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1193	S143	Q328	S854	"https://en.wikipedia.org/wiki/Kailam_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Kailam Wildlife Sanctuary"
CREATE
LAST	Len	"Khongjaingamba Ching Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Khongjaingamba_Ching_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1193	S143	Q328	S854	"https://en.wikipedia.org/wiki/Khongjaingamba_Ching_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Khongjaingamba Ching Wildlife Sanctuary"
CREATE
LAST	Len	"Thinungei Bird Sanctuary"
LAST	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thinungei_Bird_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1193	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thinungei_Bird_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Thinungei Bird Sanctuary"
CREATE
LAST	Len	"Zeilad Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Zeilad_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1193	S143	Q328	S854	"https://en.wikipedia.org/wiki/Zeilad_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Zeilad Wildlife Sanctuary"
CREATE
LAST	Len	"Siju Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Siju_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1195	S143	Q328	S854	"https://en.wikipedia.org/wiki/Siju_Wildlife_Sanctuary"
LAST	Senwiki	"Siju Wildlife Sanctuary"
CREATE
LAST	Len	"Sunabeda Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sunabeda_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q22048	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sunabeda_Wildlife_Sanctuary"
LAST	Senwiki	"Sunabeda Wildlife Sanctuary"
CREATE
LAST	Len	"Bir Bhadson Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Bhadson_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Bhadson_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bir Bhadson Wildlife Sanctuary"
CREATE
LAST	Len	"Bir Dosanjh Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Dosanjh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Dosanjh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bir Dosanjh Wildlife Sanctuary"
CREATE
LAST	Len	"Bir Gurdialpura Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Gurdialpura_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Gurdialpura_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bir Gurdialpura Wildlife Sanctuary"
CREATE
LAST	Len	"Bir Mehaswala Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Mehaswala_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Mehaswala_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bir Mehaswala Wildlife Sanctuary"
CREATE
LAST	Len	"Bir Motibagh Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Motibagh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Bir_Motibagh_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Bir Motibagh Wildlife Sanctuary"
CREATE
LAST	Len	"Harike Lake Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Harike_Lake_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Harike_Lake_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Harike Lake Wildlife Sanctuary"
CREATE
LAST	Len	"Jhajjar Bacholi Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jhajjar_Bacholi_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Jhajjar_Bacholi_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Jhajjar Bacholi Wildlife Sanctuary"
CREATE
LAST	Len	"Takhni-Rehampur Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Takhni-Rehampur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q22424	S143	Q328	S854	"https://en.wikipedia.org/wiki/Takhni-Rehampur_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Takhni-Rehampur Wildlife Sanctuary"
CREATE
LAST	Len	"National Chambal Wildlife Sanctuary"
LAST	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1437	S143	Q328	S854	"https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary"
LAST	Senwiki	"National Chambal Wildlife Sanctuary"
CREATE
LAST	Len	"Sawai Madhopur Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sawai_Madhopur_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1437	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sawai_Madhopur_Wildlife_Sanctuary"
LAST	Senwiki	"Sawai Madhopur Wildlife Sanctuary"
CREATE
LAST	Len	"Megamalai Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Megamalai_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1445	S143	Q328	S854	"https://en.wikipedia.org/wiki/Megamalai_Wildlife_Sanctuary"
LAST	Senwiki	"Megamalai Wildlife Sanctuary"
CREATE
LAST	Len	"Pulicat Lake Bird Sanctuary"
LAST	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pulicat_Lake_Bird_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1445	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pulicat_Lake_Bird_Sanctuary"
LAST	Senwiki	"Pulicat Lake Bird Sanctuary"
CREATE
LAST	Len	"Thanthai Periyar Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thanthai_Periyar_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1445	S143	Q328	S854	"https://en.wikipedia.org/wiki/Thanthai_Periyar_Wildlife_Sanctuary"
LAST	Senwiki	"Thanthai Periyar Wildlife Sanctuary"
CREATE
LAST	Len	"Eturnagaram Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Eturnagaram_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q677037	S143	Q328	S854	"https://en.wikipedia.org/wiki/Eturnagaram_Wildlife_Sanctuary"
LAST	Senwiki	"Eturnagaram Wildlife Sanctuary"
CREATE
LAST	Len	"Manjira Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Manjira_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q677037	S143	Q328	S854	"https://en.wikipedia.org/wiki/Manjira_Wildlife_Sanctuary"
LAST	Senwiki	"Manjira Wildlife Sanctuary"
CREATE
LAST	Len	"Dr. Bhimrao Ambedkar Bird Sanctuary"
LAST	P31	Q2714144	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Bird_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1498	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dr._Bhimrao_Ambedkar_Bird_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Dr. Bhimrao Ambedkar Bird Sanctuary"
CREATE
LAST	Len	"National Chambal Wildlife Sanctuary"
LAST	P31	Q46169	S143	Q328	S854	"https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1498	S143	Q328	S854	"https://en.wikipedia.org/wiki/National_Chambal_Wildlife_Sanctuary"
LAST	Senwiki	"National Chambal Wildlife Sanctuary"
CREATE
LAST	Len	"Sur Sarovar Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sur_Sarovar_Sanctuary"
LAST	P17	Q668
LAST	P131	Q1498	S143	Q328	S854	"https://en.wikipedia.org/wiki/Sur_Sarovar_Sanctuary"
LAST	Senwiki	"Sur Sarovar Sanctuary"
CREATE
LAST	Len	"Pakhibitan Wildlife Sanctuary"
LAST	P31	Q1377575	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pakhibitan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1356	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pakhibitan_Wildlife_Sanctuary?action=edit&redlink=1"
LAST	Senwiki	"Pakhibitan Wildlife Sanctuary"
CREATE
LAST	Len	"Pench Tiger Reserve"
LAST	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pench_Tiger_Reserve"
LAST	P17	Q668
LAST	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pench_Tiger_Reserve"
LAST	Senwiki	"Pench Tiger Reserve"
CREATE
LAST	Len	"Dholpur—Karauli Tiger Reserve"
LAST	P31	Q5533772	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dholpur—Karauli_Tiger_Reserve?action=edit&redlink=1"
LAST	P17	Q668
LAST	P131	Q1437	S143	Q328	S854	"https://en.wikipedia.org/wiki/Dholpur—Karauli_Tiger_Reserve?action=edit&redlink=1"
LAST	Senwiki	"Dholpur—Karauli Tiger Reserve"
```

</details>

### Wikidata items with no Wikipedia match

Wikidata item is typed as National Park / Wildlife Sanctuary / Tiger Reserve (categories the three Wikipedia lists cover) but no Wikipedia entry matched it -- possible naming mismatch, or genuinely absent from Wikipedia. `wikipediaNameMatchState`/`wikipediaNameMatchUrl`, when filled in, point at a Wikipedia entry with the exact same name under a different state (see the QuickStatements note below).

| wikidataId | wikidataLabel | protectedAreaType | state | wikipediaNameMatchState | wikipediaNameMatchUrl |
| --- | --- | --- | --- | --- | --- |
| Q106684744 | Biligiri Rangaswamy Temple Wildlife Sanctuary | Wildlife Sanctuary | Karnataka |  |  |
| Q109974038 | Siju Wildlife Sanctuary | Wildlife Sanctuary | Manipur | Meghalaya | https://en.wikipedia.org/wiki/Siju_Wildlife_Sanctuary |
| Q113133799 | Garbhanga Wildlife Sanctuary | Wildlife Sanctuary | Assam |  |  |
| Q2724481 | Marine National Park, Gulf of Kutch | National Park | Gujarat |  |  |
| Q3174886 | Govind Pashu Vihar Wildlife Sanctuary | Wildlife Sanctuary | Uttar Pradesh | Uttarakhand | https://en.wikipedia.org/wiki/Govind_Pashu_Vihar_National_Park |
| Q3364416 | Mandla Plant Fossils National Park | National Park | Madhya Pradesh |  |  |
| Q3364473 | Pench Tiger Reserve | Tiger Reserve | Madhya Pradesh | Maharashtra | https://en.wikipedia.org/wiki/Pench_Tiger_Reserve |
| Q4208325 | Qazinag National Park | National Park | Jammu and Kashmir |  |  |
| Q4783879 | Aralam Wildlife Sanctuary | Wildlife Sanctuary | Kerala |  |  |
| Q5215676 | Dandeli Wildlife Sanctuary | Wildlife Sanctuary | Karnataka |  |  |
| Q5311756 | Dudhwa Tiger Reserve | Tiger Reserve | Uttar Pradesh |  |  |
| Q5405090 | Eturnagaram Wildlife Sanctuary | Wildlife Sanctuary | Andhra Pradesh | Telangana | https://en.wikipedia.org/wiki/Eturnagaram_Wildlife_Sanctuary |
| Q5517624 | Gajner Wildlife Sanctuary | Wildlife Sanctuary | Rajasthan |  |  |
| Q5527862 | Gautala Autramghat Sanctuary | Wildlife Sanctuary | Maharashtra |  |  |
| Q5597433 | Grass Hills National Park | National Park | Tamil Nadu |  |  |
| Q6368141 | Karakoram Wildlife Sanctuary | Wildlife Sanctuary | Jammu and Kashmir | Ladakh | https://en.wikipedia.org/wiki/Karakoram_Wildlife_Sanctuary |
| Q6750402 | Manjira Wildlife Sanctuary | Wildlife Sanctuary | Andhra Pradesh | Telangana | https://en.wikipedia.org/wiki/Manjira_Wildlife_Sanctuary |
| Q6965807 | Narendrapur Wildlife Sanctuary | Wildlife Sanctuary | West Bengal |  |  |
| Q7786672 | Thol Wildlife Sanctuary | Wildlife Sanctuary | Gujarat |  |  |
| Q13116281 | Karian Shola National Park | National Park | Tamil Nadu |  |  |
| Q14205920 | Begur Wildlife Sanctuary | Wildlife Sanctuary | Kerala |  |  |
| Q880724 | Blackbuck National Park | National Park | Gujarat |  |  |
| Q2979712 | Balpakram National Park | National Park | Meghalaya |  |  |
| Q15839097 | Nanda Devi and Valley of Flowers National Parks | National Park | Uttarakhand |  |  |
| Q16253187 | Bankapur Peacock Sanctuary | Wildlife Sanctuary | Karnataka |  |  |
| Q17002953 | Saraswati Wildlife Sanctuary | Wildlife Sanctuary | Haryana |  |  |
| Q17010836 | Achabal Wildlife Sanctuary | Wildlife Sanctuary | Jammu and Kashmir |  |  |
| Q18110132 | Balimela Wildlife Sanctuary | Wildlife Sanctuary | Odisha |  |  |
| Q18126911 | Kondakameru Wildlife Sanctuary | Wildlife Sanctuary | Odisha |  |  |
| Q19881905 | Amangarh Tiger Reserve | Tiger Reserve | Uttar Pradesh |  |  |
| Q65321737 | Karimpuzha Wildlife Sanctuary | Wildlife Sanctuary | Kerala |  |  |
| Q105581798 | Benog Wildlife Sanctuary | Wildlife Sanctuary | Uttarakhand |  |  |
| Q105806882 | Kottur Elephant Sanctuary and Rehabilitation Centre | Wildlife Sanctuary | Kerala |  |  |
| Q106416493 | Ramanagara Ramdevara Betta Vulture Sanctuary | Wildlife Sanctuary | Karnataka |  |  |
| Q106618225 | Ralamandal Sanctuary | Wildlife Sanctuary | Madhya Pradesh |  |  |
| Q106619912 | Gandhisagar Sanctuary | Wildlife Sanctuary | Madhya Pradesh |  |  |
| Q106674048 | Nawegaon Wildlife Sanctuary | Wildlife Sanctuary | Maharashtra |  |  |
| Q106674990 | Bhitarkanika Wildlife Sanctuary | Wildlife Sanctuary | Odisha |  |  |
| Q106675711 | Udanti-Sitanadi Tiger Reserve | Tiger Reserve | Chhattisgarh |  |  |
| Q107324541 | Mehao Wildlife Sanctuary | Wildlife Sanctuary | Arunachal Pradesh |  |  |
| Q26794303 | Changthang Wildlife Sanctuary | Wildlife Sanctuary | Ladakh |  |  |
| Q26794312 | Shendurney Wildlife Reserve | Wildlife Sanctuary | Kerala |  |  |
| Q28173945 | Khonoma Nature Conservation and Tragopan Sanctuary | Wildlife Sanctuary | Nagaland |  |  |
| Q55615923 | Kheoni Wildlife Sanctuary | Wildlife Sanctuary | Madhya Pradesh |  |  |
| Q55633284 | Sitabani Wildlife Reserve | Wildlife Sanctuary | Uttarakhand |  |  |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

Where `wikipediaNameMatchState` is filled in, a Wikipedia entry with the *exact same name* exists under a different state -- often because Wikidata's P131 chain is stale (e.g. it still resolves to a pre-2000 undivided state) rather than because these are genuinely two different, coincidentally-named places. This repo's own matcher treats a disagreeing state as a hard veto for exactly that reason (see `scripts/lib/wikidata-match.js`), so confirm the same district/coordinates before applying anything below.

Adds a direct P131 to the state the mismatch points at, rather than removing the existing chain -- if the wrong value is inherited from an intermediate district/tehsil-level P131 rather than set directly on the item, that link needs separate correction by hand.

Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:

```
Q109974038	P131	Q1195	S143	Q328	S854	"https://en.wikipedia.org/wiki/Siju_Wildlife_Sanctuary"
Q3174886	P131	Q1499	S143	Q328	S854	"https://en.wikipedia.org/wiki/Govind_Pashu_Vihar_National_Park"
Q3364473	P131	Q1191	S143	Q328	S854	"https://en.wikipedia.org/wiki/Pench_Tiger_Reserve"
Q5405090	P131	Q677037	S143	Q328	S854	"https://en.wikipedia.org/wiki/Eturnagaram_Wildlife_Sanctuary"
Q6368141	P131	Q200667	S143	Q328	S854	"https://en.wikipedia.org/wiki/Karakoram_Wildlife_Sanctuary"
Q6750402	P131	Q677037	S143	Q328	S854	"https://en.wikipedia.org/wiki/Manjira_Wildlife_Sanctuary"
```

</details>

## Wikidata ↔ OSM joins

Cross-referenced against `data/osm/protected-areas.csv` (503 issues flagged).

### Summary

- **Wikidata items with no OSM match**: 302
- **OSM wikidata tag outdated**: 39
- **Wikidata P402 (OSM relation) outdated**: 2
- **Wikidata coordinate outside OSM polygon**: 139
- **Low name-match confidence**: 20
- **Ambiguous OSM wikidata-tag matches**: 1
- **OSM objects without a wikidata tag**: 210

### Wikidata items with no OSM match

No OSM object references this wikidata id via P402, and no OSM object tags this id back -- likely missing from OSM entirely, or mapped without a wikidata tag.

| wikidataId | wikidataLabel |
| --- | --- |
| Q5215675 | Anshi National Park |
| Q6375178 | Katarniaghat Wildlife Sanctuary |
| Q16137059 | Munderikadavu Bird Sanctuary |
| Q16895017 | Mehao Wildlife Sanctuary |
| Q17126760 | Daroji Sloth Bear Sanctuary |
| Q60398704 | Marine Sanctuary (Gulf of Kutch) |
| Q102047437 | Gulmarg Wildlife Sanctuary |
| Q106675739 | Udanti Wildlife Sanctuary |
| Q106684744 | Biligiri Rangaswamy Temple Wildlife Sanctuary |
| Q109974038 | Siju Wildlife Sanctuary |
| Q110460281 | Yangoupokpi-Lokchao Wildlife Sanctuary |
| Q112136896 | Kadalundi–Vallikkunnu Community Reserve |
| Q113133799 | Garbhanga Wildlife Sanctuary |
| Q3595683 | Hazaribagh Wildlife Sanctuary |
| Q3471776 | Hoollongapar Gibbon Sanctuary |
| Q2720864 | Pench National Park |
| Q7050184 | Noradehi Wildlife Sanctuary |
| Q7206203 | Pobitora Wildlife Sanctuary |
| Q7285897 | Rajbari National Park |
| Q253455 | Dudhwa National Park |
| Q1785732 | Koyna Wildlife Sanctuary |
| Q1815612 | Namdapha National Park |
| Q2340037 | Buxa Tiger Reserve |
| Q2667857 | Salim Ali National Park |
| Q3895706 | Nagarjunsagar-Srisailam Tiger Reserve |
| Q3364416 | Mandla Plant Fossils National Park |
| Q3364473 | Pench Tiger Reserve |
| Q3364527 | Mahatma Gandhi Marine National Park |
| Q3457187 | Dampa Tiger Reserve |
| Q3523324 | Karimpuzha National Park |
| Q3696259 | Chandoli National Park |
| Q4208325 | Qazinag National Park |
| Q4682873 | Adina Deer Park |
| Q4691449 | Agasthyavanam Biological Park |
| Q4941109 | Bonal Bird Sanctuary |
| Q5118284 | Churdhar Sanctuary |
| Q5135742 | Clouded Leopard National Park |
| Q5215676 | Dandeli Wildlife Sanctuary |
| Q5311756 | Dudhwa Tiger Reserve |
| Q5517624 | Gajner Wildlife Sanctuary |
| Q5597433 | Grass Hills National Park |
| Q6368141 | Karakoram Wildlife Sanctuary |
| Q6443537 | Kumarakom Bird Sanctuary |
| Q6729590 | Magadi Bird Sanctuary |
| Q6748692 | Mangalavanam Bird Sanctuary |
| Q6796837 | Mayani Bird Sanctuary |
| Q6963221 | Nandhaur Wildlife Sanctuary |
| Q6965807 | Narendrapur Wildlife Sanctuary |
| Q7461463 | Shahayadri Tiger reserve |
| Q7697281 | Telineelapuram and Telukunchi Bird Sanctuaries |
| Q7786672 | Thol Wildlife Sanctuary |
| Q7809473 | Tiruvidaimarudur Conservation Reserve |
| Q13116281 | Karian Shola National Park |
| Q14205920 | Begur Wildlife Sanctuary |
| Q14618939 | Nambor Wildlife Sanctuary |
| Q14623369 | Bherjan-Borajan-Padumoni Wildlife Sanctuary |
| Q2429161 | Melghat Tiger Reserve |
| Q134457402 | Lachipora Wildlife Sanctuary |
| Q140306443 | Arial Island Wildlife Sanctuary |
| Q7786671 | Thol Lake |
| Q7461605 | Shahgarh Landscape |
| Q2979712 | Balpakram National Park |
| Q15839097 | Nanda Devi and Valley of Flowers National Parks |
| Q16155392 | Bhindawas Wildlife Sanctuary |
| Q16253187 | Bankapur Peacock Sanctuary |
| Q16887542 | Netravali Wildlife Sanctuary |
| Q16894577 | Mandagadde Bird Sanctuary |
| Q16896392 | Pangolakha Wildlife Sanctuary |
| Q16948098 | Kanwar Sanctuary |
| Q17002774 | Abubshahar Wildlife Sanctuary |
| Q17002953 | Saraswati Wildlife Sanctuary |
| Q17010836 | Achabal Wildlife Sanctuary |
| Q17052151 | Dumna Nature Reserve Park |
| Q17564493 | Bordoibam Bilmukh Bird Sanctuary |
| Q18110132 | Balimela Wildlife Sanctuary |
| Q18126911 | Kondakameru Wildlife Sanctuary |
| Q18357307 | Uppalapadu Bird Sanctuary |
| Q19881905 | Amangarh Tiger Reserve |
| Q19894392 | Naina Devi Himalayan Bird Conservation Reserve |
| Q22948452 | Ervadi Dargah Sharif |
| Q97353441 | Kulathupuzha Range Reserved Forest |
| Q97356733 | Palode Range Reserved Forest |
| Q97359098 | Kalikavu Range Reserved Forest |
| Q97361413 | Mankulam Range Forest |
| Q97379507 | Tirunelveli (North) Forest (part) |
| Q99342657 | Chaprala Wildlife Sanctuary |
| Q101311408 | Agra Bear Rescue Facility |
| Q104879966 | Barnawapara Wildlife sanctuary |
| Q105581798 | Benog Wildlife Sanctuary |
| Q105806882 | Kottur Elephant Sanctuary and Rehabilitation Centre |
| Q105944439 | Khijadia Bird Sanctuary |
| Q106240301 | Nandankanan Wildlife Sanctuary |
| Q106258797 | Rabdentse Bird Sanctuary |
| Q106416493 | Ramanagara Ramdevara Betta Vulture Sanctuary |
| Q106513464 | Ghosu Bird Sanctuary |
| Q106618190 | Kheoni Wildlife Sanctuary |
| Q106618225 | Ralamandal Sanctuary |
| Q106619912 | Gandhisagar Sanctuary |
| Q106673573 | Tipeshwar Wildlife Sanctuary |
| Q106674048 | Nawegaon Wildlife Sanctuary |
| Q106674990 | Bhitarkanika Wildlife Sanctuary |
| Q106675711 | Udanti-Sitanadi Tiger Reserve |
| Q107112206 | Raimona National Park |
| Q107224583 | Lonar Wildlife Sanctuary |
| Q111169695 | Tirthan Wildlife Sanctuary |
| Q111181702 | Singphan Wildlife Sanctuary |
| Q111181960 | Talra Wildlife Sanctuary |
| Q116739635 | Cauvery south Wildlife Sanctuary |
| Q117057454 | Shalboni Forest Range |
| Q122363300 | Kadavur Wildlife Sanctuary |
| Q123532242 | Tral Wildlife Sanctuary |
| Q124249813 | Tanba Forest |
| Q124393199 | Anandanagar Forest |
| Q127499823 | Amrabad Tiger Reserve |
| Q130974183 | Yordi Rabe Supse Wildlife Sanctuary |
| Q130974358 | Bhairamgarh Wildlife Sanctuary |
| Q131007942 | Kamala Wildlife Sanctuary |
| Q131007944 | Ringba-Roba Wildlife Sanctuary |
| Q134484578 | Satajaan Bird Sanctuary |
| Q134610692 | Sawai Man Singh Wildlife Sanctuary |
| Q15203562 | Bornadi Wildlife Sanctuary |
| Q15234037 | Kas Plateau Reserved Forest |
| Q26794312 | Shendurney Wildlife Reserve |
| Q28173945 | Khonoma Nature Conservation and Tragopan Sanctuary |
| Q38251694 | Sumin Reserve Forest |
| Q39057492 | Nilambur Elephant Reserve |
| Q55074851 | Ghodazari Wildlife Sanctuary |
| Q55633284 | Sitabani Wildlife Reserve |
| Q134984377 | Sikhna Jwhwlao National Park |
| Q135350399 | Bhoramdev Wildlife Sanctuary |
| Q135419116 | Kappatagudda Wildlife Sanctuary |
| Q135650177 | Rajauli Wildlife Sanctuary |
| Q135838331 | Chandratal Wildlife Sanctuary |
| Q137368881 | Selbagre Hoolock Gibbon Reserve |
| Q137596744 | Kanhargaon Wildlife Sanctuary |
| Q137596748 | Wan Wildlife Sanctuary |
| Q137801052 | Pranhita Wildlife Sanctuary |
| Q37564 | Kadalundi Bird Sanctuary |
| WIKIPEDIA:gujarat:blackbuck-national-park-velavadar | Blackbuck National Park, Velavadar |
| WIKIPEDIA:maharashtra:pench-national-park-jawaharlal-nehru | Pench National Park(Jawaharlal Nehru) |
| WIKIPEDIA:meghalaya:ak-national-park | AK National Park |
| WIKIPEDIA:andaman-and-nicobar-islands:barren-island-andaman-islands | Barren Island (Andaman Islands) |
| WIKIPEDIA:andaman-and-nicobar-islands:battimalv-island-wildlife-sanctuary | Battimalv Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:belle-island-wildlife-sanctuary | Belle Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:benett-island-wildlife-sanctuary | Benett Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:bingham-island-wildlife-sanctuary | Bingham Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:blister-island-wildlife-sanctuary | Blister Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:bluff-island-wildlife-sanctuary | Bluff Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:bondoville-island-wildlife-sanctuary | Bondoville Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:brush-island-wildlife-sanctuary | Brush Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:buchanan-island-wildlife-sanctuary | Buchanan Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:chanel-island-wildlife-sanctuary | Chanel Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:cinque-islands-wildlife-sanctuary | Cinque Islands Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:clyde-island-wildlife-sanctuary | Clyde Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:cone-island-wildlife-sanctuary | Cone Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:curlew-b-p-island-wildlife-sanctuary | Curlew (B.P.) Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:curlew-island-wildlife-sanctuary | Curlew Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:defence-island-wildlife-sanctuary | Defence Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:dot-island-wildlife-sanctuary | Dot Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:dottrell-island-wildlife-sanctuary | Dottrell Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:duncan-island-wildlife-sanctuary | Duncan Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:east-island-wildlife-sanctuary | East Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:east-of-inglis-island-wildlife-sanctuary | East of Inglis Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:egg-island-wildlife-sanctuary | Egg Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:entrance-island-wildlife-sanctuary | Entrance Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:flat-island-wildlife-sanctuary | Flat Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:gander-island-wildlife-sanctuary | Gander Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:girjan-island-wildlife-sanctuary | Girjan Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:goose-island-wildlife-sanctuary | Goose Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:hump-island-wildlife-sanctuary | Hump Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:interview-island | Interview Island |
| WIKIPEDIA:andaman-and-nicobar-islands:james-island-wildlife-sanctuary | James Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:jungle-island-wildlife-sanctuary | Jungle Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:kyd-island-wildlife-sanctuary | Kyd Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:landfall-island-wildlife-sanctuary | Landfall Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:latouche-island-wildlife-sanctuary | Latouche Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:lohabarrack-wildlife-sanctuary | Lohabarrack Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:mangrove-island-wildlife-sanctuary | Mangrove Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:mask-island-wildlife-sanctuary | Mask Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:mayo-island-wildlife-sanctuary | Mayo Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:megapode-island-wildlife-sanctuary | Megapode Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:montogemery-island-wildlife-sanctuary | Montogemery Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:narcondam-island | Narcondam Island |
| WIKIPEDIA:andaman-and-nicobar-islands:north-island-wildlife-sanctuary | North Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:north-reef-island-wildlife-sanctuary | North Reef Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:oliver-island-wildlife-sanctuary | Oliver Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:orchid-island-wildlife-sanctuary | Orchid Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:ox-island-wildlife-sanctuary | Ox Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:oyster-island-i-wildlife-sanctuary | Oyster Island‑I Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:oyster-island-ii-wildlife-sanctuary | Oyster Island‑II Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:paget-island-wildlife-sanctuary | Paget Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:parkinson-island-wildlife-sanctuary | Parkinson Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:passage-island-wildlife-sanctuary | Passage Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:patric-island-wildlife-sanctuary | Patric Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:peacock-island-wildlife-sanctuary | Peacock Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:pitman-island-wildlife-sanctuary | Pitman Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:point-island-wildlife-sanctuary | Point Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:potanma-islands-wildlife-sanctuary | Potanma Islands Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:ranger-island-wildlife-sanctuary | Ranger Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:reef-island-wildlife-sanctuary | Reef Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:roper-island-wildlife-sanctuary | Roper Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:ross-island-wildlife-sanctuary | Ross Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:rowe-island-wildlife-sanctuary | Rowe Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:sandy-island-wildlife-sanctuary | Sandy Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:sea-serpent-island-wildlife-sanctuary | Sea Serpent Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:shark-island-wildlife-sanctuary | Shark Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:shearme-island-wildlife-sanctuary | Shearme Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:sir-hugh-rose-island-wildlife-sanctuary | Sir Hugh Rose Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:sisters-island-wildlife-sanctuary | Sisters Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:snake-island-i-wildlife-sanctuary | Snake Island‑I Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:snake-island-ii-wildlife-sanctuary | Snake Island‑II Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:south-reef-island-wildlife-sanctuary | South Reef Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:spike-island-i-wildlife-sanctuary | Spike Island‑I Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:spike-island-ii-wildlife-sanctuary | Spike Island‑II Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:stoat-island-wildlife-sanctuary | Stoat Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:surat-island-wildlife-sanctuary | Surat Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:swamp-island-wildlife-sanctuary | Swamp Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:table-delgarno-island-wildlife-sanctuary | Table (Delgarno) Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:table-excelsior-island-wildlife-sanctuary | Table (Excelsior) Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:talabaicha-island-wildlife-sanctuary | Talabaicha Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:temple-island-wildlife-sanctuary | Temple Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:tillongchang-island-wildlife-sanctuary | Tillongchang Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:tree-island-wildlife-sanctuary | Tree Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:trilby-island-wildlife-sanctuary | Trilby Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:tuft-island-wildlife-sanctuary | Tuft Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:turtle-islands-wildlife-sanctuary | Turtle Islands Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:west-island-wildlife-sanctuary | West Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:wharf-island-wildlife-sanctuary | Wharf Island Wildlife Sanctuary |
| WIKIPEDIA:andaman-and-nicobar-islands:white-cliff-island-wildlife-sanctuary | White Cliff Island Wildlife Sanctuary |
| WIKIPEDIA:bihar:kanwarjheel-wildlife-sanctuary | Kanwarjheel Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:kais-wildlife-sanctuary | Kais Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:khokhan-wildlife-sanctuary | Khokhan Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:lippa-asrang-wildlife-sanctuary | Lippa Asrang Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:sainj-wildlife-sanctuary | Sainj Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:shikari-devi-wildlife-sanctuary | Shikari Devi Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:shimla-wildlife-sanctuary | Shimla Wildlife Sanctuary |
| WIKIPEDIA:himachal-pradesh:tundah-wildlife-sanctuary | Tundah Wildlife Sanctuary |
| WIKIPEDIA:jammu-and-kashmir:jasrota-wildlife-sanctuary | Jasrota Wildlife Sanctuary |
| WIKIPEDIA:jammu-and-kashmir:nandini-wildlife-sanctuary | Nandini Wildlife Sanctuary |
| WIKIPEDIA:jammu-and-kashmir:ramnagar-rakha-wildlife-sanctuary | Ramnagar Rakha Wildlife Sanctuary |
| WIKIPEDIA:jammu-and-kashmir:tratte-koot | Tratte Koot |
| WIKIPEDIA:jharkhand:gautam-budha-wildlife-sanctuary | Gautam Budha Wildlife Sanctuary |
| WIKIPEDIA:jharkhand:parasnath-wildlife-sanctuary | Parasnath Wildlife Sanctuary |
| WIKIPEDIA:jharkhand:udhwa-lake-wildlife-sanctuary | Udhwa Lake Wildlife Sanctuary |
| WIKIPEDIA:karnataka:arsikere-sloth-bear-wildlife-sanctuary | Arsikere Sloth Bear Wildlife Sanctuary |
| WIKIPEDIA:karnataka:bankapura-wolf-wildlife-sanctuary | Bankapura Wolf Wildlife Sanctuary |
| WIKIPEDIA:karnataka:bhimgad-wildlife-sanctuary | Bhimgad Wildlife Sanctuary |
| WIKIPEDIA:karnataka:cauvery-extension-wildlife-sanctuary | Cauvery Extension Wildlife Sanctuary |
| WIKIPEDIA:karnataka:gudekote-extension-wildlife-sanctuary | Gudekote Extension Wildlife Sanctuary |
| WIKIPEDIA:karnataka:kamasandra-wildlife-sanctuary | Kamasandra Wildlife Sanctuary |
| WIKIPEDIA:karnataka:uttaregudda-wildlife-sanctuary | Uttaregudda Wildlife Sanctuary |
| WIKIPEDIA:kerala:aralam-butterfly-sanctuary | Aralam Butterfly Sanctuary |
| WIKIPEDIA:ladakh:changthang-cold-desert-wildlife-sanctuary | Changthang Cold Desert Wildlife Sanctuary |
| WIKIPEDIA:ladakh:karakoram-wildlife-sanctuary | Karakoram Wildlife Sanctuary |
| WIKIPEDIA:lakshadweep:pitti-wildlife-sanctuary | Pitti Wildlife Sanctuary |
| WIKIPEDIA:madhya-pradesh:dr-bhimrao-ambedkar-wildlife-sanctuary | Dr. Bhimrao Ambedkar Wildlife Sanctuary |
| WIKIPEDIA:madhya-pradesh:gangau-wildlife-sanctuary | Gangau Wildlife Sanctuary |
| WIKIPEDIA:madhya-pradesh:karmajhiri-wildlife-sanctuary | Karmajhiri Wildlife Sanctuary |
| WIKIPEDIA:madhya-pradesh:omkareshwar-wildlife-sanctuary | Omkareshwar Wildlife Sanctuary |
| WIKIPEDIA:madhya-pradesh:pachmarhi-biosphere-reserve | Pachmarhi Biosphere Reserve |
| WIKIPEDIA:madhya-pradesh:sailana-wildlife-sanctuary | Sailana Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:bhamragarh-wildlife-sanctuary | Bhamragarh Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:deolgaon-rehkuri-wildlife-sanctuary | Deolgaon‑Rehkuri Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:gautala-wildlife-sanctuary | Gautala Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:isapur-wildlife-sanctuary | Isapur Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:katepurna-wildlife-sanctuary | Katepurna Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:malvan-wildlife-sanctuary | Malvan Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:mansingdeo-wildlife-sanctuary | Mansingdeo Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:naigaon-mayur-wildlife-sanctuary | Naigaon Mayur Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:new-bor-wildlife-sanctuary | New Bor Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:new-maldhok-bird-gangewadi-wildlife-sanctuary | New Maldhok Bird (Gangewadi) Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:sudhagad-wildlife-sanctuary | Sudhagad Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:tamhini-wildlife-sanctuary | Tamhini Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:thane-creek-wildlife-sanctuary | Thane Creek Wildlife Sanctuary |
| WIKIPEDIA:manipur:bunning-wildlife-sanctuary | Bunning Wildlife Sanctuary |
| WIKIPEDIA:manipur:kailam-wildlife-sanctuary | Kailam Wildlife Sanctuary |
| WIKIPEDIA:manipur:khongjaingamba-ching-wildlife-sanctuary | Khongjaingamba Ching Wildlife Sanctuary |
| WIKIPEDIA:manipur:thinungei-bird-sanctuary | Thinungei Bird Sanctuary |
| WIKIPEDIA:manipur:zeilad-wildlife-sanctuary | Zeilad Wildlife Sanctuary |
| WIKIPEDIA:meghalaya:siju-wildlife-sanctuary | Siju Wildlife Sanctuary |
| WIKIPEDIA:odisha:sunabeda-wildlife-sanctuary | Sunabeda Wildlife Sanctuary |
| WIKIPEDIA:punjab:bir-bhadson-wildlife-sanctuary | Bir Bhadson Wildlife Sanctuary |
| WIKIPEDIA:punjab:bir-dosanjh-wildlife-sanctuary | Bir Dosanjh Wildlife Sanctuary |
| WIKIPEDIA:punjab:bir-gurdialpura-wildlife-sanctuary | Bir Gurdialpura Wildlife Sanctuary |
| WIKIPEDIA:punjab:bir-mehaswala-wildlife-sanctuary | Bir Mehaswala Wildlife Sanctuary |
| WIKIPEDIA:punjab:bir-motibagh-wildlife-sanctuary | Bir Motibagh Wildlife Sanctuary |
| WIKIPEDIA:punjab:harike-lake-wildlife-sanctuary | Harike Lake Wildlife Sanctuary |
| WIKIPEDIA:punjab:jhajjar-bacholi-wildlife-sanctuary | Jhajjar Bacholi Wildlife Sanctuary |
| WIKIPEDIA:punjab:takhni-rehampur-wildlife-sanctuary | Takhni-Rehampur Wildlife Sanctuary |
| WIKIPEDIA:rajasthan:national-chambal-wildlife-sanctuary | National Chambal Wildlife Sanctuary |
| WIKIPEDIA:rajasthan:sawai-madhopur-wildlife-sanctuary | Sawai Madhopur Wildlife Sanctuary |
| WIKIPEDIA:tamil-nadu:megamalai-wildlife-sanctuary | Megamalai Wildlife Sanctuary |
| WIKIPEDIA:tamil-nadu:pulicat-lake-bird-sanctuary | Pulicat Lake Bird Sanctuary |
| WIKIPEDIA:tamil-nadu:thanthai-periyar-wildlife-sanctuary | Thanthai Periyar Wildlife Sanctuary |
| WIKIPEDIA:telangana:eturnagaram-wildlife-sanctuary | Eturnagaram Wildlife Sanctuary |
| WIKIPEDIA:telangana:manjira-wildlife-sanctuary | Manjira Wildlife Sanctuary |
| WIKIPEDIA:uttar-pradesh:dr-bhimrao-ambedkar-bird-sanctuary | Dr. Bhimrao Ambedkar Bird Sanctuary |
| WIKIPEDIA:uttar-pradesh:national-chambal-wildlife-sanctuary | National Chambal Wildlife Sanctuary |
| WIKIPEDIA:uttar-pradesh:sur-sarovar-sanctuary | Sur Sarovar Sanctuary |
| WIKIPEDIA:west-bengal:pakhibitan-wildlife-sanctuary | Pakhibitan Wildlife Sanctuary |
| WIKIPEDIA:maharashtra:pench-tiger-reserve | Pench Tiger Reserve |
| WIKIPEDIA:rajasthan:dholpur-karauli-tiger-reserve | Dholpur—Karauli Tiger Reserve |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No Wikidata edit applies -- this is a gap on the OSM side (the boundary either isn't mapped at all, or is mapped without a `wikidata` tag). Map it or add the tag on OpenStreetMap; nothing to fix on Wikidata itself.

</details>

### OSM wikidata tag outdated

OSM `wikidata` tag value is a redirect, deleted, or not found in our fetched Indian protected-area list.

| wikidata | osmType | osmId | osmUrl | name | detail |
| --- | --- | --- | --- | --- | --- |
| Q48724702 | relation | 17946400 | https://www.openstreetmap.org/relation/17946400 | Hokersar WLS | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q2641970 | relation | 17007574 | https://www.openstreetmap.org/relation/17007574 | دیوسائی نیشنل پارک | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q6652784 | relation | 12338888 | https://www.openstreetmap.org/relation/12338888 | อุทยานแห่งชาติน้ำตกแม่สุรินทร์ | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q12674971 | relation | 5944551 | https://www.openstreetmap.org/relation/5944551 | อุทยานแห่งชาติถ้ำปลา-น้ำตกผาเสื่อ | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q5247288 | relation | 5944550 | https://www.openstreetmap.org/relation/5944550 | อุทยานแห่งชาติสาละวิน | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q16345294 | way | 1012210637 | https://www.openstreetmap.org/way/1012210637 | খাদিমনগর জাতীয় উদ্যান | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q4351857 | relation | 4815272 | https://www.openstreetmap.org/relation/4815272 | पर्सा राष्ट्रिय निकुञ्‍ज | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q6433109 | relation | 7569314 | https://www.openstreetmap.org/relation/7569314 | कोशी टप्पु वन्यजन्तु आरक्ष | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1075023 | relation | 6083166 | https://www.openstreetmap.org/relation/6083166 | चितवन राष्ट्रिय निकुञ्‍ज | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q5687761 | way | 155440967 | https://www.openstreetmap.org/way/155440967 | Hazaribag WLS | Redirects to Q3595683, which IS in our Indian protected-area list -- update the OSM wikidata tag to Q3595683. |
| Q5269784 | way | 323146126 | https://www.openstreetmap.org/way/323146126 | ढोरपाटन शिकार आरक्ष | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q4351267 | relation | 1268964 | https://www.openstreetmap.org/relation/1268964 | लाङ्टाङ् राष्ट्रिय निकुञ्‍ज | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q108527080 | way | 667877344 | https://www.openstreetmap.org/way/667877344 | Himalayan Nature Park Kufri | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q17078316 | way | 669495393 | https://www.openstreetmap.org/way/669495393 | Noradehi WLS | Redirects to Q7050184, which IS in our Indian protected-area list -- update the OSM wikidata tag to Q7050184. |
| Q13119963 | way | 678002187 | https://www.openstreetmap.org/way/678002187 | Malvan Marine Sanctuary | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q6958578 | way | 683363598 | https://www.openstreetmap.org/way/683363598 | Nagarjuna Sagar-Srisailam Tiger Reserve | Redirects to Q3895706, which IS in our Indian protected-area list -- update the OSM wikidata tag to Q3895706. |
| Q7638744 | way | 669785084 | https://www.openstreetmap.org/way/669785084 | Sunabeda WLS | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q2275145 | way | 90617098 | https://www.openstreetmap.org/way/90617098 | Nandankanan Zoological Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q42725548 | relation | 13256795 | https://www.openstreetmap.org/relation/13256795 | সুন্দরবন সংরক্ষিত বনাঞ্চল | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q26780739 | way | 163696991 | https://www.openstreetmap.org/way/163696991 | Reef Island WLS | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1965316 | way | 22825734 | https://www.openstreetmap.org/way/22825734 | Narcondam Island | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q28179207 | way | 22825651 | https://www.openstreetmap.org/way/22825651 | Passage Island WLS | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q3524793 | relation | 15434166 | https://www.openstreetmap.org/relation/15434166 | Wilpattu National Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q15253488 | relation | 5683596 | https://www.openstreetmap.org/relation/5683596 | Minneriya National Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q7566439 | way | 28234944 | https://www.openstreetmap.org/way/28234944 | South Brother Island | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q15262495 | way | 28235135 | https://www.openstreetmap.org/way/28235135 | North Brother Island | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q4901777 | relation | 19153153 | https://www.openstreetmap.org/relation/19153153 | Bhimgad WLS | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q6443439 | relation | 18136442 | https://www.openstreetmap.org/relation/18136442 | Kumana National Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1530863 | relation | 18221780 | https://www.openstreetmap.org/relation/18221780 | Yala National Park - Block 1 | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1530863 | relation | 18201283 | https://www.openstreetmap.org/relation/18201283 | Yala National Park - Block 2 | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1530863 | relation | 18304575 | https://www.openstreetmap.org/relation/18304575 | Yala National Park - Block 4 | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1530863 | relation | 18201212 | https://www.openstreetmap.org/relation/18201212 | Yala National Park - Block 3 | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1530863 | relation | 18304344 | https://www.openstreetmap.org/relation/18304344 | Yala National Park - Block 5 | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q7971410 | relation | 6315786 | https://www.openstreetmap.org/relation/6315786 | Wasgamuwa National Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1630245 | relation | 18523072 | https://www.openstreetmap.org/relation/18523072 | Horton Plains National Park | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q1371403 | relation | 3263607 | https://www.openstreetmap.org/relation/3263607 | อุทยานแห่งชาติหมู่เกาะสิมิลัน | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q3076575 | relation | 10956920 | https://www.openstreetmap.org/relation/10956920 | Боғи миллии Тоҷикистон | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q2211959 | relation | 3531450 | https://www.openstreetmap.org/relation/3531450 | सगरमाथा राष्ट्रिय निकुञ्ज | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |
| Q140089593 | relation | 21075759 | https://www.openstreetmap.org/relation/21075759 | Bhimalpur Forest | Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area). |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

The fix here is an edit to OpenStreetMap's `wikidata` tag, not to Wikidata -- QuickStatements can't help. When the detail column says "Redirects to X, which IS in our list", retag the OSM object to X. When Wikidata's side of a redirect needs cleanup instead (e.g. a genuine duplicate item), merge the items on Wikidata by hand -- QuickStatements doesn't do merges either.

</details>

### Wikidata P402 (OSM relation) outdated

Wikidata's own OSM-relation-id claim (P402) does not resolve cleanly against the OSM cache.

| wikidataId | wikidataLabel | osmRelationId | detail |
| --- | --- | --- | --- |
| Q102047437 | Gulmarg Wildlife Sanctuary | 15876412 | Relation not found in OSM cache (deleted/renumbered on OSM, or outside the query bbox). |
| Q135826470 | West Sunderban Wildlife Sanctuary | 678835645 | Relation not found in OSM cache (deleted/renumbered on OSM, or outside the query bbox). |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

Removes the stale P402 (OpenStreetMap Relation identifier) value. If the detail column shows the relation now belongs to a different OSM object entirely, add the corrected relation id by hand instead of just removing this one (`Qid	P402	"<new-relation-id>"`).

Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:

```
Q102047437	-P402	"15876412"
Q135826470	-P402	"678835645"
```

</details>

### Wikidata coordinate outside OSM polygon

The matched pair's Wikidata coordinate (P625) falls outside the OSM boundary geometry.

| wikidataId | wikidataLabel | osmUrl | distanceToBoundary | distanceToCentroid |
| --- | --- | --- | --- | --- |
| Q337028 | Gir National Park | https://www.openstreetmap.org/relation/21061186 | 928 m | 5.00 km |
| Q5224247 | Mukundra Hills Tiger Reserve | https://www.openstreetmap.org/relation/9477404 | 162 m | 17.64 km |
| Q5618257 | Gumti Wildlife Sanctuary | https://www.openstreetmap.org/relation/9264786 | 40.86 km | 48.60 km |
| Q6187899 | Jessore Sloth Bear Sanctuary | https://www.openstreetmap.org/relation/9308456 | 19.95 km | 31.74 km |
| Q6382549 | Kedarnath Wildlife Sanctuary | https://www.openstreetmap.org/relation/3014915 | 25.70 km | 42.37 km |
| Q1544213 | Great Himalayan National Park | https://www.openstreetmap.org/relation/8815513 | 8.18 km | 30.75 km |
| Q16902313 | Umred Karhandla Wildlife Sanctuary | https://www.openstreetmap.org/way/321130160 | 1.28 km | 2.07 km |
| Q17033744 | Talley Valley Wildlife Sanctuary | https://www.openstreetmap.org/way/668128310 | 396 m | 14.11 km |
| Q18343586 | Gautam Budha Wildlife Sanctuary | https://www.openstreetmap.org/way/667689530 | 19.43 km | 40.09 km |
| Q19808294 | Nandur Madhmeshwar Bird Sanctuary | https://www.openstreetmap.org/way/682827513 | 3.43 km | 10.75 km |
| Q21997171 | Parrot Bird Sanctuary Chandigarh | https://www.openstreetmap.org/way/129553511 | 343 m | 436 m |
| Q65091528 | Gudekote Wildlife Sanctuary | https://www.openstreetmap.org/relation/9330957 | 38.90 km | 44.83 km |
| Q115804851 | Dadra and Nagar Haveli Wildlife Sanctuary | https://www.openstreetmap.org/way/677741385 | 155 m | 980 m |
| Q4807241 | Askot Musk Deer Sanctuary | https://www.openstreetmap.org/relation/9424049 | 1.38 km | 17.94 km |
| Q5073423 | Chapramari Wildlife Sanctuary | https://www.openstreetmap.org/way/668960167 | 1.50 km | 3.02 km |
| Q2639563 | Tadoba-Andhari Tiger Reserve | https://www.openstreetmap.org/way/679249389 | 1.04 km | 2.81 km |
| Q2724481 | Marine National Park, Gulf of Kutch | https://www.openstreetmap.org/relation/8334753 | 9.61 km | 8.52 km |
| Q2726467 | Kutch Bustard Sanctuary | https://www.openstreetmap.org/way/679583523 | 3.70 km | 4.62 km |
| Q2730580 | Khijadiya Bird Sanctuary | https://www.openstreetmap.org/way/669203977 | 2.82 km | 4.30 km |
| Q2989176 | Orang National Park | https://www.openstreetmap.org/relation/1665597 | 2.53 km | 7.40 km |
| Q6772512 | Thattekad Bird Sanctuary | https://www.openstreetmap.org/way/677289011 | 47.59 km | 48.89 km |
| Q6807544 | Neyyar Wildlife Sanctuary | https://www.openstreetmap.org/relation/9469924 | 12.20 km | 18.44 km |
| Q6826847 | Mhadei Wildlife Sanctuary | https://www.openstreetmap.org/relation/19059002 | 94 m | 3.12 km |
| Q6965894 | Nargu Wildlife Sanctuary | https://www.openstreetmap.org/way/667924651 | 2.89 km | 12.55 km |
| Q548153 | Periyar National Park | https://www.openstreetmap.org/way/681439743 | 9.36 km | 19.88 km |
| Q1207543 | Indian Wild Ass Sanctuary | https://www.openstreetmap.org/way/669217186 | 2.01 km | 39.37 km |
| Q1427976 | Indravati National Park | https://www.openstreetmap.org/relation/2123530 | 31.63 km | 55.75 km |
| Q1544313 | Rani Jhansi Marine National Park | https://www.openstreetmap.org/way/680484087 | 48.43 km | 58.78 km |
| Q2253195 | Koothankulam Bird Sanctuary | https://www.openstreetmap.org/relation/9334908 | 8.79 km | 9.80 km |
| Q2428291 | Valmiki National Park | https://www.openstreetmap.org/relation/2640059 | 25.23 km | 38.51 km |
| Q2663264 | Betla National Park | https://www.openstreetmap.org/way/667664511 | 6.28 km | 21.34 km |
| Q2669063 | Vansda National Park | https://www.openstreetmap.org/way/143366077 | 2.76 km | 5.12 km |
| Q2757724 | Jambughoda Wildlife Sanctuary | https://www.openstreetmap.org/way/272087816 | 257 m | 6.26 km |
| Q2928293 | Bura Chapori Wildlife Sanctuary | https://www.openstreetmap.org/way/178119226 | 121 m | 2.11 km |
| Q2985193 | Singalila National Park | https://www.openstreetmap.org/relation/9258262 | 968 m | 3.33 km |
| Q2985390 | Mukurthi National Park | https://www.openstreetmap.org/relation/21130861 | 1.49 km | 3.61 km |
| Q2985788 | Neora Valley National Park | https://www.openstreetmap.org/way/666282774 | 453 m | 5.05 km |
| Q3091867 | Mathikettan Shola National Park | https://www.openstreetmap.org/way/666719511 | 11.18 km | 13.83 km |
| Q3174875 | Nokrek National Park | https://www.openstreetmap.org/way/110534257 | 14.13 km | 25.65 km |
| Q3174886 | Govind Pashu Vihar Wildlife Sanctuary | https://www.openstreetmap.org/relation/9424123 | 30.31 km | 43.16 km |
| Q3333420 | Anamudi Shola National Park | https://www.openstreetmap.org/relation/15036911 | 8.07 km | 13.61 km |
| Q3364480 | Shirui National Park | https://www.openstreetmap.org/way/678447674 | 95.40 km | 99.35 km |
| Q3490050 | Sonai Rupai Wildlife Sanctuary | https://www.openstreetmap.org/way/668979382 | 423 m | 12.91 km |
| Q3595858 | Wayanad Wildlife Sanctuary | https://www.openstreetmap.org/relation/9399178 | 36.37 km | 42.06 km |
| Q3635045 | Binsar Wildlife Sanctuary | https://www.openstreetmap.org/relation/9298034 | 34.79 km | 41.05 km |
| Q3846171 | Ranganthittu Bird Sanctuary | https://www.openstreetmap.org/relation/9329660 | 2.64 km | 5.61 km |
| Q4251269 | Bakhira Sanctuary | https://www.openstreetmap.org/relation/1765046 | 298 m | 3.46 km |
| Q4783879 | Aralam Wildlife Sanctuary | https://www.openstreetmap.org/way/677209471 | 4.74 km | 8.16 km |
| Q4851306 | Ballabhpur Wildlife Sanctuary | https://www.openstreetmap.org/way/678820920 | 541 m | 1.45 km |
| Q4860066 | Barda Wildlife Sanctuary | https://www.openstreetmap.org/way/667545586 | 1.38 km | 6.68 km |
| Q4955532 | Brahmagiri Wildlife Sanctuary | https://www.openstreetmap.org/way/670556892 | 42.90 km | 58.16 km |
| Q5054715 | Cauvery Wildlife Sanctuary | https://www.openstreetmap.org/relation/9329112 | 874 m | 10.57 km |
| Q5070917 | Chandaka Elephant Sanctuary | https://www.openstreetmap.org/way/669747799 | 1.58 km | 9.94 km |
| Q5102342 | Chitrangudi Bird Sanctuary | https://www.openstreetmap.org/way/671122257 | 1.14 km | 1.60 km |
| Q5405090 | Eturnagaram Wildlife Sanctuary | https://www.openstreetmap.org/way/670957979 | 719 m | 7.88 km |
| Q5520164 | Gamgul Siyabehi Wildlife Sanctuary | https://www.openstreetmap.org/relation/9290782 | 8.66 km | 16.93 km |
| Q5520717 | Gandhi Sagar Sanctuary | https://www.openstreetmap.org/relation/9309950 | 6.95 km | 15.19 km |
| Q5589844 | Govind Pashu Vihar National Park and Sanctuary | https://www.openstreetmap.org/relation/8777786 | 2.52 km | 8.26 km |
| Q5599356 | Great Indian Bustard Sanctuary | https://www.openstreetmap.org/way/474162403 | 90.35 km | 92.07 km |
| Q5617576 | Gulf of Mannar Marine National Park | https://www.openstreetmap.org/relation/415570 | 27.78 km | 85.26 km |
| Q6344663 | Kachhua Sanctuary | https://www.openstreetmap.org/relation/6594441 | 252 m | 2.12 km |
| Q6372473 | Karlapat Wildlife Sanctuary | https://www.openstreetmap.org/way/678260731 | 29 m | 3.93 km |
| Q6372818 | Karnala Bird Sanctuary | https://www.openstreetmap.org/relation/21066180 | 901 m | 3.41 km |
| Q6379588 | Kawal Wildlife Sanctuary | https://www.openstreetmap.org/way/670975581 | 2.81 km | 20.75 km |
| Q6437498 | Krishna Wildlife Sanctuary | https://www.openstreetmap.org/relation/20066333 | 11.28 km | 24.32 km |
| Q6746838 | Manali Sanctuary | https://www.openstreetmap.org/way/667906690 | 2.56 km | 6.21 km |
| Q6959133 | Nagzira Wildlife Sanctuary | https://www.openstreetmap.org/way/670043200 | 473 m | 9.60 km |
| Q6982793 | Nawabganj Bird Sanctuary | https://www.openstreetmap.org/relation/8452444 | 83 m | 699 m |
| Q7180496 | Phansad Wildlife Sanctuary | https://www.openstreetmap.org/way/670197606 | 2.71 km | 12.13 km |
| Q7399055 | Sagareshwar Wildlife Sanctuary | https://www.openstreetmap.org/way/265054632 | 53 m | 1.26 km |
| Q7402708 | Sajnekhali Wildlife Sanctuary | https://www.openstreetmap.org/relation/13617704 | 22.11 km | 33.02 km |
| Q7408557 | Saman Bird Sanctuary | https://www.openstreetmap.org/way/668669680 | 1.12 km | 2.29 km |
| Q7416307 | Sandi Bird Sanctuary | https://www.openstreetmap.org/way/668654892 | 7.60 km | 9.09 km |
| Q7450103 | Senchal Wildlife Sanctuary | https://www.openstreetmap.org/way/678848509 | 181 m | 2.50 km |
| Q7494223 | Shendurney Wildlife Sanctuary | https://www.openstreetmap.org/relation/17744486 | 3.99 km | 8.86 km |
| Q7497442 | Shingba Rhododendron Sanctuary | https://www.openstreetmap.org/way/668997428 | 4.78 km | 9.08 km |
| Q7531584 | Sita Mata Wildlife Sanctuary | https://www.openstreetmap.org/way/667134094 | 7.83 km | 19.07 km |
| Q7559997 | Someshwara Wildlife Sanctuary | https://www.openstreetmap.org/relation/9328427 | 8.71 km | 24.35 km |
| Q7844042 | Trishna Wildlife Sanctuary | https://www.openstreetmap.org/way/666506794 | 11.67 km | 17.52 km |
| Q7929607 | Vikramshila Gangetic Dolphin Sanctuary | https://www.openstreetmap.org/way/668848106 | 12 m | 3.41 km |
| Q8050448 | Yawal Wildlife Sanctuary | https://www.openstreetmap.org/way/679320215 | 494 m | 11.77 km |
| Q13111992 | Chulannur Peafowl Sanctuary | https://www.openstreetmap.org/way/677290520 | 730 m | 1.37 km |
| Q14229383 | Pin Valley National Park | https://www.openstreetmap.org/way/114792469 | 35.23 km | 52.56 km |
| Q14623377 | Pani Dihing Wildlife Sanctuary | https://www.openstreetmap.org/way/677511689 | 106 m | 2.97 km |
| Q880724 | Blackbuck National Park | https://www.openstreetmap.org/way/143357444 | 2.33 km | 5.60 km |
| Q969593 | Kasu Brahmananda Reddy National Park | https://www.openstreetmap.org/way/28268610 | 174 m | 1.09 km |
| Q1858071 | Panna National Park | https://www.openstreetmap.org/way/160695615 | 277 m | 14.27 km |
| Q2226064 | Sathyamangalam Tiger Reserve | https://www.openstreetmap.org/relation/4192204 | 54.40 km | 72.65 km |
| Q3092341 | Sanjay National Park | https://www.openstreetmap.org/relation/9268491 | 12.05 km | 33.29 km |
| Q130974238 | Barela Bird Sanctuary | https://www.openstreetmap.org/way/668838321 | 485 m | 2.77 km |
| Q135012839 | Kwangtung Island Wildlife Sanctuary | https://www.openstreetmap.org/way/227814013 | 36.72 km | 36.93 km |
| Q2985156 | Kalesar National Park | https://www.openstreetmap.org/way/666664869 | 743 m | 6.27 km |
| Q7293023 | Ranibennur Blackbuck Sanctuary | https://www.openstreetmap.org/relation/9446246 | 373 m | 6.50 km |
| Q15982945 | Kaimoor Sanctuary | https://www.openstreetmap.org/way/668643371 | 4.61 km | 33.32 km |
| Q16894124 | Lengteng Wildlife Sanctuary | https://www.openstreetmap.org/way/662960902 | 1.46 km | 5.29 km |
| Q16979364 | Kanyakumari Wildlife Sanctuary | https://www.openstreetmap.org/relation/9336178 | 868 m | 8.03 km |
| Q17002923 | Nahar Wildlife Sanctuary | https://www.openstreetmap.org/way/668500132 | 446 m | 856 m |
| Q17067959 | Kugti Sanctuary | https://www.openstreetmap.org/way/667934530 | 7.82 km | 20.82 km |
| Q17082192 | Patna Bird Sanctuary | https://www.openstreetmap.org/way/668735342 | 3.02 km | 3.41 km |
| Q19895392 | Pranahita Wildlife Sanctuary | https://www.openstreetmap.org/relation/9331660 | 992 m | 8.68 km |
| Q19895529 | Purna Wildlife Sanctuary | https://www.openstreetmap.org/way/669197063 | 1.21 km | 8.90 km |
| Q22080908 | Simbalbara National Park | https://www.openstreetmap.org/way/666725799 | 209 m | 3.02 km |
| Q24906034 | Sri Penusila Narasimha Wildlife Sanctuary | https://www.openstreetmap.org/way/671119721 | 18.45 km | 47.38 km |
| Q61363881 | Nongkhyllem Wildlife Sanctuary | https://www.openstreetmap.org/way/666517430 | 2.65 km | 6.86 km |
| Q65090978 | Ken Gharial Sanctuary | https://www.openstreetmap.org/way/669401054 | 631 m | 2.52 km |
| Q65321737 | Karimpuzha Wildlife Sanctuary | https://www.openstreetmap.org/relation/21130775 | 504 m | 12.79 km |
| Q85800682 | Sharavathi LTM Wildlife Sanctuary | https://www.openstreetmap.org/way/670641254 | 7.20 km | 27.12 km |
| Q106257541 | Kitam bird sanctuary | https://www.openstreetmap.org/way/668999183 | 1.49 km | 2.31 km |
| Q107313635 | Itanagar Wildlife Sanctuary | https://www.openstreetmap.org/way/677458098 | 5.22 km | 11.39 km |
| Q112252264 | Bukkapatna Chinkara Wildlife Sanctuary | https://www.openstreetmap.org/relation/19925050 | 2.18 km | 4.65 km |
| Q112252433 | Rangayyanadurga Four–horned antelope Wildlife Sanctuary | https://www.openstreetmap.org/relation/9447282 | 12.52 km | 14.92 km |
| Q112252443 | Ramadevarabetta Vulture Sanctuary | https://www.openstreetmap.org/way/670763955 | 228 m | 640 m |
| Q122363298 | Nanjarayan Tank Bird Sanctuary | https://www.openstreetmap.org/relation/19924762 | 17.21 km | 17.72 km |
| Q123399066 | Bandh Baretha | https://www.openstreetmap.org/relation/9435774 | 582 m | 9.07 km |
| Q125881460 | Mansar-Surinsar Wildlife sanctuary | https://www.openstreetmap.org/way/668486755 | 5.23 km | 11.42 km |
| Q130974135 | Mussoorie Wildlife Sanctuary | https://www.openstreetmap.org/way/681258821 | 376 m | 1.94 km |
| Q130974254 | Nakti Dam Wildlife Sanctuary | https://www.openstreetmap.org/way/668879024 | 4.36 km | 5.90 km |
| Q130974349 | Badalkhol Wildlife Sanctuary | https://www.openstreetmap.org/way/669633370 | 209.38 km | 218.74 km |
| Q131123428 | Kodaikanal Wildlife Sanctuary | https://www.openstreetmap.org/relation/9336901 | 17.74 km | 36.37 km |
| Q131939336 | Girnar Wildlife Sanctuary | https://www.openstreetmap.org/relation/9078468 | 3.62 km | 11.76 km |
| Q132068974 | Orchha Wildlife Sanctuary | https://www.openstreetmap.org/way/680764132 | 723 m | 5.75 km |
| Q132126728 | Son Gharial Wildlife Sanctuary | https://www.openstreetmap.org/way/669274355 | 111 m | 67.61 km |
| Q15198953 | Bhimbandh Wildlife Sanctuary | https://www.openstreetmap.org/way/668864873 | 5.79 km | 17.58 km |
| Q15232550 | Kaimur Wildlife Sanctuary | https://www.openstreetmap.org/way/668769113 | 8.90 km | 38.07 km |
| Q15233552 | Kanjirankulam Bird Sanctuary | https://www.openstreetmap.org/way/671207570 | 2.55 km | 2.98 km |
| Q15276427 | Sessa Orchid Sanctuary | https://www.openstreetmap.org/way/677464198 | 5.35 km | 9.77 km |
| Q15723901 | Kuldiha Wildlife Sanctuary | https://www.openstreetmap.org/way/669795314 | 2.65 km | 14.72 km |
| Q28174315 | Kapilasa Wildlife Sanctuary | https://www.openstreetmap.org/way/669764918 | 127 m | 4.59 km |
| Q31708100 | Kottiyoor Wildlife Sanctuary | https://www.openstreetmap.org/way/677210306 | 1.61 km | 5.22 km |
| Q31708488 | Inderkilla National Park | https://www.openstreetmap.org/way/666695328 | 3.49 km | 10.64 km |
| Q48727189 | Malabar Wildlife Sanctuary | https://www.openstreetmap.org/way/677907120 | 30.85 km | 33.98 km |
| Q48729855 | Parvati Arga Bird Sanctuary | https://www.openstreetmap.org/relation/9302381 | 140 m | 998 m |
| Q60744029 | Mookambika Wildlife Sanctuary | https://www.openstreetmap.org/way/670548929 | 11.45 km | 24.74 km |
| Q135404149 | Narsinghgarh Wildlife Sanctuary | https://www.openstreetmap.org/way/669504729 | 35 m | 4.74 km |
| Q135404156 | Kibber Wildlife Sanctuary | https://www.openstreetmap.org/relation/4144891 | 18.05 km | 38.28 km |
| Q135412386 | Pualreng Wildlife Sanctuary | https://www.openstreetmap.org/way/663161490 | 690 m | 5.34 km |
| Q135483626 | Panpatha Wildlife Sanctuary | https://www.openstreetmap.org/relation/15695895 | 10.01 km | 20.40 km |
| Q135622961 | Sakkarakottai Bird Sanctuary | https://www.openstreetmap.org/way/671203113 | 3.20 km | 5.71 km |
| Q135798492 | Bir Aishvan Wildlife Sanctuary | https://www.openstreetmap.org/way/202540707 | 3.47 km | 4.54 km |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

Moves P625 to the OSM boundary's centroid. Check the `distanceToBoundary`/`distanceToCentroid` columns first -- a large distance can mean the Wikidata coordinate is simply wrong (apply this), or that it correctly points at one specific feature/landmark inside a much larger OSM-mapped boundary, in which case OSM is right and this statement should be skipped.

Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:

```
Q337028	P625	@21.091728/70.785779	S248	Q936	S854	"https://www.openstreetmap.org/relation/21061186"
Q5224247	P625	@24.972967/75.724789	S248	Q936	S854	"https://www.openstreetmap.org/relation/9477404"
Q5618257	P625	@23.649137/91.788542	S248	Q936	S854	"https://www.openstreetmap.org/relation/9264786"
Q6187899	P625	@24.421379/72.497685	S248	Q936	S854	"https://www.openstreetmap.org/relation/9308456"
Q6382549	P625	@30.609156/79.188307	S248	Q936	S854	"https://www.openstreetmap.org/relation/3014915"
Q1544213	P625	@31.797128/77.625759	S248	Q936	S854	"https://www.openstreetmap.org/relation/8815513"
Q16902313	P625	@20.840831/79.492006	S248	Q936	S854	"https://www.openstreetmap.org/way/321130160"
Q17033744	P625	@27.571168/94.038206	S248	Q936	S854	"https://www.openstreetmap.org/way/668128310"
Q18343586	P625	@24.420136/85.186433	S248	Q936	S854	"https://www.openstreetmap.org/way/667689530"
Q19808294	P625	@20.022816/74.108966	S248	Q936	S854	"https://www.openstreetmap.org/way/682827513"
Q21997171	P625	@30.728874/76.779848	S248	Q936	S854	"https://www.openstreetmap.org/way/129553511"
Q65091528	P625	@14.850454/76.647434	S248	Q936	S854	"https://www.openstreetmap.org/relation/9330957"
Q115804851	P625	@20.281397/73.097356	S248	Q936	S854	"https://www.openstreetmap.org/way/677741385"
Q4807241	P625	@29.995644/80.534943	S248	Q936	S854	"https://www.openstreetmap.org/relation/9424049"
Q5073423	P625	@26.899861/88.843723	S248	Q936	S854	"https://www.openstreetmap.org/way/668960167"
Q2639563	P625	@20.241771/79.427277	S248	Q936	S854	"https://www.openstreetmap.org/way/679249389"
Q2724481	P625	@22.474676/69.699210	S248	Q936	S854	"https://www.openstreetmap.org/relation/8334753"
Q2726467	P625	@23.182508/68.735610	S248	Q936	S854	"https://www.openstreetmap.org/way/679583523"
Q2730580	P625	@22.547592/70.149901	S248	Q936	S854	"https://www.openstreetmap.org/way/669203977"
Q2989176	P625	@26.552520/92.322565	S248	Q936	S854	"https://www.openstreetmap.org/relation/1665597"
Q6772512	P625	@10.130402/76.717059	S248	Q936	S854	"https://www.openstreetmap.org/way/677289011"
Q6807544	P625	@8.554418/77.221104	S248	Q936	S854	"https://www.openstreetmap.org/relation/9469924"
Q6826847	P625	@15.577911/74.199219	S248	Q936	S854	"https://www.openstreetmap.org/relation/19059002"
Q6965894	P625	@31.979147/76.983837	S248	Q936	S854	"https://www.openstreetmap.org/way/667924651"
Q548153	P625	@9.450035/77.307083	S248	Q936	S854	"https://www.openstreetmap.org/way/681439743"
Q1207543	P625	@23.370231/71.248274	S248	Q936	S854	"https://www.openstreetmap.org/way/669217186"
Q1427976	P625	@19.123259/80.517858	S248	Q936	S854	"https://www.openstreetmap.org/relation/2123530"
Q1544313	P625	@12.146547/93.059269	S248	Q936	S854	"https://www.openstreetmap.org/way/680484087"
Q2253195	P625	@8.492886/77.759759	S248	Q936	S854	"https://www.openstreetmap.org/relation/9334908"
Q2428291	P625	@27.407260/84.118091	S248	Q936	S854	"https://www.openstreetmap.org/relation/2640059"
Q2663264	P625	@23.699534/84.149362	S248	Q936	S854	"https://www.openstreetmap.org/way/667664511"
Q2669063	P625	@20.778905/73.459582	S248	Q936	S854	"https://www.openstreetmap.org/way/143366077"
Q2757724	P625	@22.406051/73.673200	S248	Q936	S854	"https://www.openstreetmap.org/way/272087816"
Q2928293	P625	@26.531273/92.703495	S248	Q936	S854	"https://www.openstreetmap.org/way/178119226"
Q2985193	P625	@27.130594/88.036854	S248	Q936	S854	"https://www.openstreetmap.org/relation/9258262"
Q2985390	P625	@11.273363/76.507403	S248	Q936	S854	"https://www.openstreetmap.org/relation/21130861"
Q2985788	P625	@27.065710/88.750549	S248	Q936	S854	"https://www.openstreetmap.org/way/666282774"
Q3091867	P625	@9.980887/77.247863	S248	Q936	S854	"https://www.openstreetmap.org/way/666719511"
Q3174875	P625	@25.465844/90.361055	S248	Q936	S854	"https://www.openstreetmap.org/way/110534257"
Q3174886	P625	@31.111580/78.348270	S248	Q936	S854	"https://www.openstreetmap.org/relation/9424123"
Q3333420	P625	@10.200585/77.207420	S248	Q936	S854	"https://www.openstreetmap.org/relation/15036911"
Q3364480	P625	@25.100797/94.454754	S248	Q936	S854	"https://www.openstreetmap.org/way/678447674"
Q3490050	P625	@26.911998/92.474454	S248	Q936	S854	"https://www.openstreetmap.org/way/668979382"
Q3595858	P625	@11.906738/76.084061	S248	Q936	S854	"https://www.openstreetmap.org/relation/9399178"
Q3635045	P625	@29.699218/79.755280	S248	Q936	S854	"https://www.openstreetmap.org/relation/9298034"
Q3846171	P625	@12.403074/76.701575	S248	Q936	S854	"https://www.openstreetmap.org/relation/9329660"
Q4251269	P625	@26.903278/83.139013	S248	Q936	S854	"https://www.openstreetmap.org/relation/1765046"
Q4783879	P625	@11.945488/75.857355	S248	Q936	S854	"https://www.openstreetmap.org/way/677209471"
Q4851306	P625	@23.684016/87.667220	S248	Q936	S854	"https://www.openstreetmap.org/way/678820920"
Q4860066	P625	@21.803062/69.737931	S248	Q936	S854	"https://www.openstreetmap.org/way/667545586"
Q4955532	P625	@12.023314/75.875587	S248	Q936	S854	"https://www.openstreetmap.org/way/670556892"
Q5054715	P625	@12.214678/77.457116	S248	Q936	S854	"https://www.openstreetmap.org/relation/9329112"
Q5070917	P625	@20.347935/85.673471	S248	Q936	S854	"https://www.openstreetmap.org/way/669747799"
Q5102342	P625	@9.336220/78.481351	S248	Q936	S854	"https://www.openstreetmap.org/way/671122257"
Q5405090	P625	@18.371903/80.262850	S248	Q936	S854	"https://www.openstreetmap.org/way/670957979"
Q5520164	P625	@32.871588/75.889128	S248	Q936	S854	"https://www.openstreetmap.org/relation/9290782"
Q5520717	P625	@24.674621/75.600575	S248	Q936	S854	"https://www.openstreetmap.org/relation/9309950"
Q5589844	P625	@31.171287/78.265628	S248	Q936	S854	"https://www.openstreetmap.org/relation/8777786"
Q5599356	P625	@17.829493/75.871314	S248	Q936	S854	"https://www.openstreetmap.org/way/474162403"
Q5617576	P625	@9.095544/78.697079	S248	Q936	S854	"https://www.openstreetmap.org/relation/415570"
Q6344663	P625	@25.298972/83.018299	S248	Q936	S854	"https://www.openstreetmap.org/relation/6594441"
Q6372473	P625	@19.691799/83.099771	S248	Q936	S854	"https://www.openstreetmap.org/way/678260731"
Q6372818	P625	@18.881519/73.117762	S248	Q936	S854	"https://www.openstreetmap.org/relation/21066180"
Q6379588	P625	@19.214977/78.829649	S248	Q936	S854	"https://www.openstreetmap.org/way/670975581"
Q6437498	P625	@15.794539/80.904915	S248	Q936	S854	"https://www.openstreetmap.org/relation/20066333"
Q6746838	P625	@32.243787/77.124095	S248	Q936	S854	"https://www.openstreetmap.org/way/667906690"
Q6959133	P625	@21.290143/80.064214	S248	Q936	S854	"https://www.openstreetmap.org/way/670043200"
Q6982793	P625	@26.614511/80.657823	S248	Q936	S854	"https://www.openstreetmap.org/relation/8452444"
Q7180496	P625	@18.408330/72.966196	S248	Q936	S854	"https://www.openstreetmap.org/way/670197606"
Q7399055	P625	@17.144327/74.369410	S248	Q936	S854	"https://www.openstreetmap.org/way/265054632"
Q7402708	P625	@22.008869/88.821398	S248	Q936	S854	"https://www.openstreetmap.org/relation/13617704"
Q7408557	P625	@27.016070/79.181191	S248	Q936	S854	"https://www.openstreetmap.org/way/668669680"
Q7416307	P625	@27.314436/79.973279	S248	Q936	S854	"https://www.openstreetmap.org/way/668654892"
Q7450103	P625	@26.987554/88.289389	S248	Q936	S854	"https://www.openstreetmap.org/way/678848509"
Q7494223	P625	@8.888820/77.171280	S248	Q936	S854	"https://www.openstreetmap.org/relation/17744486"
Q7497442	P625	@27.759867/88.729464	S248	Q936	S854	"https://www.openstreetmap.org/way/668997428"
Q7531584	P625	@24.217554/74.506067	S248	Q936	S854	"https://www.openstreetmap.org/way/667134094"
Q7559997	P625	@13.526865/75.054049	S248	Q936	S854	"https://www.openstreetmap.org/relation/9328427"
Q7844042	P625	@23.271090/91.363505	S248	Q936	S854	"https://www.openstreetmap.org/way/666506794"
Q7929607	P625	@25.286670/86.998080	S248	Q936	S854	"https://www.openstreetmap.org/way/668848106"
Q8050448	P625	@21.346697/75.768808	S248	Q936	S854	"https://www.openstreetmap.org/way/679320215"
Q13111992	P625	@10.723577/76.480706	S248	Q936	S854	"https://www.openstreetmap.org/way/677290520"
Q14229383	P625	@31.972609/77.887966	S248	Q936	S854	"https://www.openstreetmap.org/way/114792469"
Q14623377	P625	@27.110693/94.623635	S248	Q936	S854	"https://www.openstreetmap.org/way/677511689"
Q880724	P625	@22.043654/72.053189	S248	Q936	S854	"https://www.openstreetmap.org/way/143357444"
Q969593	P625	@17.420444/78.420298	S248	Q936	S854	"https://www.openstreetmap.org/way/28268610"
Q1858071	P625	@24.618780/79.940624	S248	Q936	S854	"https://www.openstreetmap.org/way/160695615"
Q2226064	P625	@11.645353/77.103914	S248	Q936	S854	"https://www.openstreetmap.org/relation/4192204"
Q3092341	P625	@23.899215/81.973908	S248	Q936	S854	"https://www.openstreetmap.org/relation/9268491"
Q130974238	P625	@25.764852/85.552952	S248	Q936	S854	"https://www.openstreetmap.org/way/668838321"
Q135012839	P625	@13.169071/92.795173	S248	Q936	S854	"https://www.openstreetmap.org/way/227814013"
Q2985156	P625	@30.386802/77.536994	S248	Q936	S854	"https://www.openstreetmap.org/way/666664869"
Q7293023	P625	@14.673256/75.655866	S248	Q936	S854	"https://www.openstreetmap.org/relation/9446246"
Q15982945	P625	@24.687118/82.738241	S248	Q936	S854	"https://www.openstreetmap.org/way/668643371"
Q16894124	P625	@23.799294/93.253017	S248	Q936	S854	"https://www.openstreetmap.org/way/662960902"
Q16979364	P625	@8.394958/77.403658	S248	Q936	S854	"https://www.openstreetmap.org/relation/9336178"
Q17002923	P625	@28.413792/76.404194	S248	Q936	S854	"https://www.openstreetmap.org/way/668500132"
Q17067959	P625	@32.473979/76.719475	S248	Q936	S854	"https://www.openstreetmap.org/way/667934530"
Q17082192	P625	@27.528140/78.313236	S248	Q936	S854	"https://www.openstreetmap.org/way/668735342"
Q19895392	P625	@18.955512/79.868868	S248	Q936	S854	"https://www.openstreetmap.org/relation/9331660"
Q19895529	P625	@20.932065/73.617589	S248	Q936	S854	"https://www.openstreetmap.org/way/669197063"
Q22080908	P625	@30.438783/77.504454	S248	Q936	S854	"https://www.openstreetmap.org/way/666725799"
Q24906034	P625	@14.405992/79.303762	S248	Q936	S854	"https://www.openstreetmap.org/way/671119721"
Q61363881	P625	@25.872324/91.777413	S248	Q936	S854	"https://www.openstreetmap.org/way/666517430"
Q65090978	P625	@24.881046/80.053954	S248	Q936	S854	"https://www.openstreetmap.org/way/669401054"
Q65321737	P625	@11.312065/76.465466	S248	Q936	S854	"https://www.openstreetmap.org/relation/21130775"
Q85800682	P625	@14.092393/74.787827	S248	Q936	S854	"https://www.openstreetmap.org/way/670641254"
Q106257541	P625	@27.110077/88.353731	S248	Q936	S854	"https://www.openstreetmap.org/way/668999183"
Q107313635	P625	@27.161330/93.629864	S248	Q936	S854	"https://www.openstreetmap.org/way/677458098"
Q112252264	P625	@13.656898/76.704282	S248	Q936	S854	"https://www.openstreetmap.org/relation/19925050"
Q112252433	P625	@14.612971/76.228281	S248	Q936	S854	"https://www.openstreetmap.org/relation/9447282"
Q112252443	P625	@12.757328/77.305477	S248	Q936	S854	"https://www.openstreetmap.org/way/670763955"
Q122363298	P625	@11.134185/77.385922	S248	Q936	S854	"https://www.openstreetmap.org/relation/19924762"
Q123399066	P625	@26.802808/77.375893	S248	Q936	S854	"https://www.openstreetmap.org/relation/9435774"
Q125881460	P625	@32.763809/75.078994	S248	Q936	S854	"https://www.openstreetmap.org/way/668486755"
Q130974135	P625	@30.482692/78.013785	S248	Q936	S854	"https://www.openstreetmap.org/way/681258821"
Q130974254	P625	@24.847233/86.448418	S248	Q936	S854	"https://www.openstreetmap.org/way/668879024"
Q130974349	P625	@22.927424/83.828578	S248	Q936	S854	"https://www.openstreetmap.org/way/669633370"
Q131123428	P625	@10.237782/77.502280	S248	Q936	S854	"https://www.openstreetmap.org/relation/9336901"
Q131939336	P625	@21.515624/70.540125	S248	Q936	S854	"https://www.openstreetmap.org/relation/9078468"
Q132068974	P625	@25.301730/78.619419	S248	Q936	S854	"https://www.openstreetmap.org/way/680764132"
Q132126728	P625	@24.469302/82.088294	S248	Q936	S854	"https://www.openstreetmap.org/way/669274355"
Q15198953	P625	@25.110175/86.393907	S248	Q936	S854	"https://www.openstreetmap.org/way/668864873"
Q15232550	P625	@24.747823/83.677464	S248	Q936	S854	"https://www.openstreetmap.org/way/668769113"
Q15233552	P625	@9.359787/78.478932	S248	Q936	S854	"https://www.openstreetmap.org/way/671207570"
Q15276427	P625	@27.112738/92.488599	S248	Q936	S854	"https://www.openstreetmap.org/way/677464198"
Q15723901	P625	@21.415438/86.611469	S248	Q936	S854	"https://www.openstreetmap.org/way/669795314"
Q28174315	P625	@20.667757/85.814142	S248	Q936	S854	"https://www.openstreetmap.org/way/669764918"
Q31708100	P625	@11.894606/75.904085	S248	Q936	S854	"https://www.openstreetmap.org/way/677210306"
Q31708488	P625	@32.264127/77.304255	S248	Q936	S854	"https://www.openstreetmap.org/way/666695328"
Q48727189	P625	@11.590315/75.967658	S248	Q936	S854	"https://www.openstreetmap.org/way/677907120"
Q48729855	P625	@26.932554/82.160028	S248	Q936	S854	"https://www.openstreetmap.org/relation/9302381"
Q60744029	P625	@13.806470/74.851166	S248	Q936	S854	"https://www.openstreetmap.org/way/670548929"
Q135404149	P625	@23.661480/77.090851	S248	Q936	S854	"https://www.openstreetmap.org/way/669504729"
Q135404156	P625	@32.531791/78.220195	S248	Q936	S854	"https://www.openstreetmap.org/relation/4144891"
Q135412386	P625	@24.176736/92.865857	S248	Q936	S854	"https://www.openstreetmap.org/way/663161490"
Q135483626	P625	@23.862888/81.053102	S248	Q936	S854	"https://www.openstreetmap.org/relation/15695895"
Q135622961	P625	@9.338399/78.825129	S248	Q936	S854	"https://www.openstreetmap.org/way/671203113"
Q135798492	P625	@30.227151/75.884003	S248	Q936	S854	"https://www.openstreetmap.org/way/202540707"
```

</details>

### Low name-match confidence

Matched pair (by id) whose names score below 0.5 similarity -- the id link may itself be wrong on one side.

| wikidataId | wikidataLabel | osmUrl | osmName | matchSource | nameScore |
| --- | --- | --- | --- | --- | --- |
| Q2731635 | Gaga Wildlife Sanctuary | https://www.openstreetmap.org/relation/9282949 | Gaga (Great Indian Bustard) WLS | osm-wikidata-tag | 0.16 |
| Q5070917 | Chandaka Elephant Sanctuary | https://www.openstreetmap.org/way/669747799 |  | osm-wikidata-tag | 0.00 |
| Q6750402 | Manjira Wildlife Sanctuary | https://www.openstreetmap.org/way/670962706 | Manjeera Crocodile WLS | osm-wikidata-tag | 0.33 |
| Q7531584 | Sita Mata Wildlife Sanctuary | https://www.openstreetmap.org/way/667134094 |  | osm-wikidata-tag | 0.00 |
| Q7901902 | Ushakothi Wildlife Sanctuary | https://www.openstreetmap.org/way/669809270 | Badrama WLS | osm-wikidata-tag | 0.11 |
| Q12988826 | Vallanadu Wildlife Sanctuary | https://www.openstreetmap.org/way/671212129 | Vallanadu Blackbuck WLS | osm-wikidata-tag | 0.47 |
| Q880724 | Blackbuck National Park | https://www.openstreetmap.org/way/143357444 | Blackbuck National Park Velavadar | osm-wikidata-tag | 0.47 |
| Q7499351 | Shivaram Wildlife Sanctuary | https://www.openstreetmap.org/way/670977220 | Lanja Madugu Siwaram WLS | osm-wikidata-tag | 0.25 |
| Q19361617 | Amchang Wildlife Sanctuary | https://www.openstreetmap.org/relation/9447819 |  | osm-wikidata-tag | 0.00 |
| Q85846882 | Pant Wildlife Sanctuary | https://www.openstreetmap.org/way/668763979 | Pant (Rajgir) WLS | osm-wikidata-tag | 0.36 |
| Q112252433 | Rangayyanadurga Four–horned antelope Wildlife Sanctuary | https://www.openstreetmap.org/relation/9447282 | Rangayyanadurga WLS | osm-wikidata-tag | 0.42 |
| Q125881460 | Mansar-Surinsar Wildlife sanctuary | https://www.openstreetmap.org/way/668486755 | Surinsar Mansar WLS | osm-wikidata-tag | 0.47 |
| Q130974349 | Badalkhol Wildlife Sanctuary | https://www.openstreetmap.org/way/669633370 |  | osm-wikidata-tag | 0.00 |
| Q130974367 | Gomardha Wildlife Sanctuary | https://www.openstreetmap.org/way/669576115 | Sarangarh-Gomardha WLS | osm-wikidata-tag | 0.44 |
| Q130974386 | Pamed Wildlife Sanctuary | https://www.openstreetmap.org/way/669572140 | Pamed Wild Buffalo WLS | osm-wikidata-tag | 0.28 |
| Q130974396 | Semarsot Wildlife Sanctuary | https://www.openstreetmap.org/way/669578162 |  | osm-wikidata-tag | 0.00 |
| Q15650265 | Nalbana Bird Sanctuary | https://www.openstreetmap.org/way/86140211 | Chilikha (Nalabana) WLS | osm-wikidata-tag | 0.41 |
| Q135483626 | Panpatha Wildlife Sanctuary | https://www.openstreetmap.org/relation/15695895 |  | osm-wikidata-tag | 0.00 |
| Q137254449 | Baltal Thajwas Wildlife Sanctuary | https://www.openstreetmap.org/way/676588330 | Thajwas - Baltal Wildlife Sanctuary | osm-wikidata-tag | 0.29 |
| Q137699192 | Surha Tal Bird Sanctuary | https://www.openstreetmap.org/way/668732919 | Jai Prakash Narayan (Surhatal) Bird WLS | osm-wikidata-tag | 0.21 |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No mechanical fix -- a low name-similarity score on an id-based match just means one side's id could be mistyped/miskeyed, not which side. Check whether Wikidata's P402 or OSM's `wikidata` tag is the wrong one (see the two P402/wikidata-tag-outdated sections above) before editing either.

</details>

### Ambiguous OSM wikidata-tag matches

More than one OSM object tags the same wikidata id.

| wikidataId | wikidataLabel | pickedOsmUrl | otherOsmUrls | detail |
| --- | --- | --- | --- | --- |
| Q337028 | Gir National Park | https://www.openstreetmap.org/relation/21061186 | https://www.openstreetmap.org/relation/9403363 | Multiple OSM objects tag this same wikidata id -- picked the relation (or first) arbitrarily; verify which is the primary boundary. |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No Wikidata edit applies -- this is a many-OSM-objects-to-one-wikidata-id conflict, resolved by retagging the wrong OSM object(s) with the correct id (or removing the tag if it's simply a duplicate boundary on OSM). Requires picking which OSM object is the real one first.

</details>

### OSM objects without a wikidata tag

In-scope OSM boundaries (protected_area/national_park) that carry no `wikidata` tag at all -- candidates for manual tagging.

| osmType | osmId | osmUrl | name |
| --- | --- | --- | --- |
| relation | 21133531 | https://www.openstreetmap.org/relation/21133531 | Asola-Bhatti WLS ESZ |
| way | 676562810 | https://www.openstreetmap.org/way/676562810 | Lachipora WLS |
| way | 668472257 | https://www.openstreetmap.org/way/668472257 | Nandni WLS |
| relation | 13836969 | https://www.openstreetmap.org/relation/13836969 | دیوا وٹالہ نیشنل پارک |
| way | 668495014 | https://www.openstreetmap.org/way/668495014 | Jasrota WLS |
| way | 676577119 | https://www.openstreetmap.org/way/676577119 | Trikuta WLS |
| way | 668415720 | https://www.openstreetmap.org/way/668415720 | Ramnagar Rakha WLS |
| way | 668024889 | https://www.openstreetmap.org/way/668024889 | Tundah WLS |
| way | 667926108 | https://www.openstreetmap.org/way/667926108 | Kais WLS |
| way | 677495329 | https://www.openstreetmap.org/way/677495329 | North Karbi Anglong WLS |
| way | 681093097 | https://www.openstreetmap.org/way/681093097 | Zeilad WLS |
| way | 1012210623 | https://www.openstreetmap.org/way/1012210623 | সাতছড়ি জাতীয় উদ্যান |
| way | 1012210649 | https://www.openstreetmap.org/way/1012210649 | ভাওয়াল জাতীয় উদ্যান |
| relation | 13551524 | https://www.openstreetmap.org/relation/13551524 | রামসাগর জাতীয় উদ্যান |
| relation | 13551525 | https://www.openstreetmap.org/relation/13551525 | নবাবগঞ্জ জাতীয় উদ্যান |
| relation | 9462744 | https://www.openstreetmap.org/relation/9462744 | Buxa WLS |
| relation | 9471841 | https://www.openstreetmap.org/relation/9471841 | Manas Tiger Reserve |
| relation | 13604578 | https://www.openstreetmap.org/relation/13604578 | সিংড়া জাতীয় উদ্যান |
| relation | 19877145 | https://www.openstreetmap.org/relation/19877145 | Sikhwna Jwhwlao National Park |
| relation | 12544896 | https://www.openstreetmap.org/relation/12544896 | Pangolakha WLS |
| way | 311542207 | https://www.openstreetmap.org/way/311542207 | Yagyadol (Jagdol) Community Forest |
| relation | 15046364 | https://www.openstreetmap.org/relation/15046364 | मकालु बरुण राष्ट्रिय निकुञ्‍ज |
| relation | 4860664 | https://www.openstreetmap.org/relation/4860664 | शिवपुरी नागार्जुन राष्ट्रिय निकुञ्‍ज |
| relation | 2640060 | https://www.openstreetmap.org/relation/2640060 | Valmiki WLS/Tiger Reserve |
| relation | 9285351 | https://www.openstreetmap.org/relation/9285351 | Udhwa Lake WLS |
| relation | 19887410 | https://www.openstreetmap.org/relation/19887410 | Rajauli Wildlife Sanctuary |
| way | 678653439 | https://www.openstreetmap.org/way/678653439 | Dr. Bhimrao Ambedkar Bird WLS |
| way | 668869624 | https://www.openstreetmap.org/way/668869624 | Gautam Buddha WLS |
| way | 677915138 | https://www.openstreetmap.org/way/677915138 | Panna (Gangau) WLS |
| relation | 10458351 | https://www.openstreetmap.org/relation/10458351 | शुक्लाफाँट राष्ट्रिय निकुञ्‍ज |
| way | 1124671305 | https://www.openstreetmap.org/way/1124671305 | अपि नम्पा संरक्षण क्षेत्र |
| way | 669088005 | https://www.openstreetmap.org/way/669088005 | Jhajjar Bacholi WLS |
| way | 162361280 | https://www.openstreetmap.org/way/162361280 | Sainj Wildlife Sanctuary |
| way | 667904630 | https://www.openstreetmap.org/way/667904630 | Khokhan WLS |
| way | 667918737 | https://www.openstreetmap.org/way/667918737 | Shikari Devi Wildlife Sanctuary |
| way | 667860495 | https://www.openstreetmap.org/way/667860495 | Lippa Assrang WLS |
| way | 669103475 | https://www.openstreetmap.org/way/669103475 | Bir Bhadson WLS |
| way | 43745290 | https://www.openstreetmap.org/way/43745290 | Bir Motibagh WLS |
| relation | 9300145 | https://www.openstreetmap.org/relation/9300145 | Kalesar WLS |
| relation | 9306940 | https://www.openstreetmap.org/relation/9306940 | Bir Dosanjh WLS |
| way | 125023407 | https://www.openstreetmap.org/way/125023407 | Bir Mehaswala WLS |
| way | 669101943 | https://www.openstreetmap.org/way/669101943 | Takhni-Rehmapur WLS |
| relation | 9477458 | https://www.openstreetmap.org/relation/9477458 | Mukundra Tiger Reserve |
| way | 668738801 | https://www.openstreetmap.org/way/668738801 | Soor Sarovar Bird WLS |
| relation | 9439661 | https://www.openstreetmap.org/relation/9439661 | National Chambal WLS |
| relation | 9397372 | https://www.openstreetmap.org/relation/9397372 | National Chambal WLS |
| way | 669517798 | https://www.openstreetmap.org/way/669517798 | Pench WLS |
| relation | 9323881 | https://www.openstreetmap.org/relation/9323881 | Mansinghdeo WLS |
| relation | 9473198 | https://www.openstreetmap.org/relation/9473198 | Bor Tiger Reserve |
| way | 670041024 | https://www.openstreetmap.org/way/670041024 | New Nagzira WLS |
| relation | 9473167 | https://www.openstreetmap.org/relation/9473167 | New Bor WLS |
| way | 669356833 | https://www.openstreetmap.org/way/669356833 | Pachmarhi WLS/Tiger Reserve |
| way | 678152666 | https://www.openstreetmap.org/way/678152666 | Narnala WLS |
| way | 678195199 | https://www.openstreetmap.org/way/678195199 | Melghat WLS |
| way | 677997503 | https://www.openstreetmap.org/way/677997503 | Katepurna WLS |
| relation | 9310818 | https://www.openstreetmap.org/relation/9310818 | Sailana WLS |
| relation | 21061240 | https://www.openstreetmap.org/relation/21061240 | Gir WLS ESZ (Proposed) |
| relation | 9323916 | https://www.openstreetmap.org/relation/9323916 | Tamhini WLS |
| relation | 9479789 | https://www.openstreetmap.org/relation/9479789 | Sahyadri Tiger Reserve |
| relation | 21066179 | https://www.openstreetmap.org/relation/21066179 | Karnala Bird Sanctuary ESZ (Proposed) |
| relation | 21057459 | https://www.openstreetmap.org/relation/21057459 | Tungareshwar WLS ESZ |
| relation | 21060057 | https://www.openstreetmap.org/relation/21060057 | Sanjay Gandhi National Park ESZ (Proposed) |
| relation | 21064608 | https://www.openstreetmap.org/relation/21064608 | Thane Creek Flamingo Sanctuary ESZ (Proposed) |
| relation | 15073373 | https://www.openstreetmap.org/relation/15073373 | Thane Creek Flamingo Sanctuary |
| relation | 21057070 | https://www.openstreetmap.org/relation/21057070 | Tansa WLS ESZ |
| relation | 21064757 | https://www.openstreetmap.org/relation/21064757 | Bhimashankar WLS ESZ (Proposed) |
| way | 681702589 | https://www.openstreetmap.org/way/681702589 | Naigaon Mayur WLS |
| way | 169119704 | https://www.openstreetmap.org/way/169119704 | Tipeshwar WLS |
| way | 279040083 | https://www.openstreetmap.org/way/279040083 | Deolgaon-Rehkuri WLS |
| way | 677983456 | https://www.openstreetmap.org/way/677983456 | Chaprala WLS |
| way | 670176089 | https://www.openstreetmap.org/way/670176089 | Gangewadi New Great Indian Bustard WLS |
| way | 677142324 | https://www.openstreetmap.org/way/677142324 | Nagarjuna Sagar-Srisailam WLS |
| way | 681825618 | https://www.openstreetmap.org/way/681825618 | Nagarjuna Sagar-Srisailam WLS |
| way | 670217758 | https://www.openstreetmap.org/way/670217758 | Bhamragarh WLS |
| way | 670046834 | https://www.openstreetmap.org/way/670046834 | Nawegaon WLS |
| way | 669642430 | https://www.openstreetmap.org/way/669642430 | Udanti-Sitanadi Tiger Reserve |
| relation | 9472154 | https://www.openstreetmap.org/relation/9472154 | Nawegaon-Nagzira Tiger Reserve |
| relation | 9312342 | https://www.openstreetmap.org/relation/9312342 | Sanjay Dubri WLS/Tiger Reserve |
| way | 669556792 | https://www.openstreetmap.org/way/669556792 | Parasnath WLS |
| way | 669656035 | https://www.openstreetmap.org/way/669656035 | Bhitarkanika WLS |
| way | 678253328 | https://www.openstreetmap.org/way/678253328 | Satkosia Gorge WLS |
| way | 1020199995 | https://www.openstreetmap.org/way/1020199995 | Haliday Island WLS |
| relation | 9466981 | https://www.openstreetmap.org/relation/9466981 | Sunderban Tiger Reserve |
| relation | 13604447 | https://www.openstreetmap.org/relation/13604447 | কুয়াকাটা জাতীয় উদ্যান |
| way | 1012210646 | https://www.openstreetmap.org/way/1012210646 | বারৈয়াঢালা জাতীয় উদ্যান |
| way | 1012210642 | https://www.openstreetmap.org/way/1012210642 | হিমছড়ি জাতীয় উদ্যান |
| way | 160685851 | https://www.openstreetmap.org/way/160685851 | Talabaicha Island WLS |
| way | 1012210634 | https://www.openstreetmap.org/way/1012210634 | নিঝুম দ্বীপ জাতীয় উদ্যান |
| relation | 9493296 | https://www.openstreetmap.org/relation/9493296 | Spike II Island WLS |
| way | 671326176 | https://www.openstreetmap.org/way/671326176 | Arial Island WLS |
| way | 635154715 | https://www.openstreetmap.org/way/635154715 | Girjan Island WLS |
| way | 160685847 | https://www.openstreetmap.org/way/160685847 | Mangrove Island WLS |
| way | 160685848 | https://www.openstreetmap.org/way/160685848 | Stoat Island WLS |
| way | 218788159 | https://www.openstreetmap.org/way/218788159 | Cone Island WLS |
| way | 637079076 | https://www.openstreetmap.org/way/637079076 | Parkinson Island WLS |
| way | 218788155 | https://www.openstreetmap.org/way/218788155 | Oyster Island II WLS |
| way | 671327826 | https://www.openstreetmap.org/way/671327826 | Barren Island WLS |
| way | 671336735 | https://www.openstreetmap.org/way/671336735 | Bingham Island WLS |
| way | 671338949 | https://www.openstreetmap.org/way/671338949 | Bluff Island WLS |
| way | 637728672 | https://www.openstreetmap.org/way/637728672 | Duncan Island WLS |
| way | 671488794 | https://www.openstreetmap.org/way/671488794 | East or Inglis Island WLS |
| way | 227814020 | https://www.openstreetmap.org/way/227814020 | Oliver Island WLS |
| way | 632734221 | https://www.openstreetmap.org/way/632734221 | Oyster Island I WLS |
| way | 227814016 | https://www.openstreetmap.org/way/227814016 | Orchid Island WLS |
| way | 41292224 | https://www.openstreetmap.org/way/41292224 | Curley (B.P.) Island WLS |
| way | 22825716 | https://www.openstreetmap.org/way/22825716 | Snake Island I WLS |
| way | 380829358 | https://www.openstreetmap.org/way/380829358 | Sea Serpent Island WLS |
| way | 671334972 | https://www.openstreetmap.org/way/671334972 | Benett Island WLS |
| way | 22825717 | https://www.openstreetmap.org/way/22825717 | Swamp Island WLS |
| way | 22825714 | https://www.openstreetmap.org/way/22825714 | Spike I Island WLS |
| way | 671339560 | https://www.openstreetmap.org/way/671339560 | Bondoville Island WLS |
| way | 671575640 | https://www.openstreetmap.org/way/671575640 | Roper Island WLS |
| way | 380829359 | https://www.openstreetmap.org/way/380829359 | Ranger Island WLS |
| way | 227814021 | https://www.openstreetmap.org/way/227814021 | Dot Island WLS |
| way | 634535419 | https://www.openstreetmap.org/way/634535419 | Egg Island WLS |
| way | 634535420 | https://www.openstreetmap.org/way/634535420 | Dottrell Island WLS |
| way | 671460527 | https://www.openstreetmap.org/way/671460527 | Buchanan Island WLS |
| way | 380829692 | https://www.openstreetmap.org/way/380829692 | Entrance Island WLS |
| way | 227942583 | https://www.openstreetmap.org/way/227942583 | Surat Island WLS |
| relation | 9339807 | https://www.openstreetmap.org/relation/9339807 | Interview Island WLS |
| way | 671578960 | https://www.openstreetmap.org/way/671578960 | Rowe Island WLS |
| way | 227942582 | https://www.openstreetmap.org/way/227942582 | South Reef Island WLS |
| way | 22825707 | https://www.openstreetmap.org/way/22825707 | Elat Island WLS |
| way | 227814015 | https://www.openstreetmap.org/way/227814015 | Hump Island WLS |
| way | 637393830 | https://www.openstreetmap.org/way/637393830 | Tuft Island WLS |
| way | 637393831 | https://www.openstreetmap.org/way/637393831 | Mask Island WLS |
| way | 227814014 | https://www.openstreetmap.org/way/227814014 | Latouche Island WLS |
| way | 671472630 | https://www.openstreetmap.org/way/671472630 | Curley Island WLS |
| way | 633187712 | https://www.openstreetmap.org/way/633187712 | Goose Island WLS |
| way | 633187714 | https://www.openstreetmap.org/way/633187714 | Gander Island WLS |
| way | 163696994 | https://www.openstreetmap.org/way/163696994 | Shark Island WLS |
| relation | 9493302 | https://www.openstreetmap.org/relation/9493302 | Paget Island WLS |
| way | 22825731 | https://www.openstreetmap.org/way/22825731 | Table (Excelsior) Island WLS |
| way | 179950337 | https://www.openstreetmap.org/way/179950337 | Temple Island WLS |
| way | 671544252 | https://www.openstreetmap.org/way/671544252 | North Reef Island WLS |
| way | 671337192 | https://www.openstreetmap.org/way/671337192 | Blister Island WLS |
| way | 22825728 | https://www.openstreetmap.org/way/22825728 | Point Island WLS |
| way | 519075673 | https://www.openstreetmap.org/way/519075673 | Mayo Island WLS |
| way | 227942587 | https://www.openstreetmap.org/way/227942587 | White Cliff Island WLS |
| way | 671479516 | https://www.openstreetmap.org/way/671479516 | East Island WLS |
| relation | 9340852 | https://www.openstreetmap.org/relation/9340852 | Turtle Islands WLS |
| way | 227942584 | https://www.openstreetmap.org/way/227942584 | Ox Island WLS |
| way | 228934170 | https://www.openstreetmap.org/way/228934170 | West Island WLS |
| way | 227941017 | https://www.openstreetmap.org/way/227941017 | Peacock Island WLS |
| way | 22825727 | https://www.openstreetmap.org/way/22825727 | Table (Delgarno) Island WLS |
| way | 22825730 | https://www.openstreetmap.org/way/22825730 | Trilby Island WLS |
| way | 179950348 | https://www.openstreetmap.org/way/179950348 | Tree Island WLS |
| way | 380780143 | https://www.openstreetmap.org/way/380780143 | Jungle Island WLS |
| way | 671578292 | https://www.openstreetmap.org/way/671578292 | Ross Island WLS |
| way | 671340280 | https://www.openstreetmap.org/way/671340280 | Brush Island WLS |
| way | 524572590 | https://www.openstreetmap.org/way/524572590 | Sir Hugh Ross Island WLS |
| relation | 9493298 | https://www.openstreetmap.org/relation/9493298 | Kyd Island WLS |
| way | 227942580 | https://www.openstreetmap.org/way/227942580 | Wharf Island WLS |
| way | 677829141 | https://www.openstreetmap.org/way/677829141 | North Island WLS |
| way | 671540966 | https://www.openstreetmap.org/way/671540966 | Landfall Island WLS |
| way | 671464082 | https://www.openstreetmap.org/way/671464082 | Chanel Island WLS |
| way | 22825674 | https://www.openstreetmap.org/way/22825674 | James Island WLS |
| way | 671573594 | https://www.openstreetmap.org/way/671573594 | Potanma Island WLS |
| way | 22825679 | https://www.openstreetmap.org/way/22825679 | Defence Island WLS |
| way | 640218730 | https://www.openstreetmap.org/way/640218730 | Montogemery Island WLS |
| relation | 9340731 | https://www.openstreetmap.org/relation/9340731 | Snake Island II WLS |
| way | 671580441 | https://www.openstreetmap.org/way/671580441 | Sandy Island WLS |
| way | 22825673 | https://www.openstreetmap.org/way/22825673 | Clyde Island WLS |
| way | 230733751 | https://www.openstreetmap.org/way/230733751 | Patric Island WLS |
| relation | 9493297 | https://www.openstreetmap.org/relation/9493297 | Pitman Island WLS |
| relation | 9340726 | https://www.openstreetmap.org/relation/9340726 | Sisters Island WLS |
| way | 228933434 | https://www.openstreetmap.org/way/228933434 | South Sentinel Island WLS |
| relation | 9426233 | https://www.openstreetmap.org/relation/9426233 | Tillongchong Island WLS |
| relation | 9339361 | https://www.openstreetmap.org/relation/9339361 | Cinque Islands WLS |
| relation | 10608778 | https://www.openstreetmap.org/relation/10608778 | Somawatiya Chaithya National Park |
| way | 671329181 | https://www.openstreetmap.org/way/671329181 | Batti Malv Island WLS |
| way | 678646971 | https://www.openstreetmap.org/way/678646971 | Pulicat Bird Sanctuary |
| relation | 19618488 | https://www.openstreetmap.org/relation/19618488 | Bhagwan Mahavir WLS ESZ (South) |
| relation | 19700961 | https://www.openstreetmap.org/relation/19700961 | Cotigao WLS ESZ |
| relation | 19619038 | https://www.openstreetmap.org/relation/19619038 | Netravali WLS ESZ |
| relation | 19618486 | https://www.openstreetmap.org/relation/19618486 | Bhagwan Mahavir WLS ESZ (North) |
| relation | 19618487 | https://www.openstreetmap.org/relation/19618487 | Mollem NP ESZ |
| relation | 9469703 | https://www.openstreetmap.org/relation/9469703 | Bhagwan Mahavir WLS |
| relation | 19618485 | https://www.openstreetmap.org/relation/19618485 | Mhadei WLS ESZ |
| relation | 19107893 | https://www.openstreetmap.org/relation/19107893 | Bondla WLS ESZ |
| relation | 19700103 | https://www.openstreetmap.org/relation/19700103 | Bhimgad WLS ESZ |
| relation | 19698389 | https://www.openstreetmap.org/relation/19698389 | Kali TR ESZ |
| relation | 19107931 | https://www.openstreetmap.org/relation/19107931 | Salim Ali Bird Sanctuary Eco-sensitive Zone |
| way | 677910591 | https://www.openstreetmap.org/way/677910591 | Pitti WLS (Bird) |
| way | 678501533 | https://www.openstreetmap.org/way/678501533 | Oussudu WLS |
| relation | 4808018 | https://www.openstreetmap.org/relation/4808018 | Megamalai WLS |
| relation | 18213394 | https://www.openstreetmap.org/relation/18213394 | Kataragama Sanctuary |
| relation | 18213411 | https://www.openstreetmap.org/relation/18213411 | Katagamuwa Sanctuary |
| way | 677822354 | https://www.openstreetmap.org/way/677822354 | Galathea Bay WLS |
| relation | 18145225 | https://www.openstreetmap.org/relation/18145225 | Kudumbigala Panama Sanctuary |
| relation | 18422607 | https://www.openstreetmap.org/relation/18422607 | Galoya Valley National Park |
| relation | 18488860 | https://www.openstreetmap.org/relation/18488860 | Sellakkaoya Sanctuary |
| way | 1481132992 | https://www.openstreetmap.org/way/1481132992 | Megapode Island WLS |
| relation | 20256454 | https://www.openstreetmap.org/relation/20256454 | Galathea National Park Eco-Sensitive Zone |
| way | 677823470 | https://www.openstreetmap.org/way/677823470 | Lohabarrack (Saltwater Crocodile) WLS |
| relation | 21115404 | https://www.openstreetmap.org/relation/21115404 | Koundinya WLS ESZ (Proposed) |
| relation | 21117309 | https://www.openstreetmap.org/relation/21117309 | Munnar Wildlife Zone ESZ (Proposed) |
| relation | 21123096 | https://www.openstreetmap.org/relation/21123096 | Sri Venkateswara Wildlife Sanctuary |
| relation | 21123095 | https://www.openstreetmap.org/relation/21123095 | Sri Venkateswara Wildlife ESZ (Proposed) |
| relation | 21127289 | https://www.openstreetmap.org/relation/21127289 | Kodaikanal WLS ESZ (Proposed) |
| relation | 21127130 | https://www.openstreetmap.org/relation/21127130 | Anamalai Tiger Reserve ESZ (Proposed) |
| relation | 21129053 | https://www.openstreetmap.org/relation/21129053 | Chimmony WLS ESZ (Proposed) |
| relation | 21127131 | https://www.openstreetmap.org/relation/21127131 | Anamalai Tiger Reserve Buffer Area |
| relation | 21129221 | https://www.openstreetmap.org/relation/21129221 | Peechi-Vazhani WLS ESZ (Proposed) |
| relation | 21132683 | https://www.openstreetmap.org/relation/21132683 | Sultanpur National Park ESZ |
| relation | 21130774 | https://www.openstreetmap.org/relation/21130774 | Karimpuzha Wildlife Sanctuary ESZ (Proposed) |
| relation | 21130740 | https://www.openstreetmap.org/relation/21130740 | Silent Valley National Park ESZ (Proposed) |
| way | 637356886 | https://www.openstreetmap.org/way/637356886 | Belle Island WLS |
| relation | 9474607 | https://www.openstreetmap.org/relation/9474607 | Dudhwa Tiger Reserve |
| relation | 21128925 | https://www.openstreetmap.org/relation/21128925 | Parambikulam Tiger Reserve ESZ (Proposed) |

<details>
<summary>QuickStatements: how to fix this on Wikidata</summary>

No Wikidata edit applies -- add the `wikidata` tag on the OpenStreetMap object once you've identified the matching Wikidata item.

</details>

## MoEF ↔ Wikidata joins

Linking each MoEF ESZ-notification record (`data/moef/esz-notifications.csv`) to its Wikidata/master-list item by name+state (see `scripts/lib/wikidata-match.js`).

### Summary

- **MoEF notification name matched multiple Wikidata items**: 9

### MoEF notification name matched multiple Wikidata items

The notification's name+state matched more than one distinct Wikidata item exactly -- typically one item's label and a different item's alias normalize to the same name once generic words like "Wildlife Sanctuary" are stripped. The tie is broken arbitrarily (array order, not evidence): every notification with this name gets linked to `pickedWikidataId`, and `tiedWikidataId` gets none, even if it's the more specific/correct item. Review by hand -- usually either a genuine Wikidata duplicate (merge the items on Wikidata) or a wrong alias on one item (fix on Wikidata); occasionally the tied item is a distinct, real place with a coincidentally identical name once stripped, which isn't fixable via a Wikidata edit.

| moefName | pickedWikidataId | pickedWikidataLabel | tiedWikidataId | tiedWikidataLabel |
| --- | --- | --- | --- | --- |
| Mehao Wildlife Sanctuary; Mehao WLS | Q16895017 | Mehao Wildlife Sanctuary | Q107324541 | Mehao Wildlife Sanctuary |
| Marine National Park; Marine Sanctuary | Q60398704 | Marine Sanctuary (Gulf of Kutch) | Q2724481 | Marine National Park, Gulf of Kutch |
| Thol Wildlife Sanctuary | Q7786672 | Thol Wildlife Sanctuary | Q7786671 | Thol Lake |
| Khijadia Wildlife Sanctuary | Q2730580 | Khijadiya Bird Sanctuary | Q105944439 | Khijadia Bird Sanctuary |
| Dandeli Wildlife Sanctuary | Q5215675 | Anshi National Park | Q5215676 | Dandeli Wildlife Sanctuary |
| Shendurney Wildlife Sanctuary; Shendurney WLS | Q7494223 | Shendurney Wildlife Sanctuary | Q26794312 | Shendurney Wildlife Reserve |
| Kheoni Wildlife Sanctuary | Q106618190 | Kheoni Wildlife Sanctuary | Q55615923 | Kheoni Wildlife Sanctuary |
| Ralamandal Wildlife Sanctuary | Q65041648 | Ralamandal Wildlife Sanctuary | Q106618225 | Ralamandal Sanctuary |
| Bhitarkanika National Park; Bhitarkanika Wildlife Sanctuary | Q2580141 | Bhitarkanika National Park | Q106674990 | Bhitarkanika Wildlife Sanctuary |
