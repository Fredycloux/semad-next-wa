"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CreateAppointmentPage() {
  const router = useRouter();
  const [dentists, setDentists] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(false);

  // estados para los datos del paciente
  const [document, setDocument] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  

  useEffect(() => {
    // cargar listas de odontólogos y procedimientos
    fetch("/api/catalogs")
      .then(r => r.json())
      .then(data => {
        setDentists(data.dentists || []);
        setProcedures(data.procedures || []);
      })
      .catch(() => {});
  }, []);

  /** Busca un paciente existente por documento o teléfono.
   * Si encuentra coincidencia exacta, actualiza los estados del formulario.
   */
  async function fetchPatientData(value) {
    if (!value) return;
    try {
      const res = await fetch(
        `/api/admin/patients/search?q=${encodeURIComponent(value)}`
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
        // Busca coincidencia exacta por documento o teléfono
        const match = data.items.find(
          item => item.document === value || item.phone === value
        );
        if (match) {
          if (match.document) setDocument(match.document);
          if (match.fullName) setPatientName(match.fullName);
          if (match.phone) setPhone(match.phone);
          if (match.email) setEmail(match.email);
        }
      }
    } catch (err) {
      console.error("Error al buscar paciente existente:", err);
    }
  }

  // ejecuta la búsqueda cuando el usuario deja el campo documento o teléfono
  const handleDocumentBlur = () => fetchPatientData(document);
  const handlePhoneBlur = () => fetchPatientData(phone);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      document: fd.get("document"),
      patient: fd.get("patient"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      date: fd.get("date"),
      time: fd.get("time"),
      dentist: fd.get("dentist"),
      reason: fd.get("reason"),
    };

    const res = await fetch("/api/admin/create-appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) {
      alert("Cita creada");
      router.push("/admin/agenda");
    } else {
      alert(`Error al crear cita: ${json.error ?? "desconocido"}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Image
          src="/logo_semad.png"
          alt="SEMAD"
          width={40}
          height={40}
          priority
        />
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            Agendamiento de citas
          </h1>
          <p className="text-sm text-gray-500">
            Registra los datos del paciente y agenda su cita.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* campos controlados para paciente */}
          {/* Poner DOCUMENTO primero */}
        <input
          name="document"
          placeholder="Documento"
          className="w-full border rounded-lg px-3 py-2"
          value={document}
          onChange={e => setDocument(e.target.value)}
          onBlur={handleDocumentBlur}
          required
        />
          {/* Nombre */}
        <input
          name="patient"
          placeholder="Paciente (nombre completo)"
          className="w-full border rounded-lg px-3 py-2"
          value={patientName}
          onChange={e => setPatientName(e.target.value)}
          required
        />
          {/* Teléfono */}
        <input
          name="phone"
          placeholder="573001234567"
          className="w-full border rounded-lg px-3 py-2"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          required
        />
          {/* Correo */}
        <input
          name="email"
          type="email"
          placeholder="Correo electrónico"
          className="w-full border rounded-lg px-3 py-2"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        {/* fecha y hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="date"
            type="date"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <input
            name="time"
            type="time"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        {/* seleccionar odontólogo */}
        <select
          name="dentist"
          className="w-full border rounded-lg px-3 py-2"
          required
        >
          <option value="">Selecciona odontólogo...</option>
          {dentists.map(d => (
            <option key={d.id ?? d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        {/* seleccionar procedimiento */}
        <select
          name="reason"
          className="w-full border rounded-lg px-3 py-2"
          required
        >
          <option value="">Selecciona procedimiento...</option>
          {procedures.map(p => (
            <option key={p.id ?? p.code ?? p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          disabled={loading}
          className="rounded-lg bg-violet-600 text-white px-4 py-2"
        >
          {loading ? "Creando..." : "Crear cita"}
        </button>

        <p className="text-xs text-gray-500">
          Recordatorio de WhatsApp: si configuras el token y el cron, el paciente
          recibirá un mensaje automático el día anterior.
        </p>
      </form>
    </div>
  );
}
