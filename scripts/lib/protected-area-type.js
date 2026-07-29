// Shared protected-area-type classifier used by both the MoEF parser (against
// notification text) and the Wikidata enrichment step (against item labels),
// so a Wikidata-only row (no MoEF match) still gets a type instead of blank.
//
// Order matters: checked top to bottom, first match wins. "Wildlife Sanctuary"
// is the catch-all fallback since the source data is riddled with typos and
// abbreviations for it (WLS, "Wild ...", "Santuary").
const PA_TYPE_RULES = [
  { type: 'Tiger Reserve', pattern: /\btiger/i },
  { type: 'National Park', pattern: /\bnp\b|national/i },
  { type: 'Bird Sanctuary', pattern: /\bbird/i },
  { type: 'Wildlife Sanctuary', pattern: /\bwls\b|\bwild|santuary|sanctuary/i },
];

export function classifyProtectedAreaType(text) {
  if (!text) return null;
  for (const rule of PA_TYPE_RULES) {
    if (rule.pattern.test(text)) return rule.type;
  }
  return null;
}
