/**
 * Geodesic (great-circle) path between two lng/lat points, using spherical
 * linear interpolation on the unit sphere.
 *
 * Returns an unwrapped LineString — consecutive longitudes never jump by more
 * than 180°, so the polyline renders continuously when the arc crosses the
 * antimeridian on globe projection.
 */
export function greatCirclePoints(
  from: [number, number],
  to: [number, number],
  steps = 64
): [number, number][] {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const φ1 = lat1 * toRad;
  const λ1 = lng1 * toRad;
  const φ2 = lat2 * toRad;
  const λ2 = lng2 * toRad;

  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const ω = Math.acos(dot);
  if (ω < 1e-6) return [from, to];
  const sinω = Math.sin(ω);

  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.sin((1 - t) * ω) / sinω;
    const b = Math.sin(t * ω) / sinω;
    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg;
    const lng = Math.atan2(y, x) * toDeg;
    out.push([lng, lat]);
  }

  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1][0];
    let cur = out[i][0];
    while (cur - prev > 180) cur -= 360;
    while (cur - prev < -180) cur += 360;
    out[i][0] = cur;
  }

  return out;
}
