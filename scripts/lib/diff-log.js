// Shared "what changed since last run" reporting for the enrich:* scripts.
// Each script loads its previous on-disk state, computes the new state, and
// calls logDiff() before overwriting -- so every run reports how many
// records actually changed (not just how many were looked up/matched/cached)
// and, for QA, a direct link to each changed record so a human doesn't have
// to re-diff the output file by hand to find what's worth double-checking.

// Deep-compares two same-keyed record sets. `keyFn` must return a value
// that's stable across runs (an id, or a composite of fields that together
// identify one row) -- reordering between runs (e.g. a re-sorted cache, or
// SPARQL results coming back in a different order) must never look like an
// add+remove pair, only an actual content change should.
export function diffByKey(before, after, keyFn) {
  const beforeMap = new Map(before.map((r) => [keyFn(r), r]));
  const afterMap = new Map(after.map((r) => [keyFn(r), r]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [key, afterRow] of afterMap) {
    const beforeRow = beforeMap.get(key);
    if (beforeRow === undefined) {
      added.push(afterRow);
      continue;
    }
    if (JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) changed.push(afterRow);
  }
  for (const [key, beforeRow] of beforeMap) {
    if (!afterMap.has(key)) removed.push(beforeRow);
  }
  return { added, removed, changed };
}

// `describe(record)` renders one changed/added/removed record as a short
// "name -> QA link(s)" string. Only entries that actually changed are logged
// individually (per-record output would be noise on an unchanged run, and is
// exactly what this is meant to save a human from re-deriving by hand).
export function logDiff(label, diff, describe) {
  const total = diff.added.length + diff.removed.length + diff.changed.length;
  console.log(`${label}: ${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed since last run.`);
  if (total === 0) return;
  for (const r of diff.added) console.log(`  + ${describe(r)}`);
  for (const r of diff.changed) console.log(`  ~ ${describe(r)}`);
  for (const r of diff.removed) console.log(`  - ${describe(r)}`);
}
