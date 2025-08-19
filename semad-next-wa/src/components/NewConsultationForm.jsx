"use client";
import { useEffect, useMemo, useState } from "react";

export default function NewConsultationForm({ patientId, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [procedures, setProcedures] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const [form, setForm] = useState({
    temperature: "",
    pulse: "",
    respRate: "",
    systolicBP: "",
    diastolicBP: "",
    anamnesis: "",
    diagnosis: "",
    evolution: "",
    prescription: "",
  });

  useEffect(() => {
    // trae procedimientos activos
    fetch("/api/admin/procedures")
      .then((r) => r.json())
      .then((j) => setProcedures(Array.isArray(j) ? j : (j.procedures || [])))
      .catch(() => {});
  }, []);

  function onField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onToggle(pid) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          temperature: form.temperature || null,
          pulse: form.pulse || null,
          respRate: form.respRate || null,
          systolicBP: form.systolicBP || null,
          diastolicBP: form.diastolicBP || null,
          anamnesis: form.anamnesis,
          diagnosis: form.diagnosis,
          evolution: form.evolution,
          prescription: form.prescription,
          procedureIds: Array.from(selected),
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Error guardando");
      alert("Consulta guardada");
      setSelected(new Set());
      setForm({
        temperature: "", pulse: "", respRate: "", systolicBP: "", diastolicBP: "",
        anamnesis: "", diagnosis: "", evolution: "", prescription: "",
      });
      onSaved?.(j.consultation);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const sortedProcedures = useMemo(
    () => [...procedures].sort((a, b) => a.name.localeCompare(b.name)),
    [procedures]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Signos vitales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-gray-500">Temperatura (°C)</span>
          <input name="temperature" value={form.temperature} onChange={onField}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-500">Pulso (lpm)</span>
          <input name="pulse" value={form.pulse} onChange={onField}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-500">Respiración (rpm)</span>
          <input name="respRate" value={form.respRate} onChange={onField}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-500">TA Sistólica</span>
          <input name="systolicBP" value={form.systolicBP} onChange={onField}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-500">TA Diastólica</span>
          <input name="diastolicBP" value={form.diastolicBP} onChange={onField}
                 className="border rounded-lg px-3 py-2 w-full" />
        </label>
      </div>

      {/* Campos de texto */}
      <label className="space-y-1 block">
        <span className="text-xs text-gray-500">Anamnesis</span>
        <textarea name="anamnesis" value={form.anamnesis} onChange={onField}
                  rows={3} className="border rounded-lg px-3 py-2 w-full" />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-500">Diagnóstico</span>
        <textarea name="diagnosis" value={form.diagnosis} onChange={onField}
                  rows={2} className="border rounded-lg px-3 py-2 w-full" />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-500">Evolución</span>
        <textarea name="evolution" value={form.evolution} onChange={onField}
                  rows={2} className="border rounded-lg px-3 py-2 w-full" />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-500">Fórmula / Prescripción</span>
        <textarea name="prescription" value={form.prescription} onChange={onField}
                  rows={2} className="border rounded-lg px-3 py-2 w-full" />
      </label>

      {/* Checklist de procedimientos */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Procedimientos (checklist)</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {sortedProcedures.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => onToggle(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button disabled={saving} className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {saving ? "Guardando..." : "Guardar consulta"}
      </button>
    </form>
  );
}
