"use client";
import { useEffect, useMemo, useState } from "react";
import ToothSVG from "@/components/ToothSVG";

const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const CHILD_TOP    = ["55","54","53","52","51","61","62","63","64","65"];
const CHILD_BOTTOM = ["85","84","83","82","81","71","72","73","74","75"];

const LABELS = [
  "Caries","Obturación","Endodoncia","Corona",
  "Pérdida","Fractura","Mancha","Dolor","Otro"
];
const COLORS = ["#ef4444","#f59e0b","#10b981","#0ea5e9","#8b5cf6","#6b7280","#111827"];

export default function Odontogram({ patientId, initialDentition="ADULT" }) {
  const [dentition, setDentition] = useState(initialDentition); // "ADULT" | "CHILD"
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [active, setActive] = useState(null);   // { tooth, surface }
  const [label, setLabel] = useState(LABELS[0]);
  const [color, setColor] = useState(COLORS[0]);

  const rows = dentition === "ADULT"
    ? [ADULT_TOP, ADULT_BOTTOM]
    : [CHILD_TOP, CHILD_BOTTOM];

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/odontogram/${patientId}`, { cache: "no-store" });
    const j = await r.json();
    setEntries(j.entries || []);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, [patientId]);

  // agrupar marks por tooth/surface
  const map = useMemo(() => {
    const m = {};
    for (const e of entries) {
      const key = e.tooth;
      m[key] ||= {};
      const surf = e.surface || "O";
      m[key][surf] = { label: e.label, color: e.color, id: e.id };
    }
    return m;
  }, [entries]);

  async function addMark() {
    if (!active?.tooth) return;
    const body = { tooth: active.tooth, surface: active.surface, label, color };
    const r = await fetch(`/api/odontogram/${patientId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.ok) {
      setEntries((p)=>[...p, j.entry]);
      setActive(null);
    } else {
      alert(j.error || "No se pudo guardar");
    }
  }

  async function removeMark(id) {
    const r = await fetch(`/api/odontogram/entry/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (j.ok) setEntries((p)=>p.filter(x=>x.id!==id));
  }

  function onPickSurface(tooth, surface) {
    setActive({ tooth, surface });
  }

  async function saveDentition(next) {
    setDentition(next);
    // opcional: guarda en BD
    try {
      await fetch(`/api/admin/patients/${patientId}/dentition`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentition: next }),
      });
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* Switch Niño/Adulto */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          type="button"
          onClick={()=>saveDentition("ADULT")}
          className={`px-3 py-1 rounded-full border text-sm ${
            dentition==="ADULT" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Adulto
        </button>
        <button
          type="button"
          onClick={()=>saveDentition("CHILD")}
          className={`px-3 py-1 rounded-full border text-sm ${
            dentition==="CHILD" ? "bg-violet-600 text-white" : "bg-white"
          }`}
        >
          Niño
        </button>
      </div>

      {/* Filas superior e inferior */}
      {loading ? (
        <div className="text-sm text-gray-500">Cargando odontograma…</div>
      ) : (
        <>
          {rows.map((row, idx) => (
            <div key={idx}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))` }}
            >
              {/* Para la fila infantil (10 dientes) rellenamos a los lados */}
              {dentition==="CHILD"
                ? (() => {
                    const pad = (16 - row.length) / 2;
                    return [
                      ...Array.from({length: pad}, (_,i)=><div key={"l"+i}/>),
                      ...row.map(t => (
                        <div key={t} className="flex items-center justify-center">
                          <ToothSVG
                            tooth={t}
                            marksBySurface={map[t]}
                            onPick={(surf)=>onPickSurface(t, surf)}
                            selected={active?.tooth===t ? active.surface : null}
                          />
                        </div>
                      )),
                      ...Array.from({length: pad}, (_,i)=><div key={"r"+i}/>)
                    ];
                  })()
                : row.map(t => (
                    <div key={t} className="flex items-center justify-center">
                      <ToothSVG
                        tooth={t}
                        marksBySurface={map[t]}
                        onPick={(surf)=>onPickSurface(t, surf)}
                        selected={active?.tooth===t ? active.surface : null}
                      />
                    </div>
                  ))
              }
            </div>
          ))}
        </>
      )}

      {/* Panel agregar/editar marca */}
      {active && (
        <div className="rounded-xl border p-4 space-y-3 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">Diente {active.tooth} · superficie {active.surface}</div>
            <button className="text-sm text-gray-500 hover:underline"
              onClick={()=>setActive(null)}
            >cerrar</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Diagnóstico</div>
              <select value={label} onChange={e=>setLabel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2">
                {LABELS.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c=>(
                  <button key={c}
                    onClick={()=>setColor(c)}
                    title={c}
                    className={`h-7 w-7 rounded-full border ${color===c?"ring-2 ring-violet-500":""}`}
                    style={{ backgroundColor:c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button onClick={addMark}
                className="w-full rounded-lg bg-violet-600 text-white px-4 py-2">
                Guardar marca
              </button>
            </div>
          </div>

          {/* lista rápida para eliminar (por superficie) */}
          <div className="flex flex-wrap gap-2">
            {(entries.filter(e=>e.tooth===active.tooth) || []).map(e=>(
              <button key={e.id}
                onClick={()=>removeMark(e.id)}
                className="text-[11px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                {e.surface || "O"} · {e.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Haz clic en una zona de la muela para marcar; pulsa en una etiqueta para eliminarla.
      </p>
    </div>
  );
}
