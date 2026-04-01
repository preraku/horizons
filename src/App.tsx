import { useState, useEffect, useCallback, useMemo } from "react";
import { SearchInput } from "./components/SearchInput";
import type { SelectedLocation } from "./components/SearchInput";
import { ResultsPanel } from "./components/ResultsPanel";
import { CrossSectionDiagram } from "./components/CrossSectionDiagram";
import { PolarPlot } from "./components/PolarPlot";
import { MethodologySection } from "./components/MethodologySection";
import { computeFullHorizon, feetToMeters } from "./lib/spheroid";
import { loadLocationsIndex, loadTerrainProfile } from "./lib/data";
import type { LocationIndex, TerrainProfile } from "./lib/data";

function App() {
  const [locationsIndex, setLocationsIndex] = useState<LocationIndex[]>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [elevationM, setElevationM] = useState<number>(2);
  const [distanceUnit, setDistanceUnit] = useState<"metric" | "imperial">(
    "metric",
  );
  const elevationUnit = distanceUnit === "imperial" ? "ft" : "m";
  const [refraction, setRefraction] = useState(false);
  const [terrainProfile, setTerrainProfile] = useState<TerrainProfile | null>(
    null,
  );

  // Load locations index on mount
  useEffect(() => {
    loadLocationsIndex().then(setLocationsIndex).catch(console.error);
  }, []);

  // Derive horizon results from location + elevation (pure computation, no effect needed)
  const horizonResult = useMemo(
    () =>
      location ? computeFullHorizon(location.latitude, elevationM, false) : null,
    [location, elevationM],
  );

  const refractionResult = useMemo(
    () =>
      location ? computeFullHorizon(location.latitude, elevationM, true) : null,
    [location, elevationM],
  );

  const handleLocationSelect = useCallback((loc: SelectedLocation) => {
    setLocation(loc);
    setElevationM(loc.elevationM ?? 2);
    // Reset terrain, then load if indexed
    setTerrainProfile(null);
    if (loc.slug) {
      loadTerrainProfile(loc.slug)
        .then(setTerrainProfile)
        .catch(() => setTerrainProfile(null));
    }
  }, []);

  const handleElevationChange = useCallback(
    (value: number, unit: "m" | "ft") => {
      setElevationM(unit === "ft" ? feetToMeters(value) : value);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-parchment font-body text-ink">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 lg:px-10 lg:pt-12 lg:pb-8">
        <h1 className="font-display text-4xl lg:text-5xl text-ink leading-tight">
          How Far Can You See?
        </h1>
        <p className="mt-2 text-sm lg:text-base text-ink-light max-w-xl">
          Calculate the distance to your horizon, accounting for Earth's shape
          and local terrain.
        </p>
      </header>

      {/* Main content */}
      <main className="px-6 lg:px-10 pb-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Left panel — inputs & results */}
          <aside className="w-full lg:w-[35%] lg:min-w-[320px] lg:max-w-[420px] space-y-5">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <SearchInput
                locationsIndex={locationsIndex}
                onSelect={handleLocationSelect}
              />
              {location && (
                <div className="mt-1 mb-4">
                  <div className="text-xs text-ink-muted font-mono">
                    {location.latitude.toFixed(4)}°,{" "}
                    {location.longitude.toFixed(4)}°
                    {terrainProfile && (
                      <span className="ml-2 text-teal font-body font-medium">
                        — Terrain data available
                      </span>
                    )}
                  </div>
                </div>
              )}
              <ResultsPanel
                horizonResult={horizonResult}
                terrainProfile={terrainProfile}
                elevationM={elevationM}
                elevationUnit={elevationUnit}
                distanceUnit={distanceUnit}
                refraction={refraction}
                refractionResult={refractionResult}
                onElevationChange={handleElevationChange}
                onRefractionToggle={() => setRefraction((r) => !r)}
                onDistanceUnitToggle={() =>
                  setDistanceUnit((u) =>
                    u === "metric" ? "imperial" : "metric",
                  )
                }
              />
            </div>
          </aside>

          {/* Right panel — visualization */}
          <section className="w-full lg:flex-1">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              {!location && (
                <div className="flex items-center justify-center h-64 lg:h-80 text-ink-muted text-sm">
                  <div className="text-center">
                    <svg
                      className="mx-auto mb-3 text-border"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Search for a location to begin
                  </div>
                </div>
              )}

              {location && horizonResult && !terrainProfile && (
                <div className="animate-fade-in">
                  <div className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
                    Cross-Section View
                  </div>
                  <CrossSectionDiagram
                    horizonResult={horizonResult}
                    distanceUnit={distanceUnit}
                    refraction={refraction}
                    refractionResult={refractionResult}
                  />
                  <p className="text-xs text-ink-muted mt-3 text-center">
                    Curvature exaggerated for illustration. The tangent line from
                    observer to horizon defines the geometric line of sight.
                  </p>
                </div>
              )}

              {location && horizonResult && terrainProfile && (
                <div className="animate-fade-in">
                  <div className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
                    Terrain Horizon Profile — {terrainProfile.name}
                  </div>
                  <PolarPlot
                    terrainProfile={terrainProfile}
                    horizonResult={horizonResult}
                    distanceUnit={distanceUnit}
                  />
                  <p className="text-xs text-ink-muted mt-3 text-center">
                    Hover over the plot to see terrain details for each
                    direction. The dashed circle shows the spheroid-only horizon
                    for reference.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Methodology */}
      <footer className="mt-auto">
        <MethodologySection />
        <div className="px-6 py-4 text-xs text-ink-muted text-center border-t border-border-light">
          Built with WGS-84 ellipsoid calculations. Terrain data from digital
          elevation models.
        </div>
      </footer>
    </div>
  );
}

export default App;
