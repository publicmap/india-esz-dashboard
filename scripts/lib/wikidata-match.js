// Fuzzy name+state matcher for linking an external record (a MoEF notification
// or a Wikipedia protected-area list entry) to its Wikidata item. Shared by
// enrich-wikidata.js (MoEF join) and wikipedia-qa.js (Wikipedia join) so both
// joins use identical matching rules against the same Wikidata item list.
import { normalizeName, compactName, similarity } from './name-match.js';

export function normalizeState(state) {
  if (!state) return '';
  let s = state.toLowerCase();
  s = s.replace(/&/g, ' and ');
  s = s.replace(/\b(district|division|state|ut|taluka|block|islands?|community development block|grama panchayat)\b/g, ' ');
  s = s.replace(/[.,()'"]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

export function statesAgree(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function dedupeItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item.wikidataId)) continue;
    seen.add(item.wikidataId);
    out.push(item);
  }
  return out;
}

// Prefers a candidate whose state agrees with the record's, but -- unlike a
// plain find-with-fallback -- refuses to silently hand back a candidate whose
// state is known and DISAGREES just because it's the only one in the bucket.
// A same-normalized-name collision across unrelated items in different
// states does happen (e.g. two different sanctuaries both named after the
// same person, one via a label and one only via an alias), so an
// exact-name bucket isn't proof they're the same place. Returns { pick: null }
// when every candidate with a known state disagrees, so the caller can fall
// through to the fuzzy tier (which applies the same veto) rather than
// forcing a wrong match.
//
// When more than one *distinct* item survives the state check, that's a real
// ambiguity -- two different Wikidata items whose name (label or alias)
// collides once generic PA words are stripped, both plausible for this
// record's state -- and picking the first one (array order, not evidence) is
// arbitrary. Rather than silently doing that, `tied` carries the other
// candidate(s) so the caller can flag the tie instead of swallowing it (see
// e.g. Q3696260 "Palani Hills Wildlife Sanctuary and National Park", aliased
// "Kodaikanal Wildlife Sanctuary", colliding with Q131123428's own label
// "Kodaikanal Wildlife Sanctuary" -- both Tamil Nadu).
function pickByState(candidates, normRecordState) {
  const unique = dedupeItems(candidates);
  const agrees = (c) => c.state.some((a) => statesAgree(normalizeState(a), normRecordState));
  const agreeing = unique.filter(agrees);
  if (agreeing.length > 0) return { pick: agreeing[0], tied: agreeing.slice(1) };
  const viable = unique.filter((c) => c.state.length === 0);
  return { pick: viable[0] ?? null, tied: viable.slice(1) };
}

// A candidate name that scores against the record's name -- either an item's
// primary label or one of its Wikidata aliases (e.g. "Madei Wildlife
// Sanctuary" is a registered en alias of Q6826847, whose label is "Mhadei
// Wildlife Sanctuary" -- close enough by edit distance, but at 5 characters
// it's too short to clear the no-containment length floor below).
function scoreCandidateName(normRecordName, candidateName, stateAgrees) {
  const shorterLen = Math.min(normRecordName.length, candidateName.length);
  const isContainment = candidateName.includes(normRecordName) || normRecordName.includes(candidateName);
  if (isContainment) {
    // No length floor: a short name (e.g. "Nagi" in "Nagi Dam Bird
    // Sanctuary") appearing verbatim as a whole prefix/suffix of the
    // other is meaningful regardless of length.
    const nameScore = shorterLen / Math.max(normRecordName.length, candidateName.length);
    return nameScore >= (stateAgrees ? 0.5 : 0.7) ? nameScore : null;
  }
  // Edit-distance-only matches on short strings are exactly the
  // coincidence risk ("Tale"/"Kane" scores 0.5, a hypothetical
  // single-letter-typo 4-letter pair would score 0.75) -- require
  // enough length that a passing score reflects a real typo, not luck.
  if (shorterLen < 6) return null;
  const nameScore = similarity(normRecordName, candidateName);
  return nameScore >= (stateAgrees ? 0.7 : 0.85) ? nameScore : null;
}

// Returns a `match(name, state) -> { item, matchConfidence, tiedItems }`
// function closed over an index of wikidataItems, for linking an external
// (name, state) pair to its best Wikidata item. matchConfidence is 'exact' |
// 'fuzzy' | 'none'. `tiedItems` is only non-empty for an 'exact' match where
// more than one distinct Wikidata item tied on name+state (see pickByState) --
// the returned `item` is still just the (arbitrary) first one.
export function buildMatcher(wikidataItems) {
  const byNormName = new Map();
  const byCompactName = new Map();
  const index = (map, key, item) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  };
  for (const item of wikidataItems) {
    index(byNormName, item.normalizedName, item);
    index(byCompactName, item.compactName, item);
    item.normalizedAliases.forEach((n) => index(byNormName, n, item));
    item.compactAliases.forEach((n) => index(byCompactName, n, item));
  }

  return function match(recordName, recordState) {
    const normRecordName = normalizeName(recordName);
    const compactRecordName = compactName(normRecordName);
    const normRecordState = normalizeState(recordState);
    if (!normRecordName) return { item: null, matchConfidence: 'none', tiedItems: [] };

    const exact = byNormName.get(normRecordName) ?? [];
    const exactResult = pickByState(exact, normRecordState);
    if (exactResult.pick) return { item: exactResult.pick, matchConfidence: 'exact', tiedItems: exactResult.tied };
    // Same name once whitespace/hyphens are ignored (e.g. "Eaglenest" vs
    // "Eagle Nest") -- still an exact match, just a spacing variant.
    const compactExact = byCompactName.get(compactRecordName) ?? [];
    const compactExactResult = pickByState(compactExact, normRecordState);
    if (compactExactResult.pick) {
      return { item: compactExactResult.pick, matchConfidence: 'exact', tiedItems: compactExactResult.tied };
    }

    // Fuzzy tier. Two structurally different kinds of near-match need two
    // different bars:
    //  - Containment (one name is a clean, whole substring of the other --
    //    e.g. "Pulicat" in "Pulicat Lake Bird Sanctuary", "Sri Penusila" in
    //    "Sri Penusila Narasimha ...") is strong structural evidence even at
    //    a fairly low length ratio, since the shorter name appears verbatim.
    //  - A same-length-ish edit-distance match with NO containment (typos:
    //    Kambalakonda/Kambalkonda, Venkateswara/Venkateshwara) needs a much
    //    higher similarity bar, because short unrelated words can coincidentally
    //    score just as "similar" this way -- e.g. "Tale"/"Kane" and
    //    "Ramnagar"/"Ramsagar" both score >=0.5 despite being different places.
    // A confirmed state disagreement is a hard veto either way (the record's
    // own state column is independent, reliable ground truth); when Wikidata
    // has no resolved state for the item at all, both bars are raised instead.
    // Both kinds of candidate are pooled into one ranking by score (not
    // "containment always wins"): a containment match can still be a worse
    // candidate than an edit-distance one when it only explains a weak
    // fraction of the name (e.g. "Cauvery" contained in "Talacauvery" scores
    // lower than "Talacauvery" ~ "Talakaveri" by edit distance, correctly).
    let best = null;
    let bestScore = 0;
    for (const item of wikidataItems) {
      const candidateNames = item.normalizedName
        ? [item.normalizedName, ...item.normalizedAliases]
        : item.normalizedAliases;
      if (candidateNames.length === 0) continue;
      const stateKnown = item.state.length > 0;
      const stateAgrees = stateKnown && item.state.some((a) => statesAgree(normalizeState(a), normRecordState));
      if (stateKnown && !stateAgrees) continue;

      // An item can match through its label or any alias; take whichever
      // candidate name scores best (e.g. "Madei" vs. an item labelled
      // "Mhadei" but aliased "Madei Wildlife Sanctuary").
      let itemBestNameScore = null;
      for (const candidateName of candidateNames) {
        const nameScore = scoreCandidateName(normRecordName, candidateName, stateAgrees);
        if (nameScore !== null && (itemBestNameScore === null || nameScore > itemBestNameScore)) {
          itemBestNameScore = nameScore;
        }
      }
      if (itemBestNameScore === null) continue;

      const score = itemBestNameScore + (stateAgrees ? 0.25 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best
      ? { item: best, matchConfidence: 'fuzzy', tiedItems: [] }
      : { item: null, matchConfidence: 'none', tiedItems: [] };
  };
}
