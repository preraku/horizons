// WGS-84 Ellipsoid Parameters
const WGS84_A = 6_378_137.0; // Semi-major axis (meters)
const WGS84_B = 6_356_752.314245; // Semi-minor axis (meters)
const WGS84_E2 = 0.00669437999014; // First eccentricity squared

export interface HorizonResult {
  /** Horizon distance in meters along the surface */
  distanceM: number;
  /** Local radius of curvature in meters (at the given azimuth, or mean) */
  radiusM: number;
  /** Observer elevation used (meters) */
  elevationM: number;
  /** Latitude used (degrees) */
  latitudeDeg: number;
  /** Whether atmospheric refraction was applied */
  refractionApplied: boolean;
}

export interface AzimuthalHorizonResult extends HorizonResult {
  /** Azimuth in degrees (0 = North, clockwise) */
  azimuthDeg: number;
}

export interface FullHorizonResult {
  /** Mean horizon distance in meters */
  meanDistanceM: number;
  /** Minimum horizon distance (and direction) */
  minDistanceM: number;
  minAzimuthDeg: number;
  /** Maximum horizon distance (and direction) */
  maxDistanceM: number;
  maxAzimuthDeg: number;
  /** Mean local radius of curvature in meters */
  meanRadiusM: number;
  /** Observer elevation used (meters) */
  elevationM: number;
  /** Latitude used (degrees) */
  latitudeDeg: number;
  /** Whether atmospheric refraction was applied */
  refractionApplied: boolean;
  /** Per-azimuth results (1-degree steps) */
  azimuths: AzimuthalHorizonResult[];
}

/**
 * Meridional radius of curvature at geodetic latitude phi.
 * M = a(1 - e^2) / (1 - e^2 sin^2(phi))^(3/2)
 */
export function meridionalRadius(latRad: number): number {
  const sinPhi = Math.sin(latRad);
  const denom = 1 - WGS84_E2 * sinPhi * sinPhi;
  return (WGS84_A * (1 - WGS84_E2)) / Math.pow(denom, 1.5);
}

/**
 * Prime vertical radius of curvature at geodetic latitude phi.
 * N = a / (1 - e^2 sin^2(phi))^(1/2)
 */
export function primeVerticalRadius(latRad: number): number {
  const sinPhi = Math.sin(latRad);
  const denom = 1 - WGS84_E2 * sinPhi * sinPhi;
  return WGS84_A / Math.sqrt(denom);
}

/**
 * Local radius of curvature at a given latitude and azimuth using Euler's formula.
 * R(theta) = M*N / (M*cos^2(theta) + N*sin^2(theta))
 */
export function localRadius(latRad: number, azimuthRad: number): number {
  const M = meridionalRadius(latRad);
  const N = primeVerticalRadius(latRad);
  const cosTheta = Math.cos(azimuthRad);
  const sinTheta = Math.sin(azimuthRad);
  return (M * N) / (M * cosTheta * cosTheta + N * sinTheta * sinTheta);
}

/**
 * Geometric horizon distance along the Earth's surface for a given
 * local radius of curvature R and observer elevation h.
 * d = R * arccos(R / (R + h))
 */
export function horizonDistance(R: number, h: number): number {
  if (h <= 0) return 0;
  const cosAngle = R / (R + h);
  // Clamp for numerical safety
  return R * Math.acos(Math.min(1, cosAngle));
}

/** Standard atmospheric refraction factor (effective Earth radius multiplier) */
const REFRACTION_FACTOR = 7 / 6;

/**
 * Compute horizon distance at a specific azimuth.
 */
export function computeHorizonAtAzimuth(
  latDeg: number,
  elevationM: number,
  azimuthDeg: number,
  refraction: boolean = false,
): AzimuthalHorizonResult {
  const latRad = (latDeg * Math.PI) / 180;
  const azRad = (azimuthDeg * Math.PI) / 180;
  let R = localRadius(latRad, azRad);
  if (refraction) {
    R *= REFRACTION_FACTOR;
  }
  const d = horizonDistance(R, elevationM);
  return {
    azimuthDeg,
    distanceM: d,
    radiusM: R,
    elevationM,
    latitudeDeg: latDeg,
    refractionApplied: refraction,
  };
}

/**
 * Compute full horizon profile across all azimuths (1-degree steps).
 */
export function computeFullHorizon(
  latDeg: number,
  elevationM: number,
  refraction: boolean = false,
): FullHorizonResult {
  const azimuths: AzimuthalHorizonResult[] = [];

  let minDist = Infinity;
  let maxDist = -Infinity;
  let minAz = 0;
  let maxAz = 0;
  let sumDist = 0;
  let sumRadius = 0;

  for (let az = 0; az < 360; az++) {
    const result = computeHorizonAtAzimuth(latDeg, elevationM, az, refraction);
    azimuths.push(result);
    sumDist += result.distanceM;
    sumRadius += result.radiusM;
    if (result.distanceM < minDist) {
      minDist = result.distanceM;
      minAz = az;
    }
    if (result.distanceM > maxDist) {
      maxDist = result.distanceM;
      maxAz = az;
    }
  }

  return {
    meanDistanceM: sumDist / 360,
    minDistanceM: minDist,
    minAzimuthDeg: minAz,
    maxDistanceM: maxDist,
    maxAzimuthDeg: maxAz,
    meanRadiusM: sumRadius / 360,
    elevationM,
    latitudeDeg: latDeg,
    refractionApplied: refraction,
    azimuths,
  };
}

// --- Unit conversion helpers ---

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function feetToMeters(ft: number): number {
  return ft / 3.28084;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function kmToMiles(km: number): number {
  return km / 1.609344;
}

export { WGS84_A, WGS84_B, WGS84_E2 };
