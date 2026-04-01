import { useState, useMemo, useCallback } from "react";
import type { TerrainProfile, HorizonProfileEntry } from "../lib/data";
import type { FullHorizonResult } from "../lib/spheroid";

interface Props {
  terrainProfile: TerrainProfile;
  horizonResult: FullHorizonResult;
  distanceUnit: "metric" | "imperial";
}

const SIZE = 500;
const CX = SIZE / 2;
const CY = SIZE / 2;
const PLOT_RADIUS = SIZE / 2 - 55; // leave room for labels
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const DIR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function polarToCartesian(
  azimuthDeg: number,
  radius: number,
): { x: number; y: number } {
  const rad = ((azimuthDeg - 90) * Math.PI) / 180; // -90 because 0° = North = up
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function azimuthToCompass(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function PolarPlot({
  terrainProfile,
  horizonResult,
  distanceUnit,
}: Props) {
  const [hoveredEntry, setHoveredEntry] = useState<HorizonProfileEntry | null>(
    null,
  );
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const { maxDistance, gridDistances, terrainPath, spheroidRadius } =
    useMemo(() => {
      // Find max distance for scaling
      const maxD = Math.max(
        ...terrainProfile.horizon_profile.map((e) => e.distance_km),
        horizonResult.meanDistanceM / 1000,
      );
      // Round up to nice grid
      const gridMax = Math.ceil(maxD / 10) * 10 || 10;

      // Grid distances (4-5 rings)
      const ringCount = 4;
      const gridDists: number[] = [];
      for (let i = 1; i <= ringCount; i++) {
        gridDists.push((gridMax / ringCount) * i);
      }

      // Scale factor: distance_km -> SVG radius
      const scale = PLOT_RADIUS / gridMax;

      // Terrain profile polygon
      const points = terrainProfile.horizon_profile.map((entry) => {
        const r = entry.distance_km * scale;
        const { x, y } = polarToCartesian(entry.azimuth_deg, r);
        return { x, y, entry };
      });

      const pathD = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" ") + " Z";

      // Spheroid horizon radius in SVG units
      const spheroidR =
        (horizonResult.meanDistanceM / 1000) * scale;

      return {
        maxDistance: gridMax,
        gridDistances: gridDists,
        terrainPath: pathD,
        spheroidRadius: spheroidR,
      };
    }, [terrainProfile, horizonResult]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = SIZE / rect.width;
      const scaleY = SIZE / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Convert to polar coordinates
      const dx = mouseX - CX;
      const dy = mouseY - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10 || dist > PLOT_RADIUS + 20) {
        setHoveredEntry(null);
        return;
      }

      // Angle: atan2 gives angle from positive X axis, we need from North (up)
      let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      // Find closest azimuth entry
      const azIdx = Math.round(angleDeg) % 360;
      const entry = terrainProfile.horizon_profile.find(
        (e) => e.azimuth_deg === azIdx,
      );

      if (entry) {
        setHoveredEntry(entry);
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    },
    [terrainProfile],
  );

  const formatDist = (km: number) =>
    distanceUnit === "imperial"
      ? `${(km * 0.621371).toFixed(1)} mi`
      : `${km.toFixed(1)} km`;

  const formatGridDist = (km: number) =>
    distanceUnit === "imperial"
      ? `${Math.round(km * 0.621371)}`
      : `${Math.round(km)}`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-auto"
        style={{ maxHeight: "520px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredEntry(null)}
      >
        <defs>
          <radialGradient id="terrainGrad">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Grid rings */}
        {gridDistances.map((dist, i) => {
          const r = (dist / maxDistance) * PLOT_RADIUS;
          return (
            <g key={i}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="#d6d3d1"
                strokeWidth={i === gridDistances.length - 1 ? "1" : "0.5"}
                strokeDasharray={
                  i === gridDistances.length - 1 ? "none" : "3 3"
                }
              />
              <text
                x={CX + 4}
                y={CY - r + 12}
                className="fill-ink-muted text-[10px] font-mono"
              >
                {formatGridDist(dist)}{" "}
                {distanceUnit === "imperial" ? "mi" : "km"}
              </text>
            </g>
          );
        })}

        {/* Radial direction lines */}
        {DIR_ANGLES.map((angle, i) => {
          const end = polarToCartesian(angle, PLOT_RADIUS + 4);
          const label = polarToCartesian(angle, PLOT_RADIUS + 22);
          return (
            <g key={angle}>
              <line
                x1={CX}
                y1={CY}
                x2={end.x}
                y2={end.y}
                stroke="#d6d3d1"
                strokeWidth="0.5"
              />
              <text
                x={label.x}
                y={label.y + 4}
                textAnchor="middle"
                className={`text-[11px] font-body ${
                  i % 2 === 0
                    ? "fill-ink font-medium"
                    : "fill-ink-muted font-normal"
                }`}
              >
                {DIRECTIONS[i]}
              </text>
            </g>
          );
        })}

        {/* Spheroid horizon circle (dashed reference) */}
        <circle
          cx={CX}
          cy={CY}
          r={spheroidRadius}
          fill="none"
          stroke="#c2410c"
          strokeWidth="1.2"
          strokeDasharray="6 4"
          opacity="0.6"
        />

        {/* Terrain profile polygon */}
        <path
          d={terrainPath}
          fill="url(#terrainGrad)"
          stroke="#0f766e"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Hovered point */}
        {hoveredEntry && (() => {
          const scale = PLOT_RADIUS / maxDistance;
          const r = hoveredEntry.distance_km * scale;
          const { x, y } = polarToCartesian(hoveredEntry.azimuth_deg, r);
          return (
            <>
              {/* Radial line to hovered point */}
              <line
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="#0f766e"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.5"
              />
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#0f766e"
                stroke="white"
                strokeWidth="2"
              />
            </>
          );
        })()}

        {/* Center point */}
        <circle cx={CX} cy={CY} r="3" fill="#1c1917" />

        {/* Legend */}
        <g transform={`translate(${SIZE - 135}, ${SIZE - 38})`}>
          <line
            x1="0"
            y1="8"
            x2="18"
            y2="8"
            stroke="#0f766e"
            strokeWidth="2"
          />
          <text x="22" y="11" className="fill-ink-light text-[9px] font-body">
            Terrain horizon
          </text>
          <line
            x1="0"
            y1="22"
            x2="18"
            y2="22"
            stroke="#c2410c"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text x="22" y="25" className="fill-ink-light text-[9px] font-body">
            Spheroid horizon
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredEntry && (
        <div
          className="fixed z-50 pointer-events-none bg-ink text-white
            px-3 py-2 rounded-lg shadow-lg text-xs font-body
            animate-fade-in"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
            animationDuration: "0.15s",
          }}
        >
          <div className="font-medium">
            {azimuthToCompass(hoveredEntry.azimuth_deg)} (
            {hoveredEntry.azimuth_deg}°)
          </div>
          <div className="mt-0.5 font-mono">
            Distance: {formatDist(hoveredEntry.distance_km)}
          </div>
          <div className="font-mono">
            Blocking elevation: {hoveredEntry.blocking_elevation_m.toFixed(0)} m
          </div>
        </div>
      )}
    </div>
  );
}
