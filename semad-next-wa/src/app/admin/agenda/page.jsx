"use client";

import { useState } from "react";

const DENTISTS = [
  "Yemina Alandete Garcia",
  "Aldemar Cifuentes",
];

const PROCEDURES = [
  "Consulta",
  "Profilaxis",
  "Resina",
  "Endodoncia unirradicular",
  "Endodoncia multirradicular",
  "Extracción unirradicular",
  "Extracción multirradicular",
  "Extracción de cordales",
  "Corona metal porcelana",
  "Corona zirconio",
  "Diseño en resina",
  "Diseño en cerómero",
  "Diseño en zirconio",
  "Prótesis total superior en acrílico",
  "Prótesis total en alto impacto",
  "Prótesis removible flexible",
  "Ackers flexible",
];

export default function AgendaAdminPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      patient: fd.get("patient"),
      document: fd.get("document"),
      phone: fd.get("phone"),
      date: fd.get("date"),         // yyyy-mm-dd
      time: fd.get("time"),         // hh:mm (24h)
      dentist: fd.get("dentist"),
      reason: fd.get("reason"),
    };

    try {
      const res = await fetch("/api/admin/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No se pudo crear la cita");
      }

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
        {/* Encabezado con logo */}
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo_semad.png" alt="SEMAD" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold">Crear cita</h1>
            <p className="text-sm text-gray-500">
              Registra los datos del paciente y agenda su cita.
            </p>
          </div>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg border px-3 py-2 text-sm
             border-violet-100 bg-violet-50 text-violet-700">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Paciente (nombre completo)
              </label>
              <input
                name="patient"
                required
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Nombre Apellido"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Teléfono (con 57)
              </label>
              <input
                name="phone"
                required
                inputMode="numeric"
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="573001234567"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Documento</label>
              <input
                name="document"
                required
                inputMode="numeric"
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="CC / Doc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Hora</label>
                <input
                  type="time"
                  name="time"
                  required
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
          </div>

          {/* Odontólogo: SELECT */}
          <div>
            <label className="mb-1 block text-sm font-medium">Odontólogo</label>
            <select
              name="dentist"
              required
              defaultValue=""
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="" disabled>Selecciona un odontólogo</option>
              {DENTISTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Motivo: SELECT */}
          <div>
            <label className="mb-1 block text-sm font-medium">Motivo</label>
            <select
              name="reason"
              required
              defaultValue=""
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="" disabled>Selecciona el motivo</option>
              {PROCEDURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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
          Recordatorio de WhatsApp: si configuraste el token y el cron, el paciente recibirá un
          mensaje automático el día anterior.
        </p>
      </div>
    </div>
  );
}
