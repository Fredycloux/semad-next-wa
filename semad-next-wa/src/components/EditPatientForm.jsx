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
  const [form, setForm] = useState({
    fullName: patient.fullName || "",
    document: patient.document || "",
    phone: patient.phone || "",
    email: patient.email || "",
    insurer: patient.insurer || "",
    allergies: patient.allergies || "",
    history: patient.history || "",
    dateOfBirth: patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toISOString().slice(0, 10)
      : "",
    sex: patient.sex || "",
    pregnant: Boolean(patient.pregnant),
  });
  const [saving, setSaving] = useState(false);

  const age = useMemo(() => calcAge(form.dateOfBirth), [form.dateOfBirth]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Error guardando");
      alert("Paciente actualizado");
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const showPregnant = form.sex === "FEMALE";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-xs text-gray-500">Nombre completo</span>
          <input name="fullName" value={form.fullName} onChange={onChange} required
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-500">Documento</span>
          <input name="document" value={form.document} onChange={onChange}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-500">Teléfono</span>
          <input name="phone" value={form.phone} onChange={onChange}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-500">Email</span>
          <input name="email" value={form.email} onChange={onChange}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-500">Fecha de nacimiento</span>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange}
                   className="border rounded-lg px-3 py-2 w-full" />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-gray-500">Edad</span>
            <input disabled value={age !== "" ? `${age} años` : ""}
                   className="border rounded-lg px-3 py-2 w-full bg-gray-50" />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs text-gray-500">Sexo</span>
          <select name="sex" value={form.sex} onChange={onChange}
                  className="border rounded-lg px-3 py-2 w-full">
            <option value="">—</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
            <option value="OTHER">Otro</option>
          </select>
        </label>

        {showPregnant && (
          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" name="pregnant" checked={form.pregnant} onChange={onChange}/>
            <span className="text-sm">Embarazo</span>
          </label>
        )}

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-gray-500">EPS</span>
          <input name="insurer" value={form.insurer} onChange={onChange}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-gray-500">Alergias</span>
          <input name="allergies" value={form.allergies} onChange={onChange}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-gray-500">Antecedentes / Notas</span>
          <textarea name="history" value={form.history} onChange={onChange}
                    rows={3} className="border rounded-lg px-3 py-2 w-full" />
        </label>
      </div>

      <button disabled={saving} className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
