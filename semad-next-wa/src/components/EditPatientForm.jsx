"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function calcAge(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
  return age >= 0 ? age : "";
}

export default function EditPatientForm({ patient }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName:    patient.fullName || "",
    document:    patient.document || "",
    phone:       patient.phone || "",
    email:       patient.email || "",
    insurer:     patient.insurer || "",
    allergies:   patient.allergies || "",
    history:     patient.history || "",
    dateOfBirth: patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toISOString().slice(0, 10)
      : "",
    sex:        patient.sex || "",
    pregnant:   Boolean(patient.pregnant) || false,
  });

  const age = useMemo(() => calcAge(form.dateOfBirth), [form.dateOfBirth]);
  const showPregnant = form.sex === "FEMALE";

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  const nullifyEmpty = (x) => (x === "" ? null : x);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName:    form.fullName,
        document:    nullifyEmpty(form.document),
        phone:       nullifyEmpty(form.phone),
        email:       nullifyEmpty(form.email),
        insurer:     nullifyEmpty(form.insurer),
        allergies:   nullifyEmpty(form.allergies),
        history:     nullifyEmpty(form.history),
        dateOfBirth: nullifyEmpty(form.dateOfBirth),
        sex:         nullifyEmpty(form.sex),
        pregnant:    showPregnant ? Boolean(form.pregnant) : false,
      };

      const res = await fetch(`/api/admin/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || res.statusText);

      alert("Paciente actualizado");
      router.refresh();
    } catch (err) {
      alert("Error: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Nombre completo */}
        <label htmlFor="fullName" className="space-y-1 text-sm">
          <span className="block text-gray-600">Nombre completo</span>
          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
            required
          />
        </label>

        {/* Documento */}
        <label htmlFor="document" className="space-y-1 text-sm">
          <span className="block text-gray-600">Documento</span>
          <input
            id="document"
            name="document"
            value={form.document}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </label>

        {/* Teléfono */}
        <label htmlFor="phone" className="space-y-1 text-sm">
          <span className="block text-gray-600">Teléfono</span>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </label>

        {/* Email */}
        <label htmlFor="email" className="space-y-1 text-sm">
          <span className="block text-gray-600">Email</span>
          <input
            id="email"
            name="email"
            value={form.email}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
            type="email"
          />
        </label>

        {/* Fecha de nacimiento */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <label htmlFor="dateOfBirth" className="space-y-1 text-sm">
            <span className="block text-gray-600">Fecha de nacimiento</span>
            <input
              id="dateOfBirth"
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth || ""}
              onChange={onChange}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </label>

          {/* Edad (solo lectura) */}
          <label className="space-y-1 text-sm">
            <span className="block text-gray-600">Edad</span>
            <input
              disabled
              className="border rounded-lg px-3 py-2 w-full bg-gray-50"
              value={age !== "" ? `${age} años` : ""}
            />
          </label>
        </div>

        {/* Sexo */}
        <label htmlFor="sex" className="space-y-1 text-sm">
          <span className="block text-gray-600">Sexo</span>
          <select
            id="sex"
            name="sex"
            value={form.sex}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">—</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
            <option value="OTHER">Otro</option>
          </select>
        </label>

        {/* Embarazo (solo si es Femenino) */}
        {showPregnant && (
          <label htmlFor="pregnant" className="space-y-1 text-sm flex items-center gap-2">
            <input
              id="pregnant"
              type="checkbox"
              name="pregnant"
              checked={Boolean(form.pregnant)}
              onChange={onChange}
              className="h-4 w-4"
            />
            <span className="text-gray-600">Embarazo</span>
          </label>
        )}

        {/* EPS */}
        <label htmlFor="insurer" className="space-y-1 text-sm sm:col-span-2">
          <span className="block text-gray-600">EPS</span>
          <input
            id="insurer"
            name="insurer"
            value={form.insurer}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </label>

        {/* Alergias */}
        <label htmlFor="allergies" className="space-y-1 text-sm sm:col-span-2">
          <span className="block text-gray-600">Alergias</span>
          <input
            id="allergies"
            name="allergies"
            value={form.allergies}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </label>

        {/* Antecedentes / Notas */}
        <label htmlFor="history" className="space-y-1 text-sm sm:col-span-2">
          <span className="block text-gray-600">Antecedentes / Notas</span>
          <textarea
            id="history"
            name="history"
            value={form.history}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
            rows={3}
          />
        </label>
      </div>

      <button
        disabled={saving}
        className="rounded-lg bg-violet-600 text-white px-4 py-2"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
