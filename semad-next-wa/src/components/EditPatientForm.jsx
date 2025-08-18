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

  function nullifyEmpty(x) {
    return x === "" ? null : x;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // normalizamos payload ("" -> null). El API ya acepta PUT/PATCH.
      const payload = {
        fullName:    form.fullName,
        document:    nullifyEmpty(form.document),
        phone:       nullifyEmpty(form.phone),
        email:       nullifyEmpty(form.email),
        insurer:     nullifyEmpty(form.insurer),
        allergies:   nullifyEmpty(form.allergies),
        history:     nullifyEmpty(form.history),
        dateOfBirth: nullifyEmpty(form.dateOfBirth), // "YYYY-MM-DD" o null
        sex:         nullifyEmpty(form.sex),         // "MALE" | "FEMALE" | "OTHER" | null
        // Enviamos pregnant; el API la pondrá en null si el sexo no es FEMALE
        pregnant:    showPregnant ? Boolean(form.pregnant) : false,
      };

      const res = await fetch(`/api/admin/patients/${patient.id}`, {
        method: "PUT", // tu endpoint unificado soporta PUT y PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) {
        throw new Error(j.error || res.statusText || "Error guardando");
      }

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
        <input
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          className="border rounded-lg px-3 py-2"
          placeholder="Nombre completo"
          required
        />
        <input
          name="document"
          value={form.document}
          onChange={onChange}
          className="border rounded-lg px-3 py-2"
          placeholder="Documento"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          className="border rounded-lg px-3 py-2"
          placeholder="Teléfono"
        />
        <input
          name="email"
          value={form.email}
          onChange={onChange}
          className="border rounded-lg px-3 py-2"
          placeholder="Email"
        />

        {/* Fecha de nacimiento + edad */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div>
            <div className="text-xs text-gray-500 mb-1">Fecha de nacimiento</div>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth || ""}
              onChange={onChange}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Edad</div>
            <input
              disabled
              className="border rounded-lg px-3 py-2 w-full bg-gray-50"
              value={age !== "" ? `${age} años` : ""}
            />
          </div>
        </div>

        {/* Sexo + Embarazo (solo si Femenino) */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Sexo</div>
          <select
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
        </div>

        {showPregnant && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="pregnant"
              checked={Boolean(form.pregnant)}
              onChange={onChange}
            />
            <span>Embarazo</span>
          </label>
        )}

        <input
          name="insurer"
          value={form.insurer}
          onChange={onChange}
          className="border rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="EPS"
        />
        <input
          name="allergies"
          value={form.allergies}
          onChange={onChange}
          className="border rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="Alergias"
        />
        <textarea
          name="history"
          value={form.history}
          onChange={onChange}
          className="border rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="Antecedentes / Notas"
          rows={3}
        />
      </div>

      <button disabled={saving} className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
