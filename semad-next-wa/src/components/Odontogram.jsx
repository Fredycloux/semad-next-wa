"use client";

import { useEffect, useMemo, useState } from "react";

// ------- catálogo ----------
const LABELS = [
  "Caries",
  "Obturación",
  "Endodoncia",
  "Corona",
  "Fractura",
  "Pérdida",
  "Otro",
];

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#6b7280", "#111827"];

// FDI adulto (dos filas de 16)
const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

// FDI infantil (dos filas centradas de 10: 55→51 y 61→65; 85→81 y 71→75)
const CHILD_TOP    = ["55","54","53","52","51","61","62","63","64","65"];
const CHILD_BOTTOM = ["85","84","83","82","81","71","72","73","74","75"];

// superficies válidas (en BD: O, M, D, B, L)
const SURFACES = ["O", "M", "D", "B", "L"];

export default function Odontogram({ patientId, initialDentition = "ADULT", entries = [] }) {
  // estado UI
  const [dentition, setDentition] = useState(initialDentition === "CHILD" ? "CHILD" : "ADULT");
  const [label, setLabel]   = useState(LABELS[0]);          // diagnóstico para NUEVAS marcas
  const [color, setColor]   = useState(COLORS[0]);          // color para NUEVAS marcas
  const [loading, setLoading] = useState(true);

  // mapa de marcas existentes: key = `${tooth}|${surface}` -> { id?, tooth, surface, label, color }
  const [marks, setMarks] = useState(() => {
    const m = new Map();
    (entries || []).forEach(e => {
      const s = (e.surface || "O").toUpperCase();
      const key = `${e.tooth}|${s}`;
      m.set(key, { ...e, surface: s });
    });
    return m;
  });

  // cargar del servidor
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/odontogram/${patientId}`, { cache: "no-store" });
        const j = await res.json();
        if (!alive) return;
        const m = new Map();
        (j.entries || []).forEach(e => {
          const s = (e.surface || "O").toUpperCase();
          m.set(`${e.tooth}|${s}`, { ...e, surface: s });
        });
        setMarks(m);
      } catch {
        // ignora
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [patientId]);

  // persistir dentición (si existe la ruta; si no, ignora error)
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

  // alternar una marca en diente/superficie
  async function toggleSurface(tooth, surface) {
    const s = surface.toUpperCase();
    if (!SURFACES.includes(s)) return;

    const key = `${tooth}|${s}`;
    const exists = marks.get(key);

    // Optimista
    setMarks(prev => {
      const m = new Map(prev);
      if (exists) m.delete(key);
      else m.set(key, { tooth, surface: s, label, color }); // guarda el color seleccionado SOLO para la nueva marca
      return m;
    });

    try {
      const res = await fetch("/api/odontogram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          tooth,
          surface: s,
          label,
          color,
          on: !exists, // crear o borrar
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "error");

      // si creó, asegúrate de guardar el id/valores retornados (mantiene entry.color propio)
      if (!exists && j.entry) {
        setMarks(prev => {
          const m = new Map(prev);
          const entry = { ...j.entry, surface: (j.entry.surface || s).toUpperCase() };
          m.set(`${entry.tooth}|${entry.surface}`, entry);
          return m;
        });
      }
    } catch (e) {
      // revertir si falló
      setMarks(prev => {
        const m = new Map(prev);
        if (exists) m.set(key, exists);
        else m.delete(key);
        return m;
      });
      alert("No se pudo guardar: " + e.message);
    }
  }

  // helper: entry de una superficie
  function getEntry(tooth, surface) {
    return marks.get(`${tooth}|${surface}`);
  }

  // ---------- Diente SVG con 5 zonas ----------
  function ToothSVG({ tooth, size = 52 }) {
    const pad = 2;
    const w = size, h = size;

    // zonas como rectángulos
    const centerSize = w * 0.36;
    const side = (w - centerSize - pad * 2) / 2;

    const cx = (w - centerSize) / 2;
    const cy = (h - centerSize) / 2;

    // color propio de la marca (no el selector global)
    const fill = (surf) => {
      const entry = getEntry(tooth, surf);
      return entry ? `${entry.color || "#7c3aed"}22` : "#ffffff";
    };
    const stroke = (surf) => {
      const entry = getEntry(tooth, surf);
      return entry ? (entry.color || "#7c3aed") : "#CBD5E1";
    };

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* borde del diente */}
        <rect x="0.5" y="0.5" width={w-1} height={h-1} rx="8" ry="8" fill="#fff" stroke="#E5E7EB" />

        {/* B = arriba (Buccal/Vestibular) */}
        <rect
          x={pad} y={pad} width={w - pad * 2} height={side}
          fill={fill("B")} stroke={stroke("B")}
          onClick={() => toggleSurface(tooth, "B")}
          style={{ cursor: "pointer" }}
        />
        {/* L = abajo (Lingual/Palatino) */}
        <rect
          x={pad} y={h - pad - side} width={w - pad * 2} height={side}
          fill={fill("L")} stroke={stroke("L")}
          onClick={() => toggleSurface(tooth, "L")}
          style={{ cursor: "pointer" }}
        />
        {/* M = izquierda */}
        <rect
          x={pad} y={cy} width={side} height={centerSize}
          fill={fill("M")} stroke={stroke("M")}
          onClick={() => toggleSurface(tooth, "M")}
          style={{ cursor: "pointer" }}
        />
        {/* D = derecha */}
        <rect
          x={w - pad - side} y={cy} width={side} height={centerSize}
          fill={fill("D")} stroke={stroke("D")}
          onClick={() => toggleSurface(tooth, "D")}
          style={{ cursor: "pointer" }}
        />
        {/* O = centro (Oclusal/Incisal) */}
        <rect
          x={cx} y={cy} width={centerSize} height={centerSize} rx="6"
          fill={fill("O")} stroke={stroke("O")}
          onClick={() => toggleSurface(tooth, "O")}
          style={{ cursor: "pointer" }}
        />

        {/* número del diente */}
        <text x={w - 6} y={h - 6} textAnchor="end" fontSize="9" fill="#9CA3AF">
          {tooth}
        </text>
      </svg>
    );
  }

  // Layout de dientes por dentición
  const rows = useMemo(() => {
    if (dentition === "ADULT") return [ADULT_TOP, ADULT_BOTTOM];
    // centrado infantil: 10 dientes por fila -> paddings a 16 columnas
    const pad = (arr) => {
      const total = 16, n = arr.length;
      const left = Math.floor((total - n) / 2);
      return Array.from({ length: left }, () => null)
        .concat(arr)
        .concat(Array.from({ length: total - left - n }, () => null));
    };
    return [pad(CHILD_TOP), pad(CHILD_BOTTOM)];
  }, [dentition]);

  return (
    <div className="space-y-4">
      {/* Switch Niño/Adulto */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Dentición:</span>
        <button
          type="button"
          onClick={() => switchDentition("ADULT")}
          className={`rounded-full px-3 py-1 text-sm border ${dentition === "ADULT" ? "bg-violet-600 text-white" : "bg-white"}`}
        >
          Adulto
        </button>
        <button
          type="button"
          onClick={() => switchDentition("CHILD")}
          className={`rounded-full px-3 py-1 text-sm border ${dentition === "CHILD" ? "bg-violet-600 text-white" : "bg-white"}`}
        >
          Niño
        </button>
      </div>

      {/* controles de etiqueta/color */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-xs mb-1 text-gray-500">Diagnóstico</div>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs mb-1 text-gray-500">Color</div>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`h-7 w-7 rounded-full border ${c === color ? "ring-2 ring-violet-500" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* grilla de dientes */}
      {loading ? (
        <div className="text-sm text-gray-500">Cargando odontograma…</div>
      ) : (
        <>
          {rows.map((row, idx) => (
            <div key={idx} className="grid [grid-template-columns:repeat(16,minmax(0,1fr))] gap-2">
              {row.map((t, i) =>
                t ? (
                  <div key={t} className="rounded-lg border bg-white/60 backdrop-blur flex items-center justify-center">
                    <ToothSVG tooth={t} />
                  </div>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          ))}
        </>
      )}

      <p className="text-xs text-gray-500">
        Click una zona para alternar. Se guarda automáticamente por diente/superficie.
      </p>
    </div>
  );
}
