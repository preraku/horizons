# Horizon Distance Calculator — Project Specification

## Overview

A static website that calculates how far a user can see to the horizon, accounting for the Earth's oblate spheroid shape (WGS-84 ellipsoid) and, for select locations, actual terrain obstruction. Hosted on Cloudflare Pages.

---

## Core Functionality

### Mode 1: Spheroid Horizon Calculator (works for any location)

Given a location (latitude) and observer elevation, compute the geometric horizon distance using the WGS-84 reference ellipsoid.

**Inputs:**
- Location: either entered as text (geocoded to lat/lon) or manually entered as coordinates
- Observer elevation above ground level (meters or feet, user-selectable)

**Computation:**
- Determine the local radius of curvature at the given latitude. Two principal radii matter:
  - Meridional radius of curvature: `M = a(1 - e²) / (1 - e²sin²φ)^(3/2)`
  - Prime vertical radius of curvature: `N = a / (1 - e²sin²φ)^(1/2)`
  - Where `a = 6378137.0` m (WGS-84 semi-major axis), `e² = 0.00669437999014` (first eccentricity squared), `φ` = geodetic latitude
- For a given azimuth θ, the local radius of curvature is: `R(θ) = MN / (M·cos²θ + N·sin²θ)` (Euler's formula for radius of curvature in an arbitrary direction)
- Geometric horizon distance along the surface at azimuth θ: `d(θ) = R(θ) · arccos(R(θ) / (R(θ) + h))` where h is observer elevation
- For the general (non-directional) result, use the mean or display the range across azimuths

**Outputs:**
- Horizon distance in km and miles
- Local radius of curvature
- Observer elevation used
- Note: the azimuthal variation due to oblateness is small (fractions of a percent) but should be computed correctly, not ignored

**Optional refinement:** Atmospheric refraction. Standard atmospheric refraction extends the visible horizon by roughly 8%. The standard correction uses an effective Earth radius of `R' = R × 7/6` (or the more precise `k = 0.13` refraction coefficient). This should be offered as a toggle, off by default, with a brief explanation.

---

### Mode 2: Terrain-Aware Horizon Profile (pre-computed locations only)

For a curated set of locations (~400 initially, expandable to thousands), display the actual horizon profile accounting for terrain.

**Data format:** Each location has a pre-computed JSON file containing:

```json
{
  "name": "Denver, Colorado",
  "latitude": 39.7392,
  "longitude": -104.9903,
  "elevation_m": 1609,
  "azimuth_step_deg": 1,
  "horizon_profile": [
    {
      "azimuth_deg": 0,
      "distance_km": 12.3,
      "blocking_elevation_m": 1845,
      "blocking_lat": 39.85,
      "blocking_lon": -104.99
    },
    ...
  ]
}
```

Each entry in `horizon_profile` represents one azimuth direction. `distance_km` is the distance to the point where terrain blocks the line of sight. `blocking_elevation_m` and the blocking lat/lon describe what is doing the blocking.

**This data will be pre-computed offline separately.** The website only needs to load and display it. The pre-computation pipeline is not part of this project.

---

## Data Architecture

```
/data/
  locations-index.json        # Master index of all enhanced locations
  profiles/
    denver-co.json
    new-york-ny.json
    mt-everest.json
    ...
```

**`locations-index.json`** contains an array of all available terrain-enhanced locations:

```json
[
  {
    "slug": "denver-co",
    "name": "Denver, Colorado",
    "latitude": 39.7392,
    "longitude": -104.9903,
    "elevation_m": 1609,
    "country": "US",
    "type": "city"
  },
  ...
]
```

This index is loaded on page load. Individual profile files are fetched on demand when the user selects an enhanced location. Each profile file is ~1.4 KB at 1-degree resolution.

---

## User Interface

### Layout

Single-page application. Desktop layout uses a left-right split:

- **Left panel (~35% width):** Input controls and numerical results
- **Right panel (~65% width):** Visualization area

On mobile, these stack vertically: input/results on top, visualization below.

### Left Panel — Input & Results

**Input section:**
- "Use My Location" button that requests the browser Geolocation API (`navigator.geolocation.getCurrentPosition`). On success, populate the coordinates and reverse-geocode to display a place name. Handle denial gracefully (brief message, no modal).
- Single text input field with autocomplete/search
- Accepts: city names, landmark names, or raw coordinates (e.g., "39.74, -104.99")
- Autocomplete should clearly distinguish between:
  - Locations with terrain data available (show an indicator like a small icon or label)
  - Arbitrary locations (spheroid calculation only)
- For arbitrary locations not in the index, use a geocoding approach (a simple free geocoding API, or let the user enter coordinates manually)
- Below the search field: a manual elevation input (meters/feet toggle), pre-filled with the location's elevation if known, editable by the user (e.g., "what if I were on top of a 100m building here?")
- Toggle for atmospheric refraction (off by default)
- Unit toggle: metric (km/m) or imperial (miles/feet)

**Results section (below inputs):**
- Primary result: horizon distance, displayed prominently
- Supporting details:
  - Observer elevation
  - Local radius of curvature at this latitude
  - If refraction is on, both geometric and refracted distances
  - If terrain data is available: farthest visible direction and distance, nearest blocked direction and distance
- Keep this compact. Numbers with labels, no verbose explanation.

### Right Panel — Visualization

**For spheroid-only locations:**
A cross-section diagram showing:
- The curved Earth surface (exaggerated curvature for visibility)
- The observer point at elevation h
- The tangent line from observer to the horizon point
- The distance labeled along the surface
- This is a simple SVG or canvas drawing. It makes the geometry intuitive.

**For terrain-enhanced locations:**
A polar plot (also called a radar chart or rose diagram):
- Center = observer location
- Radial axis = distance (km)
- Angular axis = compass direction (N at top)
- The terrain horizon profile drawn as an irregular filled shape
- The spheroid-only horizon distance shown as a dashed circle for reference
- Cardinal and intercardinal directions labeled (N, NE, E, SE, S, SW, W, NW)
- On hover/tap of any point on the profile: tooltip showing azimuth, distance, and what terrain feature blocks the view

The polar plot is the most important visualization. It should be clear, readable, and immediately communicate where terrain restricts or extends the view.

---

### Header

Minimal. Site name (e.g., "How Far Can You See?"), one-line description ("Calculate the distance to your horizon, accounting for Earth's shape and local terrain."). No navigation bar needed.

### Methodology Section

Collapsible or below-the-fold section covering:
- WGS-84 ellipsoid parameters and formulas used
- How terrain analysis works (ray-casting from observer along azimuths, checking elevation samples against line of sight)
- Data sources (SRTM, Copernicus DEM, or whichever was used)
- What is NOT accounted for: man-made structures, vegetation, atmospheric conditions beyond standard refraction
- Link to source code

---

## Technical Requirements

### Stack
- React (single-page app)
- Tailwind CSS for styling
- No backend — fully static, hosted on Cloudflare Pages
- TypeScript preferred

### Build
- Use npm or pnpm as package manager (Cloudflare Pages does not support Bun in its build pipeline)
- Vite as bundler
- Standard Cloudflare Pages build config: build command `npm run build` (or `pnpm run build`), output directory `dist`

### Geocoding
- For arbitrary location search (non-indexed locations), use a free geocoding API. Options:
  - Nominatim (OpenStreetMap) — free, no API key, rate-limited to 1 req/sec
  - Or simply allow manual coordinate entry as the fallback
- The autocomplete should first search the local index of enhanced locations, then fall back to geocoding for arbitrary locations

### Visualization
- Use a charting library like D3, Recharts, or plain SVG/Canvas for the polar plot and cross-section diagram
- The polar plot needs to support hover/tap interaction for tooltips
- Responsive: both visualizations should work at various panel sizes

### Performance
- Initial page load should be fast: just the app bundle + the locations index (~20 KB)
- Individual profile fetches are ~1.4 KB each, effectively instant
- Spheroid calculations are trivial and should be computed client-side in real-time as the user adjusts elevation

---

## Scope Boundaries

**In scope:**
- Spheroid horizon calculation for any location/elevation
- Display of pre-computed terrain profiles for indexed locations
- Polar plot and cross-section visualizations
- Responsive layout (desktop and mobile)
- Unit toggling, refraction toggle
- Methodology documentation on the page

**Out of scope for now:**
- The pre-computation pipeline that generates terrain profile data (this will be a separate offline tool)
- Real-time terrain tile fetching and client-side viewshed computation for arbitrary locations
- 3D globe or map overlay visualization
- User accounts, saving, sharing

---

## Placeholder / Seed Data

Since the terrain pre-computation pipeline doesn't exist yet, the site should be built to work with:
1. The spheroid calculator functioning fully for any coordinates
2. A small set of **sample/mock terrain profiles** (3–5 locations) with realistic-looking data so the terrain visualization can be built and tested. Generate plausible mock data: e.g., a coastal city (horizon extends far over ocean, blocked inland by hills), a mountain peak (short horizon in most directions due to nearby peaks, long views down valleys), a flat plains city (nearly circular, close to spheroid result).

The data loading code should be written to handle the real format described above so that real data can be dropped in later.

---

## File Structure (suggested)

```
/
├── public/
│   └── data/
│       ├── locations-index.json
│       └── profiles/
│           ├── sample-coastal.json
│           ├── sample-mountain.json
│           └── sample-plains.json
├── src/
│   ├── components/
│   │   ├── SearchInput.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── CrossSectionDiagram.tsx
│   │   ├── PolarPlot.tsx
│   │   └── MethodologySection.tsx
│   ├── lib/
│   │   ├── spheroid.ts          # WGS-84 calculations
│   │   ├── geocoding.ts         # Nominatim API wrapper
│   │   └── data.ts              # Profile loading utilities
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```
