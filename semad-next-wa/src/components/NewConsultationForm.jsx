"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function numOrUndef(v, isInt = false) {
  if (v === "" || v == null) return undefined;
  const n = isInt ? parseInt(v, 10) : parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

export default function NewConsultationForm({ patientId, appointmentId = null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // procedimientos (para checklist)
  const [allProcedures, setAllProcedures] = useState([]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(() => new Set());

  // examen físico
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 16), // datetime-local
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
    (async () => {
      try {
        // Usa tu endpoint existente. Si tu ruta difiere, cámbiala aquí.
        const res = await fetch("/api/admin/procedures", { cache: "no-store" });
        const j = await res.json();
        setAllProcedures((j.procedures || j || []).filter(p => p.active !== false));
      } catch {
        setAllProcedures([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allProcedures;
    return allProcedures.filter(p =>
      (p.name || "").toLowerCase().includes(s) || String(p.code || "").includes(s)
    );
  }, [q, allProcedures]);

  function toggleProc(id) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
      const payload = {
        patientId,
        appointmentId,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        temperature: numOrUndef(form.temperature),
        pulse: numOrUndef(form.pulse, true),
        respRate: numOrUndef(form.respRate, true),
        systolicBP: numOrUndef(form.systolicBP, true),
        diastolicBP: numOrUndef(form.diastolicBP, true),
        anamnesis: form.anamnesis || undefined,
        diagnosis: form.diagnosis || undefined,
        evolution: form.evolution || undefined,
        prescription: form.prescription || undefined,
        procedureIds: Array.from(picked),
      };

      const res = await fetch("/api/admin/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");

      alert("Consulta registrada");
      setPicked(new Set());
      setForm(f => ({ ...f, anamnesis: "", diagnosis: "", evolution: "", prescription: "" }));
      router.refresh();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Fecha y examen físico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Fecha y hora</div>
          <input
            type="datetime-local"
            name="date"
            value={form.date}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <input name="temperature" value={form.temperature} onChange={onChange}
            placeholder="Temp (°C)" className="border rounded-lg px-3 py-2" />
          <input name="pulse" value={form.pulse} onChange={onChange}
            placeholder="Pulso (lpm)" className="border rounded-lg px-3 py-2" />
          <input name="respRate" value={form.respRate} onChange={onChange}
            placeholder="Resp (rpm)" className="border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input name="systolicBP" value={form.systolicBP} onChange={onChange}
              placeholder="TA sistólica" className="border rounded-lg px-3 py-2" />
            <input name="diastolicBP" value={form.diastolicBP} onChange={onChange}
              placeholder="TA diastólica" className="border rounded-lg px-3 py-2" />
          </div>
        </div>
      </div>

      {/* Checklist de procedimientos */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Procedimientos</div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar (nombre o código)…"
          className="border rounded-lg px-3 py-2 w-full mb-2"
        />
        <div className="max-h-48 overflow-auto rounded-lg border p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500 px-1">Sin resultados.</div>
          ) : filtered.map(p => (
            <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={picked.has(p.id)}
                onChange={() => toggleProc(p.id)}
              />
              <span className="text-sm">
                <span className="font-medium">{p.name}</span>
                {p.code ? <span className="text-gray-500"> · {p.code}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Textos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <textarea name="anamnesis" value={form.anamnesis} onChange={onChange}
          placeholder="Anamnesis" rows={3} className="border rounded-lg px-3 py-2" />
        <textarea name="diagnosis" value={form.diagnosis} onChange={onChange}
          placeholder="Diagnóstico" rows={3} className="border rounded-lg px-3 py-2" />
        <textarea name="evolution" value={form.evolution} onChange={onChange}
          placeholder="Evolución" rows={3} className="border rounded-lg px-3 py-2 sm:col-span-2" />
        <textarea name="prescription" value={form.prescription} onChange={onChange}
          placeholder="Fórmula / prescripción" rows={3} className="border rounded-lg px-3 py-2 sm:col-span-2" />
      </div>

      <button disabled={saving} className="rounded-lg bg-violet-600 text-white px-4 py-2">
        {saving ? "Guardando..." : "Guardar consulta"}
      </button>
    </form>
  );
}
