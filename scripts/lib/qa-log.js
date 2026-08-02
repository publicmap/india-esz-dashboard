// Shared markdown renderer for data/wikidata/qa-log.md. Both wikipedia-qa.js
// and osm-qa.js produce the same shape -- a flat list of cross-reference
// passes, each a list of { title, description, columns, rows, quickStatements }
// sections -- and this renders them as one document, grouped under a heading
// per pass (e.g. "Wikidata <-> Wikipedia joins", "Wikidata <-> OSM joins").
// `quickStatements` (see scripts/lib/quickstatements.js) is optional, data-only
// (`{ note: string[], lines: string[] }`) -- this is the one place that turns
// it into the collapsed <details> block, so every section renders it
// identically.

function renderQuickStatementsDetails(quickStatements) {
  const { note = [], lines = [] } = quickStatements;
  const out = ['<details>', '<summary>QuickStatements: how to fix this on Wikidata</summary>', ''];
  for (const n of note) {
    out.push(n);
    out.push('');
  }
  if (lines.length > 0) {
    out.push('Paste as a new batch at <https://quickstatements.toolforge.org/> (mode: v1, tab-separated) -- review every line first; these are suggestions, not verified edits:');
    out.push('');
    out.push('```');
    out.push(...lines);
    out.push('```');
    out.push('');
  }
  out.push('</details>');
  out.push('');
  return out;
}

function renderSection(section, level) {
  const lines = [];
  lines.push(`${'#'.repeat(level)} ${section.title}`);
  lines.push('');
  if (section.description) {
    lines.push(section.description);
    lines.push('');
  }
  if (section.rows.length === 0) {
    lines.push('None.');
    lines.push('');
    return lines;
  }
  lines.push(`| ${section.columns.join(' | ')} |`);
  lines.push(`| ${section.columns.map(() => '---').join(' | ')} |`);
  for (const row of section.rows) {
    lines.push(`| ${section.columns.map((c) => (row[c] ?? '').toString().replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  lines.push('');
  if (section.quickStatements) lines.push(...renderQuickStatementsDetails(section.quickStatements));
  return lines;
}

// groups: [{ title, description?, sections: [{title, description?, columns, rows}] }]
export function renderQaLog(groups, generatedAt) {
  const lines = [];
  lines.push('# Protected-area QA log');
  lines.push('');
  lines.push(`Generated ${generatedAt} by \`scripts/enrich-wikidata.js\`.`);
  lines.push('');
  for (const group of groups) {
    lines.push(`## ${group.title}`);
    lines.push('');
    if (group.description) {
      lines.push(group.description);
      lines.push('');
    }
    if (group.sections.length === 0) continue;
    lines.push('### Summary');
    lines.push('');
    for (const s of group.sections) lines.push(`- **${s.title}**: ${s.rows.length}`);
    lines.push('');
    for (const s of group.sections) lines.push(...renderSection(s, 3));
  }
  return lines.join('\n');
}
