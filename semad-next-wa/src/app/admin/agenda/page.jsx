"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function CreateAppointmentPage() {
  const [dentists, setDentists] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/catalogs")
      .then(r => r.json())
      .then(data => {
        setDentists(data.dentists || []);
        setProcedures(data.procedures || []);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      patient:  fd.get("patient"),
      phone:    fd.get("phone"),
      document: fd.get("document"),
      date:     fd.get("date"), // 2025-08-14
      time:     fd.get("time"), // 20:42  (o 08:42 p. m., la API lo normaliza)
      dentist:  fd.get("dentist"),
      reason:   fd.get("reason"),
    };

    const res = await fetch("/api/admin/create-appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) alert("Cita creada");
    else alert(`Error al crear cita: ${json.error ?? "desconocido"}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">
      {/* Encabezado con logo y título */}
      <div className="flex items-center gap-3">
        <Image src="/logo_semad.png" alt="SEMAD" width={40} height={40} priority />
        <div>
          <h1 className="text-xl font-semibold leading-tight">Agendamiento de citas</h1>
          <p className="text-sm text-gray-500">Registra los datos del paciente y agenda su cita.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input name="patient"   placeholder="Paciente (nombre completo)" className="w-full border rounded-lg px-3 py-2" required />
        <input name="phone"     placeholder="573001234567"               className="w-full border rounded-lg px-3 py-2" required />
        <input name="document"  placeholder="Documento"                   className="w-full border rounded-lg px-3 py-2" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="date" type="date" className="w-full border rounded-lg px-3 py-2" required />
          <input name="time" type="time" className="w-full border rounded-lg px-3 py-2" required />
        </div>

        <select name="dentist" className="w-full border rounded-lg px-3 py-2" required>
          <option value="">Selecciona odontólogo...</option>
          {dentists.map(d => (
            <option key={d.id ?? d.name} value={d.name}>{d.name}</option>
          ))}
        </select>

        <select name="reason" className="w-full border rounded-lg px-3 py-2" required>
          <option value="">Selecciona procedimiento...</option>
          {procedures.map(p => (
            <option key={p.id ?? p.code ?? p.name} value={p.name}>{p.name}</option>
          ))}
        </select>

        <button disabled={loading} className="rounded-lg bg-violet-600 text-white px-4 py-2">
          {loading ? "Creando..." : "Crear cita"}
        </button>

        <p className="text-xs text-gray-500">
          Recordatorio de WhatsApp: si configuras el token y el cron, el paciente recibirá un mensaje automático el día anterior.
        </p>
      </form>
    </div>
  );
}
