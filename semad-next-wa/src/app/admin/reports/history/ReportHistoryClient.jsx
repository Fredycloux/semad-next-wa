"use client";

import { useEffect, useState } from "react";

export default function ReportHistoryClient() {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null); // { id, fullName, document }

  // Buscar pacientes
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setOptions([]); return; }
      try {
        const r = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(term)}`);
        const j = await r.json();
        setOptions(j.items || []);
      } catch { setOptions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reportes · Historias / Odontograma</h1>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Paciente</div>

        {!selected ? (
          <>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por cédula o nombre…"
              className="w-full border rounded-lg px-3 py-2"
            />
            {options.length > 0 && (
              <ul className="rounded-lg border divide-y">
                {options.map(p => (
                  <li
                    key={p.id}
                    className="p-2 hover:bg-violet-50 cursor-pointer"
                    onClick={() => { setSelected(p); setOptions([]); setQ(""); }}
                  >
                    <div className="font-medium">{p.fullName}</div>
                    <div className="text-xs text-gray-600">
                      {p.document || "—"} {p.phone ? `· ${p.phone}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <div className="font-medium">{selected.fullName}</div>
              <div className="text-xs text-gray-600">
                {selected.document || "—"} {selected.phone ? `· ${selected.phone}` : ""}
              </div>
            </div>
            <button className="text-sm text-violet-700 hover:underline" onClick={() => setSelected(null)}>
              Cambiar
            </button>
          </div>
        )}

        {selected && (
          <div className="pt-2">
            <a
              href={`/api/admin/patients/${selected.id}/history/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
            >
              Descargar PDF
            </a>
          </div>
        )}

        <p className="text-xs text-gray-500">
          El PDF incluye datos del paciente, odontograma y detalle clínico (última consulta, consultas previas y citas).
        </p>
      </section>
    </div>
  );
}
