"use client";

import { useState } from "react";
import Link from "next/link";

export default function HistoriasPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  async function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patients/by-document?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const j = await res.json();
      setResults(j.patients || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Historias</h1>
        <p className="text-sm text-gray-500">Busca por número de cédula (documento).</p>
      </div>

      <form onSubmit={onSearch} className="flex gap-2 max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Ej: 12345678"
        />
        <button className="rounded-lg bg-violet-600 text-white px-4 py-2" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      <div className="grid gap-2 max-w-2xl">
        {results.length === 0 ? (
          <div className="text-sm text-gray-500">Sin resultados.</div>
        ) : results.map(p => (
          <div key={p.id} className="border rounded-lg px-3 py-2 bg-white/70">
            <div className="font-medium">{p.fullName}</div>
            <div className="text-sm text-gray-600">
              {p.document || "—"} · {p.phone || "sin teléfono"}
            </div>
            <div className="mt-2">
              <Link href={`/admin/patients/${p.id}`} className="text-violet-700 hover:underline text-sm">
                Abrir historia
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
