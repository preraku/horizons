# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start Vite dev server (HMR at localhost:5173)
npm run build      # Type-check (tsc -b) then Vite production build → dist/
npm run lint       # ESLint with flat config (ES 2024)
npm run preview    # Preview production build locally
```

Build is two-stage: TypeScript strict checking first, then Vite bundling. Both must pass.

## Architecture

**Horizon Distance Calculator** — a fully static React SPA (Cloudflare Pages) that computes how far you can see from any location, using the WGS-84 ellipsoid model and optional pre-computed terrain profiles.

### Two Modes

1. **Spheroid-only** (any location): Pure geometric horizon calculation using WGS-84 ellipsoid parameters. Computes per-azimuth horizon distance accounting for Earth's oblateness. Shows a cross-section SVG diagram.
2. **Terrain-enhanced** (indexed locations only): Loads a pre-computed 360° terrain profile showing where actual terrain blocks the view. Shows a polar/radar SVG chart.

### Data Flow

All state lives in `App.tsx`. Horizon results are derived via `useMemo` (pure computation, not effects). Terrain profiles are fetched on-demand when the user selects an indexed location.

```
SearchInput → App.tsx (state) → useMemo(computeFullHorizon) → ResultsPanel + Visualization
                    ↓
          loadTerrainProfile(slug) → PolarPlot (if terrain) or CrossSectionDiagram (if spheroid-only)
```

### Key Libraries (src/lib/)

- `spheroid.ts` — WGS-84 math: meridional radius (M), prime vertical radius (N), Euler's formula for local radius at arbitrary azimuth, geometric horizon distance `d = R·arccos(R/(R+h))`, atmospheric refraction (R × 7/6)
- `geocoding.ts` — Nominatim wrapper with 1 req/sec rate limiting, coordinate string parsing
- `data.ts` — Fetches and caches `locations-index.json` and per-location terrain profiles from `/public/data/`

### Data Format

Terrain profiles live in `public/data/profiles/{slug}.json` with 360 entries (1° azimuth resolution). The locations index at `public/data/locations-index.json` lists all indexed locations with slug, coordinates, elevation, and type. These are static JSON files served as public assets — the pre-computation pipeline that generates them is a separate offline tool, not part of this repo.

### Visualizations

Both diagrams are hand-built SVG (no charting library). `CrossSectionDiagram` draws exaggerated Earth curvature with observer/tangent geometry. `PolarPlot` draws a radar chart with interactive hover tooltips showing azimuth, distance, and blocking elevation.

## Tech Stack

- React 19, TypeScript ~5.9 (strict), Vite 8, Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- Tailwind v4 theming via `@theme` directive in `src/index.css` (not a config file)
- Fonts: Instrument Serif (display), DM Sans (body), DM Mono (monospace) — loaded via Google Fonts in `index.html`
- No testing framework configured yet
- No backend — all computation is client-side, data is static JSON
