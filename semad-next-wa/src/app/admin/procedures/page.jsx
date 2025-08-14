"use client";
import { useEffect, useState } from "react";

export default function ProceduresAdminPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/procedures");
    const d = await r.json();
    setItems(d.items ?? []);
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await fetch("/api/admin/procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setLoading(false);
    load();
  }

  async function remove(id) {
    await fetch(`/api/admin/procedures?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white p-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="mb-4 text-lg font-semibold">Motivos</h1>

        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="Nombre del motivo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Agregar"}
          </button>
        </form>

        <ul className="divide-y rounded-lg border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between p-3">
              <span>{it.name}</span>
              <button
                onClick={() => remove(it.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="p-3 text-sm text-gray-500">Sin registros</li>
          )}
        </ul>
      </div>
    </div>
  );
}
