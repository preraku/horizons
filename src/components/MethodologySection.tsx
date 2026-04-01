import { useState } from "react";
import { WGS84_A, WGS84_E2 } from "../lib/spheroid";

export function MethodologySection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-t border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left
          hover:bg-parchment-dark/50 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-ink-light">
          Methodology & Data Sources
        </span>
        <svg
          className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 animate-slide-up">
          <div className="max-w-3xl space-y-6 text-sm text-ink-light leading-relaxed">
            {/* WGS-84 */}
            <div>
              <h3 className="font-medium text-ink mb-2">
                WGS-84 Ellipsoid Model
              </h3>
              <p className="mb-2">
                The Earth is modeled as an oblate spheroid using the WGS-84
                reference ellipsoid, the same model used by GPS systems
                worldwide.
              </p>
              <div className="bg-parchment rounded-lg p-3 font-mono text-xs space-y-1">
                <div>
                  Semi-major axis (a) = {WGS84_A.toLocaleString()} m
                </div>
                <div>
                  First eccentricity squared (e²) = {WGS84_E2}
                </div>
                <div className="pt-2 border-t border-border-light mt-2">
                  <div>
                    Meridional radius: M = a(1 - e²) / (1 - e²sin²φ)^(3/2)
                  </div>
                  <div>
                    Prime vertical radius: N = a / (1 - e²sin²φ)^(1/2)
                  </div>
                  <div>
                    Local radius at azimuth θ: R(θ) = MN / (Mcos²θ + Nsin²θ)
                  </div>
                  <div>
                    Horizon distance: d = R · arccos(R / (R + h))
                  </div>
                </div>
              </div>
            </div>

            {/* Atmospheric Refraction */}
            <div>
              <h3 className="font-medium text-ink mb-2">
                Atmospheric Refraction
              </h3>
              <p>
                Light bends as it passes through the atmosphere, extending the
                visible horizon by roughly 8%. When enabled, this calculator
                applies the standard refraction correction using an effective
                Earth radius of R' = R × 7/6 (refraction coefficient k ≈ 0.13).
                This is an approximation — actual refraction varies with
                atmospheric conditions (temperature, pressure, humidity).
              </p>
            </div>

            {/* Terrain Analysis */}
            <div>
              <h3 className="font-medium text-ink mb-2">
                Terrain-Aware Horizon
              </h3>
              <p className="mb-2">
                For select locations, pre-computed terrain profiles show how
                actual terrain (mountains, hills, valleys) affects the visible
                horizon in each direction. The terrain analysis works by
                ray-casting from the observer position along each azimuth
                direction (1° steps), checking elevation samples against the
                line of sight.
              </p>
              <p>
                Terrain elevation data is sourced from high-resolution digital
                elevation models (DEMs) such as SRTM and Copernicus DEM.
              </p>
            </div>

            {/* Limitations */}
            <div>
              <h3 className="font-medium text-ink mb-2">Limitations</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Man-made structures (buildings, towers) are not included in
                  terrain data
                </li>
                <li>
                  Vegetation and tree canopy are not accounted for
                </li>
                <li>
                  Atmospheric conditions beyond standard refraction are not
                  modeled
                </li>
                <li>
                  The azimuthal variation due to Earth's oblateness is small
                  (fractions of a percent) but is computed correctly
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
