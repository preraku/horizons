import { useMemo } from "react";
import type { FullHorizonResult } from "../lib/spheroid";
import { metersToKm, metersToMiles } from "../lib/spheroid";

interface Props {
  horizonResult: FullHorizonResult;
  distanceUnit: "metric" | "imperial";
  refraction: boolean;
  refractionResult: FullHorizonResult | null;
}

export function CrossSectionDiagram({
  horizonResult,
  distanceUnit,
  refraction,
  refractionResult,
}: Props) {
  const geo = useMemo(() => {
    // Visual geometry for the cross-section
    const R_VIS = 800; // visual Earth radius
    const CX = 320; // Earth center X (in viewBox coords)
    const CY = R_VIS + 180; // Earth center Y (below the viewport)

    // Observer ground point angle (to the left of center)
    const alpha = -0.24;

    // Visual elevation — scale so it's always visible (20-55 px)
    const hVis = Math.max(20, Math.min(55, 20 + horizonResult.elevationM / 200));

    // Ground point on the circle
    const groundX = CX + R_VIS * Math.sin(alpha);
    const groundY = CY - R_VIS * Math.cos(alpha);

    // Observer position (elevated along the outward normal)
    const obsX = CX + (R_VIS + hVis) * Math.sin(alpha);
    const obsY = CY - (R_VIS + hVis) * Math.cos(alpha);

    // Tangent point: angular distance from observer ground to tangent = acos(R/(R+h))
    const beta = Math.acos(R_VIS / (R_VIS + hVis));
    const tangentAngle = alpha + beta;

    const tangentX = CX + R_VIS * Math.sin(tangentAngle);
    const tangentY = CY - R_VIS * Math.cos(tangentAngle);

    // Extended tangent line (beyond the tangent point for visual clarity)
    const dx = tangentX - obsX;
    const dy = tangentY - obsY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const extendedX = tangentX + (dx / len) * 40;
    const extendedY = tangentY + (dy / len) * 40;

    // Arc endpoints (wider than the tangent point)
    const arcStart = alpha - 0.08;
    const arcEnd = tangentAngle + 0.16;

    // Generate arc path (polyline of circle points)
    const arcPoints: string[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = arcStart + (arcEnd - arcStart) * (i / steps);
      const x = CX + R_VIS * Math.sin(t);
      const y = CY - R_VIS * Math.cos(t);
      arcPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // "Hidden" arc beyond tangent (Earth continues but out of sight)
    const hiddenStart = tangentAngle;
    const hiddenEnd = arcEnd;
    const hiddenPoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = hiddenStart + (hiddenEnd - hiddenStart) * (i / 20);
      const x = CX + R_VIS * Math.sin(t);
      const y = CY - R_VIS * Math.cos(t);
      hiddenPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // Surface distance arc (from ground to tangent, along the circle)
    const surfArcPoints: string[] = [];
    const surfSteps = 40;
    for (let i = 0; i <= surfSteps; i++) {
      const t = alpha + (beta) * (i / surfSteps);
      const x = CX + (R_VIS + 6) * Math.sin(t);
      const y = CY - (R_VIS + 6) * Math.cos(t);
      surfArcPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // Distance label position (midpoint of the surface arc, offset outward)
    const midAngle = alpha + beta / 2;
    const labelR = R_VIS + 22;
    const labelX = CX + labelR * Math.sin(midAngle);
    const labelY = CY - labelR * Math.cos(midAngle);

    // Height indicator line
    const heightMidY = (groundY + obsY) / 2;

    // Radius indicator (from center toward ground point, partial)
    const radStartFrac = 0.92;
    const radX1 = CX + R_VIS * radStartFrac * Math.sin(alpha + beta * 0.5);
    const radY1 = CY - R_VIS * radStartFrac * Math.cos(alpha + beta * 0.5);
    const radX2 = CX + R_VIS * Math.sin(alpha + beta * 0.5);
    const radY2 = CY - R_VIS * Math.cos(alpha + beta * 0.5);

    return {
      groundX, groundY, obsX, obsY,
      tangentX, tangentY, extendedX, extendedY,
      arcPath: `M ${arcPoints[0]} ${arcPoints.slice(1).map((p) => `L ${p}`).join(" ")}`,
      hiddenPath: `M ${hiddenPoints[0]} ${hiddenPoints.slice(1).map((p) => `L ${p}`).join(" ")}`,
      surfArcPath: `M ${surfArcPoints[0]} ${surfArcPoints.slice(1).map((p) => `L ${p}`).join(" ")}`,
      labelX, labelY,
      heightMidY,
      hVis,
      radX1, radY1, radX2, radY2,
      midAngle,
    };
  }, [horizonResult.elevationM]);

  const dist = refraction && refractionResult
    ? refractionResult.meanDistanceM
    : horizonResult.meanDistanceM;

  const distLabel =
    distanceUnit === "imperial"
      ? `${metersToMiles(dist).toFixed(2)} mi`
      : `${metersToKm(dist).toFixed(2)} km`;

  const elevLabel =
    `h = ${horizonResult.elevationM.toFixed(0)} m`;

  return (
    <div className="w-full">
      <svg
        viewBox="90 130 500 150"
        className="w-full h-auto"
        style={{ maxHeight: "340px" }}
      >
        <defs>
          <linearGradient id="earthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78716c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#78716c" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect x="90" y="130" width="500" height="150" fill="url(#skyGrad)" />

        {/* Earth surface arc */}
        <path
          d={geo.arcPath}
          fill="none"
          stroke="#a8a29e"
          strokeWidth="2.5"
        />

        {/* Hidden surface (dashed, beyond horizon) */}
        <path
          d={geo.hiddenPath}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Earth fill (below the arc) */}
        <path
          d={`${geo.arcPath} L 590,300 L 90,300 Z`}
          fill="url(#earthGrad)"
        />

        {/* Tangent line (line of sight) */}
        <line
          x1={geo.obsX}
          y1={geo.obsY}
          x2={geo.extendedX}
          y2={geo.extendedY}
          stroke="#0f766e"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity="0.8"
        />

        {/* Surface distance arc */}
        <path
          d={geo.surfArcPath}
          fill="none"
          stroke="#c2410c"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Distance label */}
        <text
          x={geo.labelX}
          y={geo.labelY - 4}
          textAnchor="middle"
          className="fill-amber text-[10px] font-mono font-medium"
        >
          d = {distLabel}
        </text>

        {/* Height indicator */}
        <line
          x1={geo.groundX - 8}
          y1={geo.groundY}
          x2={geo.groundX - 8}
          y2={geo.obsY}
          stroke="#78716c"
          strokeWidth="1"
          markerStart="url(#arrowDown)"
          markerEnd="url(#arrowUp)"
        />
        <text
          x={geo.groundX - 14}
          y={geo.heightMidY + 3}
          textAnchor="end"
          className="fill-ink-light text-[9px] font-mono"
        >
          {elevLabel}
        </text>

        {/* Radius indicator */}
        <line
          x1={geo.radX1}
          y1={geo.radY1}
          x2={geo.radX2}
          y2={geo.radY2}
          stroke="#a8a29e"
          strokeWidth="0.8"
          strokeDasharray="3 2"
        />
        <text
          x={(geo.radX1 + geo.radX2) / 2 + 10}
          y={(geo.radY1 + geo.radY2) / 2}
          textAnchor="start"
          className="fill-ink-muted text-[8px] font-mono"
        >
          R
        </text>

        {/* Observer point */}
        <circle
          cx={geo.obsX}
          cy={geo.obsY}
          r="4"
          fill="#0f766e"
          stroke="white"
          strokeWidth="1.5"
        />

        {/* Ground point */}
        <circle
          cx={geo.groundX}
          cy={geo.groundY}
          r="2.5"
          fill="#78716c"
        />

        {/* Tangent/horizon point */}
        <circle
          cx={geo.tangentX}
          cy={geo.tangentY}
          r="3.5"
          fill="#c2410c"
          stroke="white"
          strokeWidth="1.5"
        />

        {/* Labels */}
        <text
          x={geo.obsX - 4}
          y={geo.obsY - 10}
          textAnchor="middle"
          className="fill-teal text-[9px] font-body font-medium"
        >
          Observer
        </text>
        <text
          x={geo.tangentX + 6}
          y={geo.tangentY - 10}
          textAnchor="start"
          className="fill-amber text-[9px] font-body font-medium"
        >
          Horizon
        </text>
      </svg>
    </div>
  );
}
