"use client";
import { useEffect, useMemo, useState } from "react";

// Dientes permanentes en orden FDI visual (arriba y abajo)
const TEETH_TOP = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const TEETH_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

const LABELS = [
  "Caries","Obturación","Endodoncia","Corona","Pérdida","Fractura",
  "Implante","Mancha","Movilidad","Dolor","Otro"
];

const COLORS = ["#ef4444","#f59e0b","#10b981","#0ea5e9","#8b5cf6","#6b7280","#111827"];

export default function Odontogram({ patientId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTooth, setActiveTooth] = useState(null);
  const [label, setLabel] = useState(LABELS[0]);
  const [color, setColor] = useState(COLORS[0]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/odontogram/${patientId}`, { cache: "no-store" });
    const j = await res.json();
    setEntries(j.entries || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  async function addMark() {
    if (!activeTooth) return;
    const res = await fetch(`/api/odontogram/${patientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tooth: activeTooth, label, color }),
    });
    const j = await res.json();
    if (j.ok) {
      setEntries(prev => [...prev, j.entry]);
      setActiveTooth(null);
    } else {
      alert("Error: " + (j.error || "no se pudo guardar"));
    }
  }

  async function removeMark(id) {
    const res = await fetch(`/api/odontogram/entry/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (j.ok) {
      setEntries(prev => prev.filter(e => e.id !== id));
    } else {
      alert("Error: " + (j.error || "no se pudo borrar"));
    }
  }

  // agrupamos por diente para pintar "chips"
  const grouped = useMemo(() => {
    const g = {};
    for (const e of entries) {
      g[e.tooth] ||= [];
      g[e.tooth].push(e);
    }
    return g;
  }, [entries]);

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
        {/* chips */}
        <div className="flex flex-wrap gap-1 px-2">
          {marks.slice(0, 4).map(m => (
            <span
              key={m.id}
              onClick={(e) => { e.stopPropagation(); removeMark(m.id); }}
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
      {loading ? (
        <div className="text-sm text-gray-500">Cargando odontograma…</div>
      ) : (
        <>
          <div className="grid [grid-template-columns:repeat(16,minmax(0,1fr))] gap-2">
            {TEETH_TOP.map(t => <ToothBox key={t} tooth={t} />)}
          </div>
          <div className="grid [grid-template-columns:repeat(16,minmax(0,1fr))] gap-2">
            {TEETH_BOTTOM.map(t => <ToothBox key={t} tooth={t} />)}
          </div>
        </>
      )}

      {/* Panel de edición (flotante) */}
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
                onChange={e => setLabel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <div className="text-xs mb-1 text-gray-500">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`h-7 w-7 rounded-full border ${c === color ? "ring-2 ring-violet-500" : ""}`}
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
        Tip: haz clic sobre un diente para añadir; haz clic en una “chip” para eliminarla.
      </p>
    </div>
  );
}
