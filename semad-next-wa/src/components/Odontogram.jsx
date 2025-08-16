// src/components/Odontogram.jsx
"use client";

import { useMemo, useState } from "react";

type Entry = { tooth: string; surface: string; label: string; color?: string };

const LABELS = ["Caries", "Obturación", "Endodoncia", "Corona", "Fractura", "Pérdida", "Otro"];
const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#6b7280", "#111827"];

// Dientes adulto (FDI)
const ADULT_ROWS: string[][] = [
  ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
];

// Dientes infantil (FDI 51–85)
const CHILD_ROWS: string[][] = [
  ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
  ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
];

// superficies por diente (superior 3, medio 1, inferior 3)
//   M  O  D
//   B/V   L/P
const SURFACES = ["M", "O", "D", "B", "L"] as const;
type Surface = (typeof SURFACES)[number];

export default function Odontogram({
  patientId,
  initialDentition = "ADULT",
  entries = [],
}: {
  patientId: string;
  initialDentition?: "ADULT" | "CHILD";
  entries?: Entry[];
}) {
  const [dentition, setDentition] = useState<"ADULT" | "CHILD">(initialDentition);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<Surface | null>(null);
  const [label, setLabel] = useState<string>(LABELS[0]);
  const [color, setColor] = useState<string>(COLORS[0]);

  // Estructura de marcas: Map<tooth, Map<surface, Entry>>
  const marks = useMemo(() => {
    const map = new Map<string, Map<string, Entry>>();
    for (const e of entries) {
      const m = map.get(e.tooth) ?? new Map<string, Entry>();
      m.set(e.surface ?? "O", e);
      map.set(e.tooth, m);
    }
    return map;
  }, [entries]);

  const rows = dentition === "ADULT" ? ADULT_ROWS : CHILD_ROWS;

  function isMarked(tooth: string, surface: Surface) {
    return marks.get(tooth)?.has(surface) ?? false;
  }

  function surfaceColor(tooth: string, surface: Surface) {
    return marks.get(tooth)?.get(surface)?.color ?? undefined;
  }

  function openPanel(tooth: string, surface: Surface) {
    setSelectedTooth(tooth);
    setSelectedSurface(surface);
    // precarga color/label si ya existe
    const e = marks.get(tooth)?.get(surface);
    if (e?.label) setLabel(e.label);
    if (e?.color) setColor(e.color);
  }

  async function save() {
    if (!selectedTooth || !selectedSurface) return;
    const res = await fetch("/api/odontogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        tooth: selectedTooth,
        surface: selectedSurface,
        label,
        color,
        on: true,
      }),
    });
    const j = await res.json();
    if (!j.ok) return alert(j.error || "Error al guardar");
    location.reload(); // simple revalidación
  }

  async function clear() {
    if (!selectedTooth || !selectedSurface) return;
    const res = await fetch("/api/odontogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        tooth: selectedTooth,
        surface: selectedSurface,
        on: false,
      }),
    });
    const j = await res.json();
    if (!j.ok) return alert(j.error || "Error al eliminar");
    location.reload();
  }

  async function switchDentition(next: "ADULT" | "CHILD") {
    setDentition(next);
    try {
      await fetch(`/api/admin/patients/${patientId}/dentition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentition: next }),
      });
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* switch Niño/Adulto */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          onClick={() => switchDentition("ADULT")}
          className={`px-3 py-1 rounded-full border ${
            dentition === "ADULT" ? "bg-violet-600 text-white" : "bg-white"
          }`}
          type="button"
        >
          Adulto
        </button>
        <button
          onClick={() => switchDentition("CHILD")}
          className={`px-3 py-1 rounded-full border ${
            dentition === "CHILD" ? "bg-violet-600 text-white" : "bg-white"
          }`}
          type="button"
        >
          Niño
        </button>
      </div>

      {/* Rejilla de dientes */}
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
              gap: 8,
            }}
          >
            {row.map((tooth) => (
              <Tooth
                key={tooth}
                tooth={tooth}
                onPick={openPanel}
                isMarked={isMarked}
                getColor={surfaceColor}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Panel de edición */}
      {selectedTooth && selectedSurface && (
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">
              Diente {selectedTooth} · superficie {selectedSurface}
            </div>
            <button onClick={() => { setSelectedTooth(null); setSelectedSurface(null); }} className="text-sm text-gray-500">
              cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Diagnóstico</div>
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
              <div className="text-xs text-gray-500 mb-1">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border ${
                      c === color ? "ring-2 ring-violet-500" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={save}
                className="flex-1 rounded-lg bg-violet-600 text-white px-4 py-2"
              >
                Guardar marca
              </button>
              <button onClick={clear} className="rounded-lg border px-3 py-2">
                Eliminar
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Haz clic en una zona de la muela para marcar; vuelve a abrir y presiona “Eliminar” para quitarla.
          </p>
        </div>
      )}
    </div>
  );
}

function Tooth({
  tooth,
  onPick,
  isMarked,
  getColor,
}: {
  tooth: string;
  onPick: (t: string, s: Surface) => void;
  isMarked: (t: string, s: Surface) => boolean;
  getColor: (t: string, s: Surface) => string | undefined;
}) {
  // Un diente cuadrado con 5 zonas (M,O,D,B,L)
  return (
    <div className="relative h-16 rounded-lg border p-1 grid grid-cols-3 grid-rows-3">
      {/* M */}
      <SurfaceCell
        marked={isMarked(tooth, "M")}
        color={getColor(tooth, "M")}
        onClick={() => onPick(tooth, "M")}
        className="col-span-1 row-span-1"
      />
      {/* O */}
      <SurfaceCell
        marked={isMarked(tooth, "O")}
        color={getColor(tooth, "O")}
        onClick={() => onPick(tooth, "O")}
        className="col-span-1 row-span-1 col-start-2 row-start-2"
      />
      {/* D */}
      <SurfaceCell
        marked={isMarked(tooth, "D")}
        color={getColor(tooth, "D")}
        onClick={() => onPick(tooth, "D")}
        className="col-start-3 row-start-1"
      />
      {/* B/V */}
      <SurfaceCell
        marked={isMarked(tooth, "B")}
        color={getColor(tooth, "B")}
        onClick={() => onPick(tooth, "B")}
        className="col-start-1 row-start-3"
      />
      {/* L/P */}
      <SurfaceCell
        marked={isMarked(tooth, "L")}
        color={getColor(tooth, "L")}
        onClick={() => onPick(tooth, "L")}
        className="col-start-3 row-start-3"
      />
      <div className="absolute top-0.5 left-0.5 text-[10px] text-gray-400">{tooth}</div>
    </div>
  );
}

function SurfaceCell({
  marked,
  color,
  onClick,
  className,
}: {
  marked: boolean;
  color?: string;
  onClick: () => void;
  className?: string;
}) {
  const style = marked
    ? { backgroundColor: (color || "#111827") + "33", borderColor: color || "#111827" }
    : {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`m-0.5 rounded border hover:bg-violet-50 ${className ?? ""}`}
      style={style}
      aria-pressed={marked}
    />
  );
}
