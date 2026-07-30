# scripts/plugins

Standalone, ad-hoc scripts for filling gaps in `data/wikidata-protected-areas.csv` that
aren't part of the regular `npm run update` pipeline. Run manually, review the output,
then paste QuickStatements batches in by hand — never applied automatically.

## quickstatements-from-wikilinks.js

Suggests a value for a Wikidata property (e.g. `P131`, "located in the administrative
territorial entity") for rows that are missing it, by reading each item's English
Wikipedia lead section, following the wikilinks in it, and checking whether a linked
article's own Wikidata item is an instance/subclass of a type you're looking for (e.g. a
link to "Telangana" qualifies as a state because its item is an instance of "state of
India").

It never edits Wikidata directly. It writes an enriched CSV with a suggestion + evidence
per row, plus an optional plain-text QuickStatements batch for the rows it's confident
about, for a human to paste into [quickstatements.toolforge.org](https://quickstatements.toolforge.org/)
after spot-checking.

### Basic usage

```
node scripts/plugins/quickstatements-from-wikilinks.js \
  --input data/wikidata-protected-areas.csv \
  --output data/wikidata-protected-areas.state-suggestions.csv \
  --qs-output data/wikidata-protected-areas.state.qs.txt \
  --property P131 \
  --property-label state \
  --target-types Q12443800,Q467745 \
  --filter-column state
```

This fills the `state` column: only rows where `state` is empty are processed
(`--filter-column`), and a linked article counts as a match only if its Wikidata item is
a state (`Q12443800`) or union territory (`Q467745`) of India.

### `--target-types` is a priority list, not a flat set

List QIDs **from most specific to least specific**. When a lead's wikilinks resolve to
items at more than one tier (e.g. one link to a district, another to a state), the most
specific tier found *anywhere in the lead* wins outright — position in the lead only
breaks ties *within* that winning tier. This matters because P131 should generally point
to the smallest known containing entity, not skip straight to the state.

For example, to fill `locatedInAdminTerritorialEntity` preferring subdistrict > district >
union territory > state:

```
node scripts/plugins/quickstatements-from-wikilinks.js \
  --input data/wikidata-protected-areas.csv \
  --output data/wikidata-protected-areas.locatedInAdminTerritorialEntity-suggestions.csv \
  --qs-output data/wikidata-protected-areas.locatedInAdminTerritorialEntity.qs.txt \
  --property P131 \
  --property-label locatedInAdminTerritorialEntity \
  --target-types Q105626471,Q1149652,Q467745,Q12443800 \
  --filter-column locatedInAdminTerritorialEntity
```

(`Q105626471` subdistrict of India, `Q1149652` district of India, `Q467745` union
territory of India, `Q12443800` state of India.)

A candidate matches a tier if its item is an instance of (transitively via `P31`/`P279*`)
**or** itself a transitive subclass (via `P279*`) of that tier's QID — some Wikidata items
for administrative divisions are modeled as classes rather than instances.

The script isn't specific to states/districts — for a different property, pass whatever
`--target-types` hierarchy applies (e.g. `P17` + country QIDs, `P206` + body-of-water
QIDs).

### Reading the output

Each row gets these columns added (prefixed with `--property-label`, e.g. `state...`):

| Column | Meaning |
| --- | --- |
| `...SuggestedQid` / `...SuggestedLabel` | The suggested value and its label |
| `...Confidence` | `high` / `medium` / `low` / `none` — see below |
| `...Evidence` | Human-readable explanation, e.g. `wikilink #2 in the lead, "Uttarakhand" (Q1499), is an instance of "state of India" (Q12443800)` |
| `...SuggestedSentence` | The actual lead sentence the suggestion came from, for QA without opening the article |
| `quickstatement` | A ready-to-paste QuickStatements v1 line, only populated at/above `--min-confidence` |

Confidence, from strongest to weakest:

- **high** — the very first wikilink in the lead resolves to a matching item
- **medium** — some later wikilink resolves to a matching item (still unambiguous)
- **low** — the lead links to more than one *different* matching item at the winning tier (ambiguous — a human should pick)
- **none** — no wikilink resolved to a matching item (no enwiki article, no wikilinks, or none matched)

Only rows at/above `--min-confidence` (default: `medium`) get a `quickstatement` value —
`low`/`none` rows are still surfaced with their best guess and evidence so a human can
adjudicate manually, but the script never emits a statement it isn't reasonably sure of.

Every emitted `quickstatement` line carries a `S143` (imported from Wikimedia project)
reference to `Q328` (English Wikipedia), recording where the value came from.

### All flags

| Flag | Required | Meaning |
| --- | --- | --- |
| `--input` | yes | Source CSV |
| `--output` | yes | Enriched CSV (all input columns + suggestion columns + `quickstatement`) |
| `--property` | yes | Wikidata property ID to fill in, e.g. `P131` |
| `--target-types` | yes | Comma-separated QIDs, most-specific first (see above) |
| `--property-label` | no | Column-name prefix for the suggestion columns (default: `--property`, lowercased) |
| `--id-column` | no | Column holding the row's Wikidata QID (default: `wikidataId`) |
| `--wiki-url-column` | no | Column holding the row's enwiki URL (default: `enwikiUrl`); resolved from the item's Wikidata sitelinks when empty |
| `--filter-column` | no | Only process rows where this column is empty (omit to process every row) |
| `--min-confidence` | no | `none`\|`low`\|`medium`\|`high` (default: `medium`) — minimum tier to emit a `quickstatement` |
| `--qs-output` | no | Path to also write a plain QuickStatements v1 TSV batch (one line per confident row, no header) |

### Workflow

1. Run the script for the property/column you're filling.
2. Open `--output` and skim the `...Evidence` / `...SuggestedSentence` columns, especially
   for `low` confidence rows — these need a human decision, not just a rubber stamp.
3. Paste the contents of `--qs-output` into [quickstatements.toolforge.org](https://quickstatements.toolforge.org/)
   to apply the `high`/`medium` (or whatever `--min-confidence` was set to) edits to
   Wikidata.
4. Re-run `npm run enrich:wikidata` (or the full `npm run update`) so the newly-filled
   Wikidata values flow back into `data/wikidata-protected-areas.csv`.
