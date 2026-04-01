export interface LocationIndex {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  country: string;
  type: string;
}

export interface HorizonProfileEntry {
  azimuth_deg: number;
  distance_km: number;
  blocking_elevation_m: number;
  blocking_lat: number;
  blocking_lon: number;
}

export interface TerrainProfile {
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  azimuth_step_deg: number;
  horizon_profile: HorizonProfileEntry[];
}

let locationsCache: LocationIndex[] | null = null;

/**
 * Load the master index of all terrain-enhanced locations.
 */
export async function loadLocationsIndex(): Promise<LocationIndex[]> {
  if (locationsCache) return locationsCache;

  const res = await fetch("/data/locations-index.json");
  if (!res.ok) throw new Error("Failed to load locations index");

  locationsCache = (await res.json()) as LocationIndex[];
  return locationsCache;
}

const profileCache = new Map<string, TerrainProfile>();

/**
 * Load a terrain profile for a specific location by slug.
 */
export async function loadTerrainProfile(
  slug: string,
): Promise<TerrainProfile> {
  const cached = profileCache.get(slug);
  if (cached) return cached;

  const res = await fetch(`/data/profiles/${slug}.json`);
  if (!res.ok) throw new Error(`Failed to load profile: ${slug}`);

  const profile = (await res.json()) as TerrainProfile;
  profileCache.set(slug, profile);
  return profile;
}

/**
 * Search the locations index for matching entries.
 */
export function searchLocations(
  locations: LocationIndex[],
  query: string,
): LocationIndex[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.slug.toLowerCase().includes(q) ||
      loc.country.toLowerCase().includes(q),
  );
}
