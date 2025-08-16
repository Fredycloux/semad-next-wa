"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditPatientForm({ patient }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName:  fd.get("fullName"),
      document:  fd.get("document") || null,
      phone:     fd.get("phone") || null,
      email:     fd.get("email") || null,
      insurer:   fd.get("insurer") || null,
      allergies: fd.get("allergies") || null,
      history:   fd.get("history") || null,
    };

    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      alert("Paciente actualizado");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert("Error: " + (j.error || res.statusText));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="fullName" defaultValue={patient.fullName || ""} className="border rounded-lg px-3 py-2" placeholder="Nombre completo" required />
        <input name="document" defaultValue={patient.document || ""} className="border rounded-lg px-3 py-2" placeholder="Documento" />
        <input name="phone"    defaultValue={patient.phone || ""}    className="border rounded-lg px-3 py-2" placeholder="Teléfono" />
        <input name="email"    defaultValue={patient.email || ""}    className="border rounded-lg px-3 py-2" placeholder="Email" />
        <input name="insurer"  defaultValue={patient.insurer || ""}  className="border rounded-lg px-3 py-2" placeholder="EPS" />
      </div>
      <textarea name="allergies" defaultValue={patient.allergies || ""} className="w-full border rounded-lg px-3 py-2" placeholder="Alergias" rows={2} />
      <textarea name="history"   defaultValue={patient.history || ""}   className="w-full border rounded-lg px-3 py-2" placeholder="Antecedentes / Notas" rows={4} />
      <button disabled={saving} className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
