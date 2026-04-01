import type { FullHorizonResult } from "../lib/spheroid";
import {
  metersToKm,
  metersToMiles,
  metersToFeet,
} from "../lib/spheroid";
import type { TerrainProfile } from "../lib/data";

interface Props {
  horizonResult: FullHorizonResult | null;
  terrainProfile: TerrainProfile | null;
  elevationM: number;
  elevationUnit: "m" | "ft";
  distanceUnit: "metric" | "imperial";
  refraction: boolean;
  refractionResult: FullHorizonResult | null;
  onElevationChange: (value: number, unit: "m" | "ft") => void;
  onRefractionToggle: () => void;
  onDistanceUnitToggle: () => void;
}

function formatDistance(meters: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    return `${metersToMiles(meters).toFixed(2)} mi`;
  }
  return `${metersToKm(meters).toFixed(2)} km`;
}

function formatElevation(meters: number, unit: "m" | "ft"): string {
  if (unit === "ft") {
    return `${metersToFeet(meters).toFixed(0)} ft`;
  }
  return `${meters.toFixed(0)} m`;
}

function formatRadius(meters: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    return `${metersToMiles(meters).toFixed(1)} mi`;
  }
  return `${metersToKm(meters).toFixed(1)} km`;
}

function azimuthToCompass(deg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function ResultsPanel({
  horizonResult,
  terrainProfile,
  elevationM,
  elevationUnit,
  distanceUnit,
  refraction,
  refractionResult,
  onElevationChange,
  onRefractionToggle,
  onDistanceUnitToggle,
}: Props) {
  const elevationDisplay =
    elevationUnit === "ft" ? metersToFeet(elevationM) : elevationM;

  // Find terrain extremes
  let terrainFarthest: { azimuth: number; distance: number } | null = null;
  let terrainNearest: { azimuth: number; distance: number } | null = null;
  if (terrainProfile) {
    let maxD = -Infinity,
      minD = Infinity;
    for (const entry of terrainProfile.horizon_profile) {
      if (entry.distance_km > maxD) {
        maxD = entry.distance_km;
        terrainFarthest = {
          azimuth: entry.azimuth_deg,
          distance: entry.distance_km,
        };
      }
      if (entry.distance_km < minD) {
        minD = entry.distance_km;
        terrainNearest = {
          azimuth: entry.azimuth_deg,
          distance: entry.distance_km,
        };
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="space-y-3">
        {/* Elevation input */}
        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Observer Elevation
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={Math.round(elevationDisplay)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                onElevationChange(val, elevationUnit);
              }}
              min={0}
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono
                focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
            />
            <span className="flex items-center px-3 py-2 bg-parchment border border-border rounded-lg text-xs font-medium text-ink-muted">
              {elevationUnit}
            </span>
          </div>
        </div>

        {/* Toggles row */}
        <div className="flex items-center justify-between gap-4">
          {/* Refraction toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={refraction}
                onChange={onRefractionToggle}
                className="sr-only peer"
              />
              <div
                className="w-8 h-[18px] bg-border rounded-full
                peer-checked:bg-teal transition-colors"
              />
              <div
                className="absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow
                transition-transform peer-checked:translate-x-3.5"
              />
            </div>
            <span className="text-xs text-ink-light group-hover:text-ink transition-colors">
              Refraction
            </span>
          </label>

          {/* Unit system toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() =>
                distanceUnit !== "metric" && onDistanceUnitToggle()
              }
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
                ${distanceUnit === "metric" ? "bg-teal text-white" : "bg-surface text-ink-light hover:bg-parchment"}`}
            >
              Metric
            </button>
            <button
              onClick={() =>
                distanceUnit !== "imperial" && onDistanceUnitToggle()
              }
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
                ${distanceUnit === "imperial" ? "bg-teal text-white" : "bg-surface text-ink-light hover:bg-parchment"}`}
            >
              Imperial
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {horizonResult && (
        <div className="animate-slide-up">
          {/* Primary result */}
          <div className="mb-4">
            <div className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
              Horizon Distance
            </div>
            <div className="font-display text-4xl text-ink leading-tight">
              {formatDistance(
                refraction && refractionResult
                  ? refractionResult.meanDistanceM
                  : horizonResult.meanDistanceM,
                distanceUnit,
              )}
            </div>
            {refraction && refractionResult && (
              <div className="text-xs text-ink-muted mt-1">
                Geometric:{" "}
                {formatDistance(horizonResult.meanDistanceM, distanceUnit)}
              </div>
            )}
          </div>

          {/* Supporting details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div>
              <div className="text-xs text-ink-muted">Elevation</div>
              <div className="font-mono text-ink">
                {formatElevation(horizonResult.elevationM, elevationUnit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Local Radius</div>
              <div className="font-mono text-ink">
                {formatRadius(horizonResult.meanRadiusM, distanceUnit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Latitude</div>
              <div className="font-mono text-ink">
                {horizonResult.latitudeDeg.toFixed(4)}°
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Azimuthal Range</div>
              <div className="font-mono text-ink text-xs">
                {formatDistance(horizonResult.minDistanceM, distanceUnit)} –{" "}
                {formatDistance(horizonResult.maxDistanceM, distanceUnit)}
              </div>
            </div>
          </div>

          {/* Terrain extras */}
          {terrainProfile && terrainFarthest && terrainNearest && (
            <div className="mt-4 pt-4 border-t border-border-light">
              <div className="text-xs font-medium text-teal uppercase tracking-wider mb-2">
                Terrain Analysis
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-ink-muted">Farthest View</div>
                  <div className="font-mono text-ink">
                    {distanceUnit === "imperial"
                      ? `${(terrainFarthest.distance * 0.621371).toFixed(1)} mi`
                      : `${terrainFarthest.distance.toFixed(1)} km`}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {azimuthToCompass(terrainFarthest.azimuth)} (
                    {terrainFarthest.azimuth}°)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">Nearest Block</div>
                  <div className="font-mono text-ink">
                    {distanceUnit === "imperial"
                      ? `${(terrainNearest.distance * 0.621371).toFixed(1)} mi`
                      : `${terrainNearest.distance.toFixed(1)} km`}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {azimuthToCompass(terrainNearest.azimuth)} (
                    {terrainNearest.azimuth}°)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
