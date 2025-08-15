"use client";
import { useMemo, useState } from "react";

// ======= catálogos =======
const LABELS = [
  "Caries", "Obturación", "Endodoncia", "Corona", "Pérdida",
  "Fractura", "Implante", "Mancha", "Movilidad", "Dolor", "Otro"
];
const COLORS = ["#ef4444","#f59e0b","#10b981","#0ea5e9","#8b5cf6","#6b7280","#111827"];

// ======= FDI Permanente (Adulto) =======
const ADULT_TEETH = [
  // Superior derecho (18→11)
  ["18","17","16","15","14","13","12","11"],
  // Superior izquierdo (21→28)
  ["21","22","23","24","25","26","27","28"],
  // Inferior izquierdo (38→31)
  ["38","37","36","35","34","33","32","31"],
  // Inferior derecho (41→48)
  ["41","42","43","44","45","46","47","48"],
];

// ======= FDI Temporal (Niño) =======
const CHILD_TEETH = [
  // Superior derecho (55→51)
  ["55","54","53","52","51"],
  // Superior izquierdo (61→65)
  ["61","62","63","64","65"],
  // Inferior izquierdo (75→71)
  ["75","74","73","72","71"],
  // Inferior derecho (81→85)
  ["81","82","83","84","85"],
];

/**
 * props:
 * - patientId (string)
 * - initialDentition: "ADULT" | "CHILD"
 * - entries: [{ id, tooth, label, color }]
 */
export default function Odontogram({
  patientId,
  initialDentition = "ADULT",
  entries = [],
}) {
  const [dentition, setDentition] = useState(initialDentition);
  const [data, setData] = useState(entries);
  const [activeTooth, setActiveTooth] = useState(null);
  const [label, setLabel] = useState(LABELS[0]);
  const [color, setColor] = useState(COLORS[0]);

  // Agrupación por diente para chips
  const grouped = useMemo(() => {
    const g = {};
    for (const e of data) {
      (g[e.tooth] ??= []).push(e);
    }
    return g;
  }, [data]);

  const rows = dentition === "ADULT" ? ADULT_TEETH : CHILD_TEETH;

  // ---- persistir tipo de dentición en el paciente ----
  async function saveDentition(next) {
    setDentition(next);
    try {
      await fetch(`/api/admin/patients/${patientId}/dentition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentition: next }),
      });
    } catch {}
  }

  // ---- crear marca ----
  async function addMark() {
    if (!activeTooth) return;
    try {
      const res = await fetch("/api/admin/odontogram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, tooth: activeTooth, label, color }),
      });
      const j = await res.json();
      if (j.ok && j.entry) {
        setData((prev) => [...prev, j.entry]);
        setActiveTooth(null);
      } else {
        alert("Error: " + (j.error || "no se pudo guardar"));
      }
    } catch (e) {
      alert("Error: " + String(e));
    }
  }

  // ---- borrar marca ----
  async function removeMark(id) {
    try {
      const res = await fetch(`/api/admin/odontogram/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) {
        setData((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert("Error: " + (j.error || "no se pudo borrar"));
      }
    } catch (e) {
      alert("Error: " + String(e));
    }
  }

  // ---- celda diente ----
  function ToothBox({ tooth }) {
    const marks = grouped[tooth] || [];
    const active = activeTooth === tooth;

    return (
      <div
        onClick={() => setActiveTooth(tooth)}
        className={`relative h-16 rounded-lg border flex items-center justify-center cursor-pointer
          ${active ? "ring-2 ring-violet-500" : "hover:bg-gray-50"}`}
        title={`Diente ${tooth}`}
      >
        <div className="absolute top-1 left-1 text-[10px] text-gray-400">{tooth}</div>
        <div className="flex flex-wrap gap-1 px-2">
          {marks.slice(0, 4).map((m) => (
            <span
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                removeMark(m.id);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded-md text-white"
              style={{ backgroundColor: m.color || "#111827" }}
              title={`Eliminar: ${m.label}`}
            >
              {m.label}
            </span>
          ))}
          {marks.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-700">
              +{marks.length - 4}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Switch Niño / Adulto */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          type="button"
          onClick={() => saveDentition("ADULT")}
          className={`rounded-full px-3 py-1 text-sm border ${
            dentition === "ADULT" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Adulto
        </button>
        <button
          type="button"
          onClick={() => saveDentition("CHILD")}
          className={`rounded-full px-3 py-1 text-sm border ${
            dentition === "CHILD" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Niño
        </button>
      </div>

      {/* Grilla (16 columnas). Si es infantil (5 dientes) centramos con “pad” */}
      <div className="inline-grid" style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))`, gap: 8 }}>
        {rows.map((row, idx) => {
          const totalCols = 16;
          const teethCount = row.length;
          const pad = Math.floor((totalCols - teethCount) / 2);
          const cells = Array.from({ length: pad }, () => null)
            .concat(row)
            .concat(Array.from({ length: totalCols - pad - teethCount }, () => null));

          return (
            <div key={idx} className="contents">
              {cells.map((t, i) =>
                t ? (
                  <ToothBox key={t} tooth={t} />
                ) : (
                  <div key={`pad-${i}`} className="h-16" />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Panel de edición */}
      {activeTooth && (
        <div className="rounded-xl border p-3 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Diente {activeTooth}</div>
            <button
              onClick={() => setActiveTooth(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-xs mb-1 text-gray-500">Diagnóstico</div>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs mb-1 text-gray-500">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-7 w-7 rounded-full border ${
                      c === color ? "ring-2 ring-violet-500" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={addMark}
                className="rounded-lg bg-violet-600 text-white px-4 py-2 w-full"
              >
                Agregar marca
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Tip: haz clic sobre un diente para añadir; clic en una “chip” para eliminarla.
      </p>
    </div>
  );
}
