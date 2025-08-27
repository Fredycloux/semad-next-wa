"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Página pública para que el paciente solicite una cita. Este formulario
 * recoge identificación, nombre, teléfono, correo y motivo de la consulta,
 * y envía los datos al endpoint `/api/request-appointment`. Si la
 * operación es exitosa se muestra un mensaje de confirmación y se
 * restablece el formulario.
 */
export default function RequestAppointmentPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/request-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, document, phone, email, reason }),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmitted(true);
        // limpiar campos
        setFullName("");
        setDocument("");
        setPhone("");
        setEmail("");
        setReason("");
      } else {
        setError(json.error || "Ocurrió un error");
      }
    } catch (e) {
      setError("Error al enviar solicitud");
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <h1 className="text-xl font-semibold">Solicitud enviada</h1>
        <p>
          ¡Gracias por solicitar una cita! Revisaremos tu solicitud y nos
          pondremos en contacto contigo para asignarte una fecha y hora.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-md bg-violet-600 text-white px-4 py-2"
        >
          Volver a inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Solicitar cita</h1>
      <p className="text-sm text-gray-600">
        Completa los datos a continuación para solicitar una cita. Un miembro de
        nuestro equipo se pondrá en contacto contigo para confirmar tu
        agendamiento.
      </p>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded-md">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="fullName"
          placeholder="Nombre completo"
          className="w-full border rounded-lg px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="text"
          name="document"
          placeholder="Documento de identidad"
          className="w-full border rounded-lg px-3 py-2"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
        />
        <input
          type="tel"
          name="phone"
          placeholder="Teléfono (E.164)"
          className="w-full border rounded-lg px-3 py-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          className="w-full border rounded-lg px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          name="reason"
          placeholder="Motivo de la consulta"
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-violet-600 text-white px-4 py-2"
        >
          Enviar solicitud
        </button>
      </form>
      <button
        onClick={() => router.push("/")}
        className="text-sm text-violet-600 underline"
      >
        Volver al inicio
      </button>
    </div>
  );
}
