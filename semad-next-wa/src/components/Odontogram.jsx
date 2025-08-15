"use client";
import { useState } from "react";

// FDI adulto
const ADULT_TEETH = [
  ["18","17","16","15","14","13","12","11"],
  ["21","22","23","24","25","26","27","28"],
  ["38","37","36","35","34","33","32","31"],
  ["41","42","43","44","45","46","47","48"],
];

// FDI infantil
const CHILD_TEETH = [
  ["55","54","53","52","51"],
  ["61","62","63","64","65"],
  ["75","74","73","72","71"],
  ["81","82","83","84","85"],
];

export default function Odontogram({
  patientId,
  initialDentition = "ADULT", // "ADULT" | "CHILD"
  entries = [],                // [{tooth,label,color}]
}) {
  const [dentition, setDentition] = useState(initialDentition);
  const [marks, setMarks] = useState(() => {
    const map = new Map();
    for (const e of entries) map.set(e.tooth, e);
    return map;
  });

  const rows = dentition === "ADULT" ? ADULT_TEETH : CHILD_TEETH;

  async function toggleDentition(next) {
    setDentition(next);
    try {
      await fetch(`/api/admin/patients/${patientId}/dentition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentition: next }),
      });
    } catch {}
  }

  async function toggleTooth(tooth) {
    const exists = marks.get(tooth);
    const next = exists ? null : { tooth, label: "marcado", color: "#7c3aed" };

    setMarks(prev => {
      const m = new Map(prev);
      if (next) m.set(tooth, next);
      else m.delete(tooth);
      return m;
    });

    try {
      await fetch("/api/admin/odontogram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          tooth,
          label: next ? next.label : null,
          color: next ? next.color : null,
        }),
      });
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          type="button"
          onClick={() => toggleDentition("ADULT")}
          className={`rounded-full px-3 py-1 text-sm border ${
            dentition === "ADULT" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Adulto
        </button>
        <button
          type="button"
          onClick={() => toggleDentition("CHILD")}
          className={`rounded-full px-3 py-1 text-sm border ${
            dentition === "CHILD" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Niño
        </button>
      </div>

      {/* grilla 16 columnas; si la fila tiene 5 dientes (niño), se centra con padding */}
      <div className="inline-grid" style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))`, gap: 8 }}>
        {rows.map((row, idx) => {
          const totalCols = 16;
          const n = row.length;
          const pad = Math.floor((totalCols - n) / 2);
          const cells = Array.from({ length: pad }, () => null)
            .concat(row)
            .concat(Array.from({ length: totalCols - pad - n }, () => null));

          return (
            <div key={idx} className="contents">
              {cells.map((t, i) => {
                if (!t) return <div key={i} className="h-10" />;
                const active = marks.has(t);
                const color = active ? marks.get(t).color : undefined;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    className={`h-10 rounded border text-xs font-medium
                                hover:bg-violet-50 focus:outline-none
                                ${active ? "ring-2 ring-violet-500 bg-violet-100" : "bg-white"}`}
                    style={active && color ? { backgroundColor: color + "22", borderColor: color } : undefined}
                    title={t}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
