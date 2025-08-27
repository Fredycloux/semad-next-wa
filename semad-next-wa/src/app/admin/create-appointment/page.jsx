"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CreateAppointmentPage() {
  const router = useRouter();
  const [dentists, setDentists] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para los datos del paciente
  const [document, setDocument] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [requestReason, setRequestReason] = useState("");  // para mostrar el motivo
  const [requests, setRequests] = useState([]);

  // --- función reutilizable para cargar solicitudes sin caché ---
  const loadRequests = async () => {
    try {
      const r = await fetch("/api/admin/appointment-requests", {
        cache: "no-store",
      });
      const d = await r.json();
      setRequests(d?.ok ? d.items || [] : []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    // cargar listas de odontólogos y procedimientos (sin caché)
    fetch("/api/catalogs", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setDentists(data.dentists || []);
        setProcedures(data.procedures || []);
      })
      .catch(() => {});

    // cargar solicitudes de cita pendientes
    loadRequests();

    // recargar solicitudes cuando la pestaña recupere el foco
    const onFocus = () => loadRequests();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /** Busca un paciente existente por documento o teléfono y rellena el form */
  async function fetchPatientData(value) {
    if (!value) return;
    try {
      const res = await fetch(
        `/api/admin/patients/search?q=${encodeURIComponent(value)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
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

  const handleDocumentBlur = () => fetchPatientData(document);
  const handlePhoneBlur = () => fetchPatientData(phone);

  /** Selección de una solicitud pendiente */
  async function handleSelectRequest(reqItem) {
    setPatientName(reqItem.fullName || "");
    setDocument(reqItem.document || "");
    setPhone(reqItem.phone || "");
    setEmail(reqItem.email || "");
    setRequestReason(reqItem.reason || "");

    try {
      await fetch(`/api/admin/appointment-requests/${reqItem.id}`, {
        method: "DELETE",
      });
      // actualiza la lista local y vuelve a consultar por si hay cambios en paralelo
      setRequests(prev => prev.filter(i => i.id !== reqItem.id));
      await loadRequests();
    } catch (err) {
      console.error("Error al eliminar solicitud:", err);
    }
  }

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
      // sincroniza solicitudes por si permanecieras en la misma vista
      await loadRequests();
      alert("Cita creada");
      // volver a Agenda invalidando la caché del router
      router.replace("/admin/agenda");
      router.refresh();
      // (alternativa: router.replace(`/admin/agenda?ts=${Date.now()}`))
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

      {/* Listado de solicitudes pendientes */}
      {requests.length > 0 && (
        <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
          <h2 className="text-md font-medium mb-2">Solicitudes pendientes</h2>
          <ul className="space-y-1 max-h-48 overflow-auto">
            {requests.map(req => (
              <li
                key={req.id}
                className="p-2 cursor-pointer hover:bg-violet-100 rounded"
                onClick={() => handleSelectRequest(req)}
              >
                <span className="font-medium">{req.fullName}</span>{" "}
                - {req.reason || "(sin motivo)"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Haz clic en una solicitud para cargar sus datos.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Documento */}
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

        {/* Motivo de la solicitud seleccionado, solo informativo */}
        {requestReason && (
          <p className="text-sm text-gray-500">
            Motivo solicitado: {requestReason}
          </p>
        )}

        <button
          disabled={loading}
          className="rounded-lg bg-violet-600 text-white px-4 py-2"
        >
          {loading ? "Creando..." : "Crear cita"}
        </button>

        <p className="text-xs text-gray-500">
          Recordatorio de WhatsApp: si configuras el token y el cron, el
          paciente recibirá un mensaje automático el día anterior.
        </p>
      </form>
    </div>
  );
}
