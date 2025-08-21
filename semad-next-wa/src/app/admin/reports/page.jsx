"use client";
import { useEffect, useMemo, useState } from "react";

const money = (n)=> new Intl.NumberFormat("es-CO").format(Number(n||0));

export default function ReportsPage(){
  const [tab, setTab] = useState("inventario");

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-semibold">Reportes</h1>

      <div className="flex gap-2">
        <button onClick={()=>setTab("inventario")}
          className={`px-3 py-1 rounded ${tab==="inventario"?"bg-violet-600 text-white":"border"}`}>
          Inventario
        </button>
        <button onClick={()=>setTab("odontograma")}
          className={`px-3 py-1 rounded ${tab==="odontograma"?"bg-violet-600 text-white":"border"}`}>
          Historias / Odontograma
        </button>
      </div>

      {tab==="inventario" ? <InventoryReport /> : <OdontogramReport />}
    </div>
  );
}

/* ---------- Inventario ---------- */
function InventoryReport(){
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);

  async function load(){
    setLoading(true);
    const q = new URLSearchParams();
    if (from) q.set("from", from+"T00:00:00");
    if (to)   q.set("to",   to+"T23:59:59");
    const r = await fetch(`/api/admin/reports/inventory?${q.toString()}`);
    const j = await r.json();
    setData(j);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  const rows = data?.rows || [];
  const k = data?.kpis || {};

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs">Desde</div>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1"/>
        </div>
        <div>
          <div className="text-xs">Hasta</div>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1"/>
        </div>
        <button onClick={load} className="px-3 py-1 rounded bg-violet-600 text-white" disabled={loading}>
          {loading?"Cargando…":"Actualizar"}
        </button>
        <a
          className="px-3 py-1 rounded border"
          href={`/api/admin/reports/inventory?${new URLSearchParams({from:from?from+"T00:00:00":"", to:to?to+"T23:59:59":"", format:"csv"}).toString()}`}
          target="_blank" rel="noopener"
        >
          Exportar CSV
        </a>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi title="SKUs" value={k.skuCount} />
        <Kpi title="Unidades" value={k.totalUnits} />
        <Kpi title="Valor inventario" value={`$ ${money(k.totalValue)}`} />
        <Kpi title="Bajo stock" value={k.lowStockCount} />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-violet-600 text-white">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-right">Stock</th>
              <th className="p-2 text-right">Mínimo</th>
              <th className="p-2 text-right">Últ. costo</th>
              <th className="p-2 text-right">Valor</th>
              <th className="p-2 text-right">Ingresos</th>
              <th className="p-2 text-right">Salidas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=>(
              <tr key={r.sku} className={`border-t ${r.low?"bg-red-50":""}`}>
                <td className="p-2">{r.sku}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right">{r.stock}</td>
                <td className="p-2 text-right">{r.minStock}</td>
                <td className="p-2 text-right">$ {money(r.lastUnitCost)}</td>
                <td className="p-2 text-right">$ {money(r.value)}</td>
                <td className="p-2 text-right">{r.movedIn}</td>
                <td className="p-2 text-right">{r.movedOut}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({title, value}){
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold">{value ?? "—"}</div>
    </div>
  );
}

/* ---------- Historias / Odontograma ---------- */
function OdontogramReport(){
  const [q,setQ] = useState("");
  const [opts,setOpts] = useState([]);
  const [patient,setPatient] = useState(null);

  useEffect(()=>{
    const t = setTimeout(async ()=>{
      const qq = q.trim();
      if(!qq){ setOpts([]); return; }
      const r = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(qq)}`);
      const j = await r.json();
      setOpts(j.items||[]);
    }, 300);
    return ()=>clearTimeout(t);
  },[q]);

  return (
    <section className="space-y-3">
      <div className="text-sm font-medium">Paciente</div>
      {!patient ? (
        <>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por cédula o nombre…"
                 className="w-full border rounded px-3 py-2"/>
          {opts.length>0 && (
            <ul className="rounded-lg border divide-y">
              {opts.map(p=>(
                <li key={p.id} className="p-2 hover:bg-violet-50 cursor-pointer"
                    onClick={()=>{ setPatient(p); setOpts([]); }}>
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
          <div className="flex items-center gap-2">
            <a className="px-3 py-1 rounded bg-violet-600 text-white"
               href={`/api/admin/patients/${patient.id}/odontogram/pdf`} target="_blank" rel="noopener">
              Descargar PDF
            </a>
            <button className="text-violet-700 hover:underline" onClick={()=>setPatient(null)}>Cambiar</button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600">
        El PDF incluye datos del paciente, un odontograma básico y procedimientos/ítems por diente (a partir de tus facturas).
      </p>
    </section>
  );
}
