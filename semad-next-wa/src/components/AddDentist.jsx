"use client";

import { useState } from "react";

export default function AddDentist() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/dentists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      location.reload(); // recarga suave
    } else {
      const j = await res.json().catch(() => ({}));
      alert("Error al crear: " + (j.error || res.statusText));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre completo"
        className="w-full rounded-lg border px-3 py-2"
      />
      <button
        disabled={busy}
        className="rounded-lg bg-violet-600 text-white px-4 py-2 disabled:opacity-60"
      >
        {busy ? "Guardando..." : "Agregar"}
      </button>
    </form>
  );
}
