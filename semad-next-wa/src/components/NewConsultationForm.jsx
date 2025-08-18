"use client";
import { useEffect, useState } from "react";

export default function NewConsultationForm({ patientId, onSaved }) {
  const [procedures, setProcedures] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const [form, setForm] = useState({
    temperature: "", pulse: "", respRate: "",
    systolicBP: "", diastolicBP: "",
    anamnesis: "", diagnosis: "",
    evolution: "", prescription: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ya tienes /api/admin/procedures
    fetch("/api/admin/procedures")
      .then(r => r.json())
      .then(j => setProcedures(j.procedures || []))
      .catch(() => {});
  }, []);

  function toggleProc(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        patientId,
        temperature: form.temperature ? Number(form.temperature) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        respRate: form.respRate ? Number(form.respRate) : null,
        systolicBP: form.systolicBP ? Number(form.systolicBP) : null,
        diastolicBP: form.diastolicBP ? Number(form.diastolicBP) : null,
        anamnesis: form.anamnesis,
        diagnosis: form.diagnosis,
        evolution: form.evolution,
        prescription: form.prescription,
        procedureIds: Array.from(selected),
      };

      const res = await fetch("/api/admin/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");
      alert("Consulta guardada");
      setSelected(new Set());
      setForm({ temperature:"", pulse:"", respRate:"", systolicBP:"", diastolicBP:"",
        anamnesis:"", diagnosis:"", evolution:"", prescription:"" });
      onSaved?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div><div className="text-xs text-gray-500 mb-1">Temp (°C)</div>
          <input name="temperature" value={form.temperature} onChange={onChange} type="number" step="0.1" className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div><div className="text-xs text-gray-500 mb-1">Pulso (lpm)</div>
          <input name="pulse" value={form.pulse} onChange={onChange} type="number" className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div><div className="text-xs text-gray-500 mb-1">Resp (rpm)</div>
          <input name="respRate" value={form.respRate} onChange={onChange} type="number" className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div><div className="text-xs text-gray-500 mb-1">TAS (mmHg)</div>
          <input name="systolicBP" value={form.systolicBP} onChange={onChange} type="number" className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div><div className="text-xs text-gray-500 mb-1">TAD (mmHg)</div>
          <input name="diastolicBP" value={form.diastolicBP} onChange={onChange} type="number" className="border rounded-lg px-3 py-2 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Anamnesis</div>
          <textarea name="anamnesis" value={form.anamnesis} onChange={onChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Diagnóstico</div>
          <textarea name="diagnosis" value={form.diagnosis} onChange={onChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Evolución</div>
          <textarea name="evolution" value={form.evolution} onChange={onChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Fórmula</div>
          <textarea name="prescription" value={form.prescription} onChange={onChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
        </div>
      </div>

      <div>
        <div className="font-medium mb-2">Procedimientos</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {procedures.map(p => (
            <label key={p.id ?? p.code ?? p.name} className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleProc(p.id)}
              />
              <span className="text-sm">{p.name} {p.price ? `· $${p.price}` : ""}</span>
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
