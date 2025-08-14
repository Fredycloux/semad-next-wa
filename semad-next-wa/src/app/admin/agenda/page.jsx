"use client";

import { useEffect, useState } from "react";

export default function AgendaAdminPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [dentists, setDentists] = useState([]);
  const [procedures, setProcedures] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [d1, d2] = await Promise.all([
          fetch("/api/admin/dentists").then((r) => r.json()),
          fetch("/api/admin/procedures").then((r) => r.json()),
        ]);
        setDentists(d1.items ?? []);
        setProcedures(d2.items ?? []);
      } catch {
        setDentists([]);
        setProcedures([]);
      }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "No se pudo crear la cita");
      setMsg("✅ Cita creada correctamente.");
      e.currentTarget.reset();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white p-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo_semad.png" alt="SEMAD" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold">Crear cita</h1>
            <p className="text-sm text-gray-500">Registra los datos del paciente y agenda su cita.</p>
          </div>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg border px-3 py-2 text-sm border-violet-100 bg-violet-50 text-violet-700">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Paciente (nombre completo)</label>
              <input name="patient" required className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Teléfono (con 57)</label>
              <input name="phone" required className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" placeholder="573001234567" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Documento</label>
              <input name="document" required className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha</label>
                <input type="date" name="date" required className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Hora</label>
                <input type="time" name="time" required className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Odontólogo</label>
            <select name="dentist" required defaultValue="" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300">
              <option value="" disabled>Selecciona un odontólogo</option>
              {dentists.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Motivo</label>
            <select name="reason" required defaultValue="" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300">
              <option value="" disabled>Selecciona el motivo</option>
              {procedures.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Creando…" : "Crear cita"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Recordatorio de WhatsApp: si configuraste el token y el cron, el paciente recibirá un mensaje automático el día anterior.
        </p>
      </div>
    </div>
  );
}
