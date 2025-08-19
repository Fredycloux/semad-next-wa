"use client";
import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("es-CO").format(Number(n));
}
function priceLabel(p) {
  if (p.variable) {
    if (p.minPrice && p.maxPrice) return `$ ${fmt(p.minPrice)} – $ ${fmt(p.maxPrice)}${p.unit ? ` (${p.unit})` : ""}`;
    if (p.minPrice)               return `Desde $ ${fmt(p.minPrice)}${p.unit ? ` (${p.unit})` : ""}`;
    return "Variable";
  }
  return p.price != null ? `$ ${fmt(p.price)}${p.unit ? ` (${p.unit})` : ""}` : "—";
}

export default function ProceduresAdminPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  async function load() {
    const r = await fetch("/api/admin/procedures");
    const d = await r.json().catch(() => ({}));
    setItems(d.items ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
      setName("");
      await load();
    } catch (err) {
      alert("No se pudo agregar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    try {
      const res = await fetch(`/api/admin/procedures?id=${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
      load();
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  }

  function startEdit(it) {
    setEditingId(it.id);
    setDraft({
      name: it.name || "",
      code: it.code || "",
      active: it.active ?? true,
      variable: !!it.variable,
      price: it.price ?? "",
      minPrice: it.minPrice ?? "",
      maxPrice: it.maxPrice ?? "",
      unit: it.unit ?? "",
    });
  }
  function cancelEdit() { setEditingId(null); setDraft({}); }

  async function saveEdit(id) {
    const payload = {
      name: draft.name || "",
      code: draft.code || null,
      active: Boolean(draft.active),
      variable: Boolean(draft.variable),
      price: draft.variable ? null : (draft.price === "" ? null : Number(draft.price)),
      minPrice: draft.variable ? (draft.minPrice === "" ? null : Number(draft.minPrice)) : null,
      maxPrice: draft.variable ? (draft.maxPrice === "" ? null : Number(draft.maxPrice)) : null,
      unit: draft.unit ? draft.unit : null,
    };
    try {
      const res = await fetch(`/api/admin/procedures?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
      cancelEdit();
      load();
    } catch (err) {
      alert("No se pudo guardar: " + err.message);
    }
  }

  const ordered = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white p-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="mb-4 text-lg font-semibold">Procedimientos</h1>

        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="Nombre del procedimiento"
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
          {ordered.map((it) => {
            const isEditing = editingId === it.id;
            return (
              <li key={it.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-gray-600">
                      {it.code ? `${it.code} · ` : ""}{priceLabel(it)}{it.active ? "" : " · Inactivo"}
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="shrink-0 flex items-center gap-3">
                      <button onClick={() => startEdit(it)} className="text-sm text-violet-700 hover:underline">Editar</button>
                      <button onClick={() => remove(it.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <div className="text-xs text-gray-500 mb-1">Nombre</div>
                      <input className="w-full border rounded px-2 py-1"
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                    </label>

                    <label className="text-sm">
                      <div className="text-xs text-gray-500 mb-1">Código</div>
                      <input className="w-full border rounded px-2 py-1"
                        value={draft.code}
                        onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} />
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={draft.active}
                        onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} />
                      <span>Activo</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox"
                        checked={draft.variable}
                        onChange={(e) => setDraft((d) => ({
                          ...d,
                          variable: e.target.checked,
                          price: e.target.checked ? "" : d.price,
                          minPrice: e.target.checked ? "" : "",
                          maxPrice: e.target.checked ? "" : "",
                        }))} />
                      <span>Precio variable (rango)</span>
                    </label>

                    {!draft.variable ? (
                      <label className="text-sm">
                        <div className="text-xs text-gray-500 mb-1">Precio fijo</div>
                        <input type="number" className="w-full border rounded px-2 py-1"
                          value={draft.price}
                          onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
                      </label>
                    ) : (
                      <>
                        <label className="text-sm">
                          <div className="text-xs text-gray-500 mb-1">Desde</div>
                          <input type="number" className="w-full border rounded px-2 py-1"
                            value={draft.minPrice}
                            onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))} />
                        </label>
                        <label className="text-sm">
                          <div className="text-xs text-gray-500 mb-1">Hasta (opcional)</div>
                          <input type="number" className="w-full border rounded px-2 py-1"
                            value={draft.maxPrice}
                            onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))} />
                        </label>
                      </>
                    )}

                    <label className="text-sm">
                      <div className="text-xs text-gray-500 mb-1">Unidad (ej. “c/u”)</div>
                      <input className="w-full border rounded px-2 py-1"
                        value={draft.unit}
                        onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} />
                    </label>

                    <div className="sm:col-span-2 flex gap-2 justify-end">
                      <button type="button" onClick={cancelEdit} className="rounded border px-3 py-1.5 text-sm">
                        Cancelar
                      </button>
                      <button type="button" onClick={() => saveEdit(it.id)} className="rounded bg-violet-600 text-white px-3 py-1.5 text-sm">
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {ordered.length === 0 && <li className="p-3 text-sm text-gray-500">Sin registros</li>}
        </ul>
      </div>
    </div>
  );
}
