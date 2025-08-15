"use client";
import React from "react";

// Cada zona del diente como path/rect “clicable”
const SURFACES = [
  { key: "M", title: "Mesial",    d: "M5 20 h10 v20 h-10 z" },
  { key: "D", title: "Distal",    d: "M45 20 h10 v20 h-10 z" },
  { key: "B", title: "Vestibular",d: "M20 5 h20 v10 h-20 z" },
  { key: "L", title: "Lingual",   d: "M20 45 h20 v10 h-20 z" },
  { key: "O", title: "Oclusal",   d: "M20 20 h20 v20 h-20 z" },
];

// Si tu BD no tiene surface, podemos usar solo "O" como superficie única
export default function ToothSVG({
  tooth,
  marksBySurface = {}, // { M:{label,color}, ... }
  onPick,              // (surfaceKey) => void
  size = 64,
  selected = null,     // surface seleccionada
}) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        className="cursor-pointer select-none"
      >
        {/* contorno de muela (simple; se puede estilizar más) */}
        <rect x="5" y="5" width="50" height="50" rx="9" ry="9"
              fill="#fff" stroke="#9ca3af" strokeWidth="2" />

        {SURFACES.map((s) => {
          const m = marksBySurface[s.key];
          const isSel = selected === s.key;
          const fill = m?.color ? m.color + "55" : isSel ? "#7c3aed33" : "#fff";
          const stroke = m?.color || (isSel ? "#7c3aed" : "#9ca3af");

          return (
            <path key={s.key}
              d={s.d}
              title={`${tooth} · ${s.title}${m?.label ? " · "+m.label : ""}`}
              onClick={(e)=>{ e.stopPropagation(); onPick?.(s.key); }}
              style={{ transition: "120ms" }}
              fill={fill}
              stroke={stroke}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      {/* chips encima */}
      <div className="absolute -bottom-1 left-1 right-1 flex flex-wrap gap-1 justify-center">
        {Object.entries(marksBySurface).slice(0,3).map(([k, m]) => (
          <span key={k}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-white"
            title={`${k}: ${m.label}`}
          >
            {k}-{m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
