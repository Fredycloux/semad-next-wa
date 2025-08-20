"use client";
import { useEffect, useMemo, useState } from "react";

function fmt(n){ return new Intl.NumberFormat("es-CO").format(Number(n||0)); }

export default function InvoicesPage(){
  const [patientQ, setPatientQ] = useState("");
  const [patientOpts, setPatientOpts] = useState([]);
  const [patient, setPatient] = useState(null);

  const [procedures, setProcedures] = useState([]);
  const [lines, setLines] = useState([]); // {procedureCode, name, quantity, tooth, unitPrice, variable, hint}
  const [saving, setSaving] = useState(false);

  const [recent, setRecent] = useState([]);

  // carga procedimientos y facturas recientes
  useEffect(()=>{
    fetch("/api/admin/procedures").then(r=>r.json()).then(j=>{
      const arr = (j.items||[]).filter(p=>p.active!==false);
      setProcedures(arr);
    });
    fetch("/api/admin/invoices").then(r=>r.json()).then(j=> setRecent(j.items||[]));
  },[]);

  // buscar paciente
  useEffect(()=>{
    const t = setTimeout(()=>{
      const q = patientQ.trim();
      if (!q) { setPatientOpts([]); return; }
      fetch(`/api/admin/patients/search?q=${encodeURIComponent(q)}`)
        .then(r=>r.json()).then(j=> setPatientOpts(j.items||[]));
    }, 300);
    return ()=>clearTimeout(t);
  },[patientQ]);

  function addLine(proc){
    setLines(ls=>{
      const existsIdx = ls.findIndex(l=>l.procedureCode===proc.code && l.tooth===null);
      const variable = !!proc.variable;
      const unitPrice = variable ? (proc.minPrice ?? 0) : (proc.price ?? 0);
      const hint = variable
        ? (proc.minPrice && proc.maxPrice ? `Rango $${fmt(proc.minPrice)}–$${fmt(proc.maxPrice)}`
                                          : (proc.minPrice ? `Desde $${fmt(proc.minPrice)}` : "Variable"))
        : (proc.unit ? `$ ${fmt(proc.price)} (${proc.unit})` : `$ ${fmt(proc.price)}`);
      if (existsIdx >= 0) {
        const copy = [...ls];
        copy[existsIdx] = { ...copy[existsIdx], quantity: copy[existsIdx].quantity + 1 };
        return copy;
      }
      return ls.concat({
        procedureCode: proc.code,
        name: proc.name,
        quantity: 1,
        tooth: null,
        unitPrice: unitPrice || 0,
        variable,
        hint,
      });
    });
  }

  function updateLine(i, patch){
    setLines(ls=>{
      const copy = [...ls];
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  }
  function removeLine(i){
    setLines(ls=> ls.filter((_,idx)=>idx!==i));
  }

  const total = useMemo(()=> lines.reduce((s,l)=> s + (Number(l.quantity||0)*Number(l.unitPrice||0)), 0), [lines]);

  async function save(){
    if (!patient) { alert("Selecciona un paciente"); return; }
    if (lines.length===0){ alert("Agrega al menos un ítem"); return; }

async function save() {
    if (!patient) { alert("Selecciona un paciente"); return; }
    if (lines.length === 0) { alert("Agrega al menos un ítem"); return; }

    setSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        items: lines.map(l => ({
          procedureCode: l.procedureCode,
          quantity: Number(l.quantity || 1),
          tooth: l.tooth || null,
          unitPrice: Number(l.unitPrice || 0),
        })),
      };

      const r = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");

      // ⬇⬇ Redirige al detalle de la factura
      location.href = `/admin/invoices/${j.invoice.id}`;
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Facturación</h1>

      {/* Selector de paciente */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Paciente</div>
        {!patient ? (
          <>
            <input
              value={patientQ}
              onChange={e=>setPatientQ(e.target.value)}
              placeholder="Buscar por cédula o nombre…"
              className="w-full border rounded-lg px-3 py-2"
            />
            {patientOpts.length>0 && (
              <ul className="rounded-lg border divide-y">
                {patientOpts.map(p=>(
                  <li key={p.id} className="p-2 hover:bg-violet-50 cursor-pointer"
                      onClick={()=>{ setPatient(p); setPatientOpts([]); }}>
                    <div className="font-medium">{p.fullName}</div>
                    <div className="text-xs text-gray-600">{p.document || "—"} {p.phone?`· ${p.phone}`:""}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <div className="font-medium">{patient.fullName}</div>
              <div className="text-xs text-gray-600">{patient.document || "—"} {patient.phone?`· ${patient.phone}`:""}</div>
            </div>
            <button onClick={()=>setPatient(null)} className="text-sm text-violet-700 hover:underline">Cambiar</button>
          </div>
        )}
      </section>

      {/* Agregar procedimientos */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Agregar ítems</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {procedures.map(p=>(
            <button key={p.code}
              type="button"
              onClick={()=>addLine(p)}
              className="text-left rounded-lg border px-3 py-2 hover:bg-violet-50">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-gray-600">
                {p.code} · {p.variable
                  ? (p.minPrice && p.maxPrice
                      ? `Rango $ ${fmt(p.minPrice)} – $ ${fmt(p.maxPrice)}${p.unit?` (${p.unit})`:""}`
                      : (p.minPrice ? `Desde $ ${fmt(p.minPrice)}${p.unit?` (${p.unit})`:""}` : "Variable"))
                  : `$ ${fmt(p.price)}${p.unit?` (${p.unit})`:""}`}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Ítems de la factura */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Detalle</div>
        {lines.length===0 ? (
          <div className="text-sm text-gray-500">Sin ítems</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="p-2">Procedimiento</th>
                  <th className="p-2">Diente</th>
                  <th className="p-2">Cant.</th>
                  <th className="p-2">P. unitario</th>
                  <th className="p-2">Subtotal</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l,i)=>{
                  const subtotal = (Number(l.quantity||0)*Number(l.unitPrice||0));
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-gray-500">{l.procedureCode} {l.hint?`· ${l.hint}`:""}</div>
                      </td>
                      <td className="p-2">
                        <input
                          value={l.tooth||""}
                          onChange={e=>updateLine(i,{ tooth: e.target.value })}
                          placeholder="opcional"
                          className="border rounded px-2 py-1 w-24"
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" min={1}
                          value={l.quantity}
                          onChange={e=>updateLine(i,{ quantity: Number(e.target.value||1) })}
                          className="border rounded px-2 py-1 w-20"
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" min={0}
                          value={l.unitPrice}
                          onChange={e=>updateLine(i,{ unitPrice: Number(e.target.value||0) })}
                          className="border rounded px-2 py-1 w-32"
                        />
                      </td>
                      <td className="p-2 font-medium">$ {fmt(subtotal)}</td>
                      <td className="p-2">
                        <button className="text-red-600 hover:underline" onClick={()=>removeLine(i)}>Quitar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 border-t pt-3">
          <div className="text-lg font-semibold">Total: $ {fmt(total)}</div>
          <button disabled={saving || lines.length===0 || !patient}
            onClick={save}
            className="rounded-lg bg-violet-600 text-white px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar factura"}
          </button>
        </div>
      </section>

      {/* Recientes */}
      <section className="rounded-xl border p-4 space-y-2">
        <div className="font-medium">Facturas recientes</div>
        {recent.length===0 ? (
          <div className="text-sm text-gray-500">Aún no hay facturas.</div>
        ) : (
          <ul className="text-sm divide-y">
            {recent.slice(0,10).map(f=>(
              <li key={f.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {new Date(f.date).toLocaleString()}
                  </div>
                  <div className="text-gray-600">
                    {f.patient?.fullName || "—"} {f.patient?.document?`· ${f.patient.document}`:""}
                  </div>
                </div>
                <div className="font-semibold">$ {fmt(f.total || f.items.reduce((s,it)=>s+(it.subtotal||0),0))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
}

export default InvoicesPage; 
