"use client";
import { useState } from "react";

// Nomenclatura FDI (ejemplo sencillo 8/8 arriba y 8/8 abajo)
const UPPER = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const LOWER = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

// Paleta rápida
const COLORS = [
  { name: "Azul", v: "#3b82f6" },
  { name: "Verde", v: "#10b981" },
  { name: "Amarillo", v: "#f59e0b" },
  { name: "Rojo", v: "#ef4444" },
  { name: "Morado", v: "#8b5cf6" },
];

export default function Odontogram({ patientId, initial = [] }) {
  const [marks, setMarks] = useState(() => {
    const m = {};
    for (const it of initial) m[it.tooth] = { label: it.label, color: it.color };
    return m;
  });

  async function toggleTooth(tooth) {
    // UI simple: pedir etiqueta y color
    const label = window.prompt(`Etiqueta para diente ${tooth} (vacío = borrar)`, marks[tooth]?.label || "");
    let color = marks[tooth]?.color || COLORS[0].v;
    if (label) {
      const c = window.prompt("Color (hex o deja por defecto)", color);
      if (c) color = c;
    }

    const res = await fetch("/api/admin/odontogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        tooth,
        label: label || null,
        color: label ? color : null,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert("Error: " + (json.error || "desconocido"));
      return;
    }
    setMarks(prev => {
      const next = { ...prev };
      if (!label) delete next[tooth];
      else next[tooth] = { label, color };
      return next;
    });
  }

  const Tooth = ({ id }) => {
    const active = marks[id];
    return (
      <button
        onClick={() => toggleTooth(id)}
        className="w-10 h-10 rounded-full border flex items-center justify-center text-xs hover:shadow"
        style={{ background: active?.color || "white", color: active ? "white" : "inherit" }}
        title={active ? `${id}: ${active.label}` : id}
      >
        {id}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Odontograma</div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2 flex-wrap justify-center">
          {UPPER.map(t => <Tooth key={t} id={t} />)}
        </div>
        <div className="h-3 w-full border-t max-w-md" />
        <div className="flex gap-2 flex-wrap justify-center">
          {LOWER.map(t => <Tooth key={t} id={t} />)}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>Paleta rápida:</span>
        {COLORS.map(c => (
          <span key={c.v} className="px-2 py-1 rounded" style={{ background: c.v, color: "white" }}>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
