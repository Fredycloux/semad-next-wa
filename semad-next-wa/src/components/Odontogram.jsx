"use client";

import { useMemo, useState } from "react";

// 4 filas de dientes por orden FDI visual
const ADULT_ROWS = [
  ["18","17","16","15","14","13","12","11"],
  ["21","22","23","24","25","26","27","28"],
  ["38","37","36","35","34","33","32","31"],
  ["41","42","43","44","45","46","47","48"],
];

const CHILD_ROWS = [
  ["55","54","53","52","51"],
  ["61","62","63","64","65"],
  ["75","74","73","72","71"],
  ["81","82","83","84","85"],
];

const SURFACES = ["V","M","O","D","L"]; // arriba, izq, centro, dcha, abajo
const LABELS = ["Caries","Obturación","Endodoncia","Corona","Pérdida","Fractura","Implante","Mancha","Movilidad","Dolor","Otro"];
const COLORS  = ["#ef4444","#f59e0b","#10b981","#0ea5e9","#8b5cf6","#6b7280","#111827"];

function withAlpha(hex, alpha = "33") {
  // #RRGGBB -> #RRGGBBAA
  if (!hex || !hex.startsWith("#") || hex.length < 7) return hex;
  return hex.length === 7 ? hex + alpha : hex;
}

export default function Odontogram({ patientId, initialDentition = "ADULT", entries = [] }) {
  // marks: Map key = `${tooth}:${surface}` -> {tooth, surface, label, color}
  const [marks, setMarks] = useState(() => {
    const m = new Map();
    (entries || []).forEach(e => m.set(`${e.tooth}:${e.surface}`, e));
    return m;
  });

  const [dentition, setDentition] = useState(initialDentition);
  const rows = dentition === "ADULT" ? ADULT_ROWS : CHILD_ROWS;

  const [active, setActive] = useState(null); // { tooth, surface }
  const [label, setLabel] = useState(LABELS[0]);
  const [color, setColor] = useState(COLORS[0]);

  async function switchDentition(next) {
    setDentition(next);
    try {
      await fetch(`/api/admin/patients/${patientId}/dentition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentition: next }),
      });
    } catch {}
  }

  function isMarked(t, s) {
    return marks.has(`${t}:${s}`);
  }

  function getMark(t, s) {
    return marks.get(`${t}:${s}`);
  }

  function onClickSurface(tooth, surface) {
    // abre el panel con la superficie seleccionada
    setActive({ tooth, surface });
    // si ya hay una marca, precarga sus valores
    const m = getMark(tooth, surface);
    if (m) {
      if (m.label) setLabel(m.label);
      if (m.color) setColor(m.color);
    }
  }

  async function saveMark() {
    if (!active) return;
    const { tooth, surface } = active;

    // upsert en backend
    const res = await fetch("/api/admin/odontogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, tooth, surface, label, color, on: true }),
    });
    const j = await res.json();
    if (!j.ok) return alert("Error: " + (j.error || "no se pudo guardar"));

    setMarks(prev => {
      const m = new Map(prev);
      m.set(`${tooth}:${surface}`, { tooth, surface, label, color });
      return m;
    });
    setActive(null);
  }

  async function removeMark(tooth, surface) {
    // borrar backend
    await fetch("/api/admin/odontogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, tooth, surface, on: false }),
    });

    setMarks(prev => {
      const m = new Map(prev);
      m.delete(`${tooth}:${surface}`);
      return m;
    });
  }

  return (
    <div className="space-y-3">
      {/* Switch */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          type="button"
          onClick={() => switchDentition("ADULT")}
          className={`rounded-full px-3 py-1 text-sm border ${dentition === "ADULT" ? "bg-violet-600 text-white" : "bg-white"}`}
        >Adulto</button>
        <button
          type="button"
          onClick={() => switchDentition("CHILD")}
          className={`rounded-full px-3 py-1 text-sm border ${dentition === "CHILD" ? "bg-violet-600 text-white" : "bg-white"}`}
        >Niño</button>
      </div>

      {/* Grilla de dientes */}
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="grid" style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))`, gap: 8 }}>
            {(() => {
              const total = 16;
              const pad = Math.floor((total - row.length) / 2);
              const leftPad = Array.from({ length: pad }).map((_, i) => <div key={`l${i}`} className="h-12" />);
              const rightPad = Array.from({ length: total - row.length - pad }).map((_, i) => <div key={`r${i}`} className="h-12" />);
              return [
                ...leftPad,
                ...row.map(t => (
                  <Tooth
                    key={t}
                    tooth={t}
                    getMark={getMark}
                    isMarked={isMarked}
                    onClickSurface={onClickSurface}
                    removeMark={removeMark}
                  />
                )),
                ...rightPad,
              ];
            })()}
          </div>
        ))}
      </div>

      {/* Panel de edición */}
      {active && (
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">
              Diente {active.tooth} · superficie {active.surface}
            </div>
            <button onClick={() => setActive(null)} className="text-sm text-gray-500 hover:underline">cerrar</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-xs mb-1 text-gray-500">Diagnóstico</div>
              <select value={label} onChange={e => setLabel(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <div className="text-xs mb-1 text-gray-500">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={`h-7 w-7 rounded-full border ${c === color ? "ring-2 ring-violet-500" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button onClick={saveMark} className="rounded-lg bg-violet-600 text-white px-4 py-2 w-full">
                Guardar marca
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Tip: pulsa otra vez sobre una superficie marcada (pastilla) para eliminarla.
          </p>
        </div>
      )}
    </div>
  );
}

/** Un “diente” en 3x3: V arriba, L abajo, M izq, D dcha, O centro */
function Tooth({ tooth, getMark, isMarked, onClickSurface, removeMark }) {
  return (
    <div className="relative h-12 w-full">
      <div
        className="grid h-full w-full rounded-lg border bg-white"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 2 }}
        title={`Diente ${tooth}`}
      >
        {[
          { s: "V", r: 1, c: 2 },
          { s: "M", r: 2, c: 1 },
          { s: "O", r: 2, c: 2 },
          { s: "D", r: 2, c: 3 },
          { s: "L", r: 3, c: 2 },
        ].map(({ s, r, c }) => {
          const marked = isMarked(tooth, s);
          const mark = marked ? getMark(tooth, s) : null;
          const style = marked && mark?.color
            ? { backgroundColor: withAlpha(mark.color, "33"), borderColor: mark.color }
            : undefined;

          return (
            <button
              key={s}
              type="button"
              onClick={() => (marked ? removeMark(tooth, s) : onClickSurface(tooth, s))}
              className={`rounded border aspect-square text-[10px] flex items-center justify-center select-none ${marked ? "ring-[1.5px] ring-violet-500" : "hover:bg-gray-50"}`}
              style={{ gridRow: r, gridColumn: c, ...style }}
            >
              {marked && (
                <span className="px-1.5 py-0.5 rounded bg-gray-900 text-white">
                  {s}·{mark?.label || "marcado"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute -bottom-4 left-0 right-0 text-center text-[10px] text-gray-500">
        {tooth}
      </div>
    </div>
  );
}
