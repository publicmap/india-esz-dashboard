// Cross-references the Wikidata Indian-protected-area list against the OSM
// cache (data/osm/protected-areas.{csv,geojson}, written by enrich-osm.js):
//
//  1. Fills in a missing OSM reference on a Wikidata item (osmId/osmType/
//     osmUrl/osmName) from the OSM object's own `wikidata` tag, whenever
//     Wikidata's own P402 (OSM relation id) claim is absent or doesn't
//     resolve against the cache -- this is the "add missing references"
//     half of the task.
//  2. Returns QA sections (rendered into data/wikidata/qa-log.md by
//     qa-log.js, alongside wikipedia-qa.js's sections) covering everything
//     that doesn't line up cleanly, for human validation/data-fixing on
//     either side:
//       - OSM objects whose `wikidata` tag is outdated (points to a
//         redirect, a deleted item, or an item not in our Indian
//         protected-area list)
//       - Wikidata items whose P402 OSM relation id is outdated (not found
//         in the OSM cache, or found but the name disagrees)
//       - Matched pairs where the Wikidata coordinate falls outside the
//         OSM polygon geometry (with the distance to the polygon boundary)
//       - Matched pairs with low name-match confidence
//       - Objects with no match at all on either side
import { osmKey } from './osm-cache.js';
import { normalizeName, similarity } from './name-match.js';
import {
  reviewOnlyDetails,
  p402RemovalQuickStatements,
  coordinateCorrectionQuickStatements,
} from './quickstatements.js';

// Strips everything but letters/digits (no generic-PA-word stripping,
// unlike normalizeName). Exists solely to catch names that differ only in
// whitespace/compounding (e.g. Wikidata's "Kanha National Park" vs OSM's
// "Kanha Nationalpark") which the generic-word-stripping regex in
// normalizeName -- which requires a literal space, e.g. "national park" --
// otherwise fails to line up, since one side loses the suffix and the
// other doesn't and a spurious low containment-ratio score results.
function rawCompact(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
import { haversineDistanceMeters, pointInGeometry, distanceToPolygonBoundaryMeters } from './geo.js';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'india-esz-dashboard-bot/1.0 (https://github.com/publicmap/india-esz-dashboard)';
const WIKIDATA_BATCH_SIZE = 50;

// Below this name-similarity score, an id-based match (whether sourced from
// Wikidata's P402 or OSM's wikidata tag) gets flagged for human review --
// matching ids is not proof the link is correct, since either side's id can
// simply be mistyped/miskeyed.
const LOW_CONFIDENCE_NAME_SCORE = 0.5;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Resolves a batch of Wikidata QIDs to { missing, redirectsTo } via the
// plain MediaWiki query API (not wbgetentities): it's the only endpoint that
// reports redirects explicitly (query.redirects: [{from, to}]) rather than
// silently returning the merged target with no way to tell a redirect
// happened.
async function resolveWikidataIds(qids) {
  const result = new Map();
  for (const batch of chunk(qids, WIKIDATA_BATCH_SIZE)) {
    if (batch.length === 0) continue;
    const url = `${WIKIDATA_API}?action=query&prop=info&redirects=1&format=json&formatversion=2&titles=${batch.join('|')}`;
    let json;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
    } catch (err) {
      for (const q of batch) result.set(q, { missing: null, redirectsTo: null, error: err.message });
      continue;
    }
    const redirectTo = new Map((json.query.redirects || []).map((r) => [r.from, r.to]));
    for (const q of batch) {
      if (!result.has(q)) result.set(q, { missing: false, redirectsTo: redirectTo.get(q) ?? null });
    }
    for (const page of json.query.pages || []) {
      if (page.missing && !redirectTo.has(page.title)) {
        result.set(page.title, { missing: true, redirectsTo: null });
      }
    }
  }
  return result;
}

// Best name-similarity between a Wikidata item (label + aliases) and an OSM
// object (name + name:en), 0..1. Containment (either name a whole substring
// of the other) counts as a strong match at any length.
function nameMatchScore(wikidataItem, osmFeature) {
  const wikidataRawNames = [wikidataItem.wikidataLabel, ...(wikidataItem.aliases || [])].filter(Boolean);
  const osmRawNames = [osmFeature.name, osmFeature.nameEn].filter(Boolean);
  const wikidataNames = wikidataRawNames.map(normalizeName).filter(Boolean);
  const osmNames = osmRawNames.map(normalizeName).filter(Boolean);
  let best = 0;
  for (const wName of wikidataNames) {
    for (const oName of osmNames) {
      const isContainment = wName.includes(oName) || oName.includes(wName);
      const score = isContainment
        ? Math.min(wName.length, oName.length) / Math.max(wName.length, oName.length)
        : similarity(wName, oName);
      if (score > best) best = score;
    }
  }
  // Fall back to a whitespace-insensitive exact-equality check on the raw
  // (non-generic-word-stripped) names, so "Kanha National Park" still lines
  // up with "Kanha Nationalpark" even though normalizeName's generic-word
  // regex only strips the former (it requires a literal space).
  for (const wName of wikidataRawNames) {
    for (const oName of osmRawNames) {
      if (rawCompact(wName) === rawCompact(oName) && rawCompact(wName).length > 0) best = 1;
    }
  }
  return best;
}

function pickOsmMatch(item, osmCache) {
  for (const relId of item.osmRelationIds || []) {
    const key = osmKey('relation', relId);
    if (osmCache.byOsmKey.has(key)) return { feature: osmCache.byOsmKey.get(key), source: 'wikidata-p402' };
  }
  const reverse = osmCache.byWikidataId.get(item.wikidataId) || [];
  if (reverse.length === 1) return { feature: reverse[0], source: 'osm-wikidata-tag' };
  if (reverse.length > 1) {
    const feature = reverse.find((f) => f.osmType === 'relation') || reverse[0];
    return { feature, source: 'osm-wikidata-tag-ambiguous', alternates: reverse.filter((f) => f !== feature) };
  }
  return null;
}

// Mutates each wikidataItem in place, adding osmId/osmType/osmUrl/osmName/
// osmMatchSource. Returns the list of matches (for the QA pass below) plus
// items with no OSM match at all.
function crossReference(wikidataItems, osmCache) {
  const matches = [];
  const unmatchedWikidata = [];
  for (const item of wikidataItems) {
    const picked = pickOsmMatch(item, osmCache);
    if (picked) {
      item.osmId = picked.feature.osmId;
      item.osmType = picked.feature.osmType;
      item.osmUrl = picked.feature.osmUrl;
      item.osmName = picked.feature.name;
      item.osmMatchSource = picked.source;
      matches.push({ item, feature: picked.feature, source: picked.source, alternates: picked.alternates });
    } else {
      item.osmId = null;
      item.osmType = null;
      item.osmUrl = null;
      item.osmName = null;
      item.osmMatchSource = null;
      unmatchedWikidata.push(item);
    }
  }
  return { matches, unmatchedWikidata };
}

function fmtDistance(meters) {
  if (meters == null) return 'n/a';
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
}

// Runs the full OSM<->Wikidata cross-reference + QA pass. Mutates
// wikidataItems in place (see crossReference above) so the caller can write
// them out with the new osm* fields included. Returns the QA sections (for
// qa-log.js to render) plus summary stats; does not write anything itself.
export async function crossReferenceOsm(wikidataItems, osmCache) {
  const { matches, unmatchedWikidata } = crossReference(wikidataItems, osmCache);

  // -- OSM objects whose wikidata tag doesn't resolve into our list --
  const wikidataIdSet = new Set(wikidataItems.map((i) => i.wikidataId));
  const osmOnlyQids = new Map(); // qid -> [osm feature, ...]
  for (const f of osmCache.features) {
    for (const qid of f.wikidataIds) {
      if (wikidataIdSet.has(qid)) continue;
      if (!osmOnlyQids.has(qid)) osmOnlyQids.set(qid, []);
      osmOnlyQids.get(qid).push(f);
    }
  }
  const resolved = await resolveWikidataIds([...osmOnlyQids.keys()]);

  const osmWikidataOutdated = [];
  for (const [qid, features] of osmOnlyQids) {
    const info = resolved.get(qid) || {};
    let detail;
    if (info.error) detail = `Wikidata lookup failed: ${info.error}`;
    else if (info.redirectsTo) {
      detail = wikidataIdSet.has(info.redirectsTo)
        ? `Redirects to ${info.redirectsTo}, which IS in our Indian protected-area list -- update the OSM wikidata tag to ${info.redirectsTo}.`
        : `Redirects to ${info.redirectsTo}, which is also not in our Indian protected-area list.`;
    } else if (info.missing) {
      detail = 'Wikidata item does not exist (deleted) -- OSM wikidata tag is stale.';
    } else {
      detail = 'Valid Wikidata item, but not present in our fetched Indian protected-area list (check its P31 type / P17 country, or it may genuinely not be a protected area).';
    }
    for (const f of features) {
      osmWikidataOutdated.push({
        wikidata: qid,
        osmType: f.osmType,
        osmId: f.osmId,
        osmUrl: f.osmUrl,
        name: f.name,
        detail,
      });
    }
  }

  // -- Wikidata items whose P402 OSM relation id doesn't resolve --
  const wikidataOsmOutdated = [];
  for (const item of wikidataItems) {
    for (const relId of item.osmRelationIds || []) {
      const key = osmKey('relation', relId);
      const feature = osmCache.byOsmKey.get(key);
      if (!feature) {
        wikidataOsmOutdated.push({
          wikidataId: item.wikidataId,
          wikidataLabel: item.wikidataLabel,
          osmRelationId: relId,
          detail: 'Relation not found in OSM cache (deleted/renumbered on OSM, or outside the query bbox).',
        });
        continue;
      }
      const backLinks = feature.wikidataIds;
      if (backLinks.length > 0 && !backLinks.includes(item.wikidataId)) {
        wikidataOsmOutdated.push({
          wikidataId: item.wikidataId,
          wikidataLabel: item.wikidataLabel,
          osmRelationId: relId,
          detail: `OSM relation ${relId}'s own wikidata tag points elsewhere (${backLinks.join('; ')}) -- bidirectional link mismatch.`,
        });
      }
    }
  }

  // -- Matched-pair coordinate + name-confidence checks --
  const coordinateOutsidePolygon = [];
  const lowConfidenceMatches = [];
  const ambiguousMatches = [];
  for (const { item, feature, source, alternates } of matches) {
    if (source === 'osm-wikidata-tag-ambiguous') {
      ambiguousMatches.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        pickedOsmUrl: feature.osmUrl,
        otherOsmUrls: (alternates || []).map((a) => a.osmUrl).join('; '),
        detail: 'Multiple OSM objects tag this same wikidata id -- picked the relation (or first) arbitrarily; verify which is the primary boundary.',
      });
    }

    const score = nameMatchScore(item, feature);
    if (score < LOW_CONFIDENCE_NAME_SCORE) {
      lowConfidenceMatches.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        osmUrl: feature.osmUrl,
        osmName: feature.name,
        matchSource: source,
        nameScore: score.toFixed(2),
      });
    }

    if (item.coordinateLatitude == null || item.coordinateLongitude == null) continue;
    const geometry = osmCache.geometryByKey.get(osmKey(feature.osmType, feature.osmId));
    if (!geometry) continue;
    const inside = pointInGeometry(item.coordinateLongitude, item.coordinateLatitude, geometry);
    if (!inside) {
      const boundaryDistance = distanceToPolygonBoundaryMeters(
        item.coordinateLongitude,
        item.coordinateLatitude,
        geometry,
      );
      const centroidDistance = (feature.centroidLat != null && feature.centroidLon != null)
        ? haversineDistanceMeters(
          { lat: item.coordinateLatitude, lon: item.coordinateLongitude },
          { lat: feature.centroidLat, lon: feature.centroidLon },
        )
        : null;
      coordinateOutsidePolygon.push({
        wikidataId: item.wikidataId,
        wikidataLabel: item.wikidataLabel,
        osmUrl: feature.osmUrl,
        distanceToBoundary: fmtDistance(boundaryDistance),
        distanceToCentroid: fmtDistance(centroidDistance),
        // Not rendered as a table column (see qa-log.js's column-driven
        // render) -- carried only so coordinateCorrectionQuickStatements can
        // emit a P625 value without re-deriving it from the formatted
        // distance strings above.
        centroidLat: feature.centroidLat ?? null,
        centroidLon: feature.centroidLon ?? null,
      });
    }
  }

  // -- OSM objects with a wikidata tag that never gets picked as any item's
  // match (e.g. an ambiguous-duplicate that lost the tie-break) don't need
  // their own section -- they're covered by ambiguousMatches above. This
  // section is instead every OSM object with NO wikidata tag at all, so a
  // human can go tag it.
  const osmWithoutWikidataTag = osmCache.features
    .filter((f) => f.wikidataIds.length === 0)
    .map((f) => ({
      osmType: f.osmType, osmId: f.osmId, osmUrl: f.osmUrl, name: f.name || '(no name tag)',
    }));

  const sections = [
    {
      title: 'Wikidata items with no OSM match',
      description: 'No OSM object references this wikidata id via P402, and no OSM object tags this id back -- likely missing from OSM entirely, or mapped without a wikidata tag.',
      columns: ['wikidataId', 'wikidataLabel'],
      rows: unmatchedWikidata.map((i) => ({ wikidataId: i.wikidataId, wikidataLabel: i.wikidataLabel })),
      quickStatements: reviewOnlyDetails(
        'No Wikidata edit applies -- this is a gap on the OSM side (the boundary either isn\'t mapped at all, or is mapped without a `wikidata` tag). Map it or add the tag on OpenStreetMap; nothing to fix on Wikidata itself.',
      ),
    },
    {
      title: 'OSM wikidata tag outdated',
      description: 'OSM `wikidata` tag value is a redirect, deleted, or not found in our fetched Indian protected-area list.',
      columns: ['wikidata', 'osmType', 'osmId', 'osmUrl', 'name', 'detail'],
      rows: osmWikidataOutdated,
      quickStatements: reviewOnlyDetails(
        'The fix here is an edit to OpenStreetMap\'s `wikidata` tag, not to Wikidata -- QuickStatements can\'t help. When the detail column says "Redirects to X, which IS in our list", retag the OSM object to X. When Wikidata\'s side of a redirect needs cleanup instead (e.g. a genuine duplicate item), merge the items on Wikidata by hand -- QuickStatements doesn\'t do merges either.',
      ),
    },
    {
      title: 'Wikidata P402 (OSM relation) outdated',
      description: 'Wikidata\'s own OSM-relation-id claim (P402) does not resolve cleanly against the OSM cache.',
      columns: ['wikidataId', 'wikidataLabel', 'osmRelationId', 'detail'],
      rows: wikidataOsmOutdated,
      quickStatements: p402RemovalQuickStatements(wikidataOsmOutdated),
    },
    {
      title: 'Wikidata coordinate outside OSM polygon',
      description: 'The matched pair\'s Wikidata coordinate (P625) falls outside the OSM boundary geometry.',
      columns: ['wikidataId', 'wikidataLabel', 'osmUrl', 'distanceToBoundary', 'distanceToCentroid'],
      rows: coordinateOutsidePolygon,
      quickStatements: coordinateCorrectionQuickStatements(coordinateOutsidePolygon),
    },
    {
      title: 'Low name-match confidence',
      description: `Matched pair (by id) whose names score below ${LOW_CONFIDENCE_NAME_SCORE} similarity -- the id link may itself be wrong on one side.`,
      columns: ['wikidataId', 'wikidataLabel', 'osmUrl', 'osmName', 'matchSource', 'nameScore'],
      rows: lowConfidenceMatches,
      quickStatements: reviewOnlyDetails(
        'No mechanical fix -- a low name-similarity score on an id-based match just means one side\'s id could be mistyped/miskeyed, not which side. Check whether Wikidata\'s P402 or OSM\'s `wikidata` tag is the wrong one (see the two P402/wikidata-tag-outdated sections above) before editing either.',
      ),
    },
    {
      title: 'Ambiguous OSM wikidata-tag matches',
      description: 'More than one OSM object tags the same wikidata id.',
      columns: ['wikidataId', 'wikidataLabel', 'pickedOsmUrl', 'otherOsmUrls', 'detail'],
      rows: ambiguousMatches,
      quickStatements: reviewOnlyDetails(
        'No Wikidata edit applies -- this is a many-OSM-objects-to-one-wikidata-id conflict, resolved by retagging the wrong OSM object(s) with the correct id (or removing the tag if it\'s simply a duplicate boundary on OSM). Requires picking which OSM object is the real one first.',
      ),
    },
    {
      title: 'OSM objects without a wikidata tag',
      description: 'In-scope OSM boundaries (protected_area/national_park) that carry no `wikidata` tag at all -- candidates for manual tagging.',
      columns: ['osmType', 'osmId', 'osmUrl', 'name'],
      rows: osmWithoutWikidataTag,
      quickStatements: reviewOnlyDetails(
        'No Wikidata edit applies -- add the `wikidata` tag on the OpenStreetMap object once you\'ve identified the matching Wikidata item.',
      ),
    },
  ];

  return {
    sections,
    matchedCount: matches.length,
    unmatchedWikidataCount: unmatchedWikidata.length,
    issueCount: sections.reduce((sum, s) => (s.title === 'OSM objects without a wikidata tag' ? sum : sum + s.rows.length), 0),
  };
}
