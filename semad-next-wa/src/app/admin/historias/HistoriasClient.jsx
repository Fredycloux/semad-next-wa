// src/app/admin/historias/HistoriasClient.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

export default function HistoriasClient({ q }) {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetch(`/api/admin/patients/search?q=${encodeURIComponent(q || "")}`)
      .then(r => r.json())
      .then(j => setPatients(j.items || []));
  }, [q]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Historias</h1>
        <p className="text-sm text-gray-500">
          Busca por número de documento o nombre y abre la historia clínica.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          className="border rounded-lg px-3 py-2 w-full"
          placeholder="Documento o nombre (ej: 1001234567)"
        />
        <button className="rounded-lg bg-violet-600 text-white px-4">Buscar</button>
      </form>

      <div className="rounded-xl border bg-white/70 backdrop-blur divide-y">
        {patients.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Sin resultados.</div>
        ) : (
          patients.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.fullName}</div>
                <div className="text-sm text-gray-600">
                  {p.document || "—"} · {p.phone || "—"}
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <Link
                  href={`/admin/patients/${p.id}`}
                  className="text-sm text-violet-700 hover:underline"
                >
                  Abrir historia
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
