"use client";

import { useState } from "react";

export default function EditPatientForm({ patient }) {
  const [form, setForm] = useState({
    fullName: patient.fullName || "",
    document: patient.document || "",
    phone: patient.phone || "",
    email: patient.email || "",
    insurer: patient.insurer || "",
    allergies: patient.allergies || "",
    history: patient.history || "",
  });

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.ok) alert("Datos del paciente guardados");
    else alert("No se pudo guardar");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <input name="fullName" value={form.fullName} onChange={change}
          placeholder="Nombre completo" className="border rounded-lg px-3 py-2" />
        <input name="document" value={form.document} onChange={change}
          placeholder="Documento" className="border rounded-lg px-3 py-2" />
        <input name="phone" value={form.phone} onChange={change}
          placeholder="Teléfono" className="border rounded-lg px-3 py-2" />
        <input name="email" value={form.email} onChange={change}
          placeholder="Email" className="border rounded-lg px-3 py-2" />
        <input name="insurer" value={form.insurer} onChange={change}
          placeholder="Aseguradora" className="border rounded-lg px-3 py-2" />
      </div>

      <textarea name="allergies" value={form.allergies} onChange={change}
        placeholder="Alergias" className="border rounded-lg px-3 py-2 min-h-[72px]" />

      <textarea name="history" value={form.history} onChange={change}
        placeholder="Antecedentes / historia general"
        className="border rounded-lg px-3 py-2 min-h-[120px]" />

      <button className="self-start rounded-lg bg-violet-600 text-white px-4 py-2">
        Guardar
      </button>
    </form>
  );
}
