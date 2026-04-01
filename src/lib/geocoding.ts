export interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { "User-Agent": "HorizonCalculator/1.0" },
  });
}

/**
 * Forward geocode: text query -> lat/lon results.
 */
export async function geocodeSearch(
  query: string,
): Promise<GeocodingResult[]> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return data.map(
    (item: {
      display_name: string;
      name: string;
      lat: string;
      lon: string;
    }) => ({
      name: item.name || item.display_name.split(",")[0],
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
    }),
  );
}

/**
 * Reverse geocode: lat/lon -> place name.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return data.display_name || null;
}

/**
 * Try to parse a raw coordinate string like "39.74, -104.99" or "39.74 -104.99".
 * Returns null if the string is not valid coordinates.
 */
export function parseCoordinates(
  input: string,
): { latitude: number; longitude: number } | null {
  const cleaned = input.trim();
  // Match patterns like "39.74, -104.99" or "39.74 -104.99"
  const match = cleaned.match(
    /^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/,
  );
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { latitude: lat, longitude: lon };
}
