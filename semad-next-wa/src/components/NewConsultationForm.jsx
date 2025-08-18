"use client";

import { useEffect, useState } from "react";

export default function NewConsultationForm({ patientId, appointmentId = null, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [procedures, setProcedures] = useState([]);
  const [checked, setChecked] = useState({}); // { [procedureId]: true }
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
    // Cargamos procedimientos activos desde tu API existente
    fetch("/api/admin/procedures", { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        const list = (j?.procedures || []).filter(p => p.active !== false);
        setProcedures(list);
      })
      .catch(() => {});
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function toggleCheck(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const selected = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    try {
      const res = await fetch("/api/admin/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          appointmentId,
          ...["temperature","pulse","respRate","systolicBP","diastolicBP"].reduce((acc,k)=>{
            const v = form[k];
            acc[k] = v === "" ? null : Number(v);
            return acc;
          }, {}),
          anamnesis: form.anamnesis || null,
          diagnosis: form.diagnosis || null,
          evolution: form.evolution || null,
          prescription: form.prescription || null,
          procedures: selected, // arreglo de IDs
        }),
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");

      alert("Consulta guardada");
      setForm({
        temperature: "", pulse: "", respRate: "", systolicBP: "", diastolicBP: "",
        anamnesis: "", diagnosis: "", evolution: "", prescription: ""
      });
      setChecked({});
      onSaved?.(j.consultation);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Examen físico */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <input name="temperature" value={form.temperature} onChange={onChange}
          className="border rounded-lg px-3 py-2" placeholder="Temp °C" />
        <input name="pulse" value={form.pulse} onChange={onChange}
          className="border rounded-lg px-3 py-2" placeholder="Pulso lpm" />
        <input name="respRate" value={form.respRate} onChange={onChange}
          className="border rounded-lg px-3 py-2" placeholder="Resp rpm" />
        <input name="systolicBP" value={form.systolicBP} onChange={onChange}
          className="border rounded-lg px-3 py-2" placeholder="TA sistólica" />
        <input name="diastolicBP" value={form.diastolicBP} onChange={onChange}
          className="border rounded-lg px-3 py-2" placeholder="TA diastólica" />
      </div>

      {/* Anamnesis */}
      <div>
        <div className="text-sm text-gray-600 mb-1">Anamnesis</div>
        <textarea name="anamnesis" value={form.anamnesis} onChange={onChange}
          rows={3} className="w-full border rounded-lg px-3 py-2" placeholder="Motivo de consulta, antecedentes, etc." />
      </div>

      {/* Procedimientos (checklist) */}
      <div>
        <div className="text-sm text-gray-600 mb-2">Procedimientos a realizar</div>
        {procedures.length === 0 ? (
          <div className="text-xs text-gray-500">No hay procedimientos configurados.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {procedures.map(p => (
              <label key={p.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white/70">
                <input type="checkbox"
                  checked={!!checked[p.id]}
                  onChange={() => toggleCheck(p.id)} />
                <span className="text-sm">
                  {p.name} {p.price ? <span className="text-gray-400">· ${p.price}</span> : null}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Diagnóstico / Evolución / Fórmula */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-gray-600 mb-1">Diagnóstico</div>
          <textarea name="diagnosis" value={form.diagnosis} onChange={onChange}
            rows={2} className="w-full border rounded-lg px-3 py-2" placeholder="Diagnóstico clínico" />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Evolución</div>
          <textarea name="evolution" value={form.evolution} onChange={onChange}
            rows={2} className="w-full border rounded-lg px-3 py-2" placeholder="Notas de evolución" />
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-600 mb-1">Fórmula</div>
        <textarea name="prescription" value={form.prescription} onChange={onChange}
          rows={2} className="w-full border rounded-lg px-3 py-2" placeholder="Medicamentos / indicaciones" />
      </div>

      <button disabled={loading}
        className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {loading ? "Guardando..." : "Guardar consulta"}
      </button>
    </form>
  );
}
