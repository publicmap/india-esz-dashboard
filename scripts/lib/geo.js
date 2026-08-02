// Minimal geometry helpers for the OSM <-> Wikidata coordinate QA checks --
// no turf/geometry dependency is otherwise used in this project, and the
// only operations needed are a great-circle distance and a point-vs-polygon
// containment/boundary-distance check.

const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_DEGREE = 111320;

export function haversineDistanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Standard ray-casting point-in-ring test. `ring` is [[lon, lat], ...].
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// `rings` is [outerRing, hole1, hole2, ...] as used by GeoJSON Polygon coordinates.
function pointInPolygonRings(lon, lat, rings) {
  if (!pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (pointInRing(lon, lat, rings[i])) return false; // falls inside a hole
  }
  return true;
}

export function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return pointInPolygonRings(lon, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((rings) => pointInPolygonRings(lon, lat, rings));
  }
  return false;
}

// Local equirectangular projection anchored at the test point's own latitude
// -- accurate enough at the few-km scale these QA distances are measured at,
// without pulling in a full geodesic library.
function project(lon, lat, refLat) {
  return {
    x: lon * Math.cos((refLat * Math.PI) / 180) * METERS_PER_DEGREE,
    y: lat * METERS_PER_DEGREE,
  };
}

function distancePointToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = (dx ** 2) + (dy ** 2);
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

// Shortest distance in meters from (lon, lat) to the nearest edge of any
// ring in the geometry (Polygon or MultiPolygon), regardless of whether the
// point is inside or outside.
export function distanceToPolygonBoundaryMeters(lon, lat, geometry) {
  const rings = [];
  if (geometry?.type === 'Polygon') rings.push(...geometry.coordinates);
  else if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach((poly) => rings.push(...poly));
  if (rings.length === 0) return null;

  const p = project(lon, lat, lat);
  let min = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = project(ring[i][0], ring[i][1], lat);
      const b = project(ring[i + 1][0], ring[i + 1][1], lat);
      const d = distancePointToSegment(p, a, b);
      if (d < min) min = d;
    }
  }
  return min === Infinity ? null : min;
}
