/**
 * Day/night terminator — the set of (lng, lat) where the sun is exactly at
 * the horizon for a given instant. Returns a GeoJSON Polygon covering the
 * night hemisphere so we can render it as a subtle shadow fill on the globe.
 *
 * Astronomical formulas are the standard low-precision solar-position ones
 * (same approach as joergdietrich/leaflet.terminator). Accuracy is within a
 * few km — more than enough for an ambient shadow.
 */

function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

function gmstHours(jd: number): number {
  const n = jd - 2451545.0;
  const h = (18.697374558 + 24.06570982441908 * n) % 24;
  return h < 0 ? h + 24 : h;
}

function sunEclipticLongitudeDeg(jd: number): number {
  const n = jd - 2451545.0;
  const L = 280.46 + 0.9856474 * n;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  return L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
}

function sunEquatorial(lambdaDeg: number): { raDeg: number; decDeg: number } {
  const obliq = (23.4393 * Math.PI) / 180;
  const lambda = (lambdaDeg * Math.PI) / 180;
  let raDeg = (Math.atan(Math.cos(obliq) * Math.tan(lambda)) * 180) / Math.PI;
  const decDeg = (Math.asin(Math.sin(obliq) * Math.sin(lambda)) * 180) / Math.PI;
  // Place RA in same quadrant as ecliptic longitude so atan doesn't collapse
  const lQuadrant = Math.floor(lambdaDeg / 90) * 90;
  const raQuadrant = Math.floor(raDeg / 90) * 90;
  raDeg += lQuadrant - raQuadrant;
  return { raDeg, decDeg };
}

function terminatorLat(
  lngDeg: number,
  raDeg: number,
  decDeg: number,
  gmst: number
): number {
  const lst = gmst * 15 + lngDeg;
  const ha = ((lst - raDeg) * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  return (Math.atan(-Math.cos(ha) / Math.tan(dec)) * 180) / Math.PI;
}

export type TerminatorFeatures = {
  polygon: {
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: [number, number][][] };
    properties: { declination: number };
  };
  line: {
    type: "Feature";
    geometry: { type: "LineString"; coordinates: [number, number][] };
    properties: Record<string, never>;
  };
};

/**
 * Build both the night-side polygon (closed via the dark pole) and the
 * terminator line (open, for a glow-rim effect). The line is shared geometry
 * with the polygon's outer boundary minus the pole closure.
 */
export function terminatorFeatures(date: Date = new Date()): TerminatorFeatures {
  const jd = julianDate(date);
  const gmst = gmstHours(jd);
  const lambda = sunEclipticLongitudeDeg(jd);
  const { raDeg, decDeg } = sunEquatorial(lambda);

  const line: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    line.push([lng, terminatorLat(lng, raDeg, decDeg, gmst)]);
  }

  // Close the polygon through whichever pole is currently in darkness
  const darkPole = decDeg > 0 ? -90 : 90;
  const ring: [number, number][] = [
    ...line,
    [180, darkPole],
    [-180, darkPole],
    line[0],
  ];

  return {
    polygon: {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { declination: decDeg },
    },
    line: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: line },
      properties: {},
    },
  };
}
