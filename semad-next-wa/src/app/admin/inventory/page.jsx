"use client";
import { useEffect, useMemo, useState } from "react";

function fmt(n){ return new Intl.NumberFormat("es-CO").format(Number(n||0)); }

export default function InventoryPage(){
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [lowOnly, setLowOnly] = useState(false);

  const [form, setForm] = useState({ name:"", sku:"", category:"", unit:"", minStock:0, note:"" });
  const [saving, setSaving] = useState(false);

  const [mov, setMov] = useState({ open:false, item:null, type:"PURCHASE", quantity:0, unitCost:0, note:"", ref:"" });

  // cargar items
  async function load(){
    const u = new URL("/api/admin/inventory/items", location.origin);
    if (q.trim()) u.searchParams.set("q", q.trim());
    if (lowOnly) u.searchParams.set("low", "1");
    const j = await fetch(u).then(r=>r.json());
    setItems(j.items || []);
  }
  useEffect(()=>{ const t=setTimeout(load, 250); return ()=>clearTimeout(t); }, [q, lowOnly]);

  async function createItem(){
    if (!form.name.trim()){ alert("Nombre requerido"); return; }
    setSaving(true);
    try{
      const r = await fetch("/api/admin/inventory/items",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          ...form,
          minStock: Number(form.minStock||0)
        }),
      });
      const j = await r.json();
      if(!j.ok) throw new Error(j.error || "No se pudo crear");
      setForm({ name:"", sku:"", category:"", unit:"", minStock:0, note:"" });
      load();
    }catch(e){ alert(e.message); }
    finally{ setSaving(false); }
  }

  function openMove(it, type){
    setMov({ open:true, item:it, type, quantity:0, unitCost:0, note:"", ref:"" });
  }
  async function doMove(){
    try{
      if (!mov.item) return;
      const payload = {
        type: mov.type,
        quantity: Number(mov.quantity||0),
        unitCost: mov.type==="PURCHASE" ? Number(mov.unitCost||0) : undefined,
        note: mov.note || undefined,
        ref: mov.ref || undefined,
      };
      const r = await fetch(`/api/admin/inventory/items/${mov.item.id}/move`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if(!j.ok) throw new Error(j.error || "No se pudo registrar el movimiento");
      setMov({ open:false, item:null, type:"PURCHASE", quantity:0, unitCost:0, note:"", ref:"" });
      load();
    }catch(e){ alert(e.message); }
  }

  const lowCount = useMemo(()=> items.filter(i=>i.stock <= i.minStock).length, [items]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Inventario</h1>

      {/* Buscador y filtros */}
      <section className="rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-1">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Buscar por nombre, Código o categoría…"
            className="w-full border rounded-lg px-3 py-2"
          />
          <label className="inline-flex items-center gap-2 text-sm px-3">
            <input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} />
            Bajo stock ({lowCount})
          </label>
        </div>
      </section>

      {/* Crear ítem */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Agregar ítem</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <input className="border rounded px-3 py-2 lg:col-span-2" placeholder="Nombre"
            value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Código"
            value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Categoría"
            value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Unidad (uds, ml, cajas…)"
            value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})}/>
          <input className="border rounded px-3 py-2" type="number" min={0} placeholder="Stock mínimo"
            value={form.minStock} onChange={e=>setForm({...form, minStock:e.target.value})}/>
        </div>
        <textarea className="border rounded px-3 py-2 w-full" rows={2} placeholder="Nota (opcional)"
          value={form.note} onChange={e=>setForm({...form, note:e.target.value})}/>
        <button disabled={saving} onClick={createItem}
          className="rounded-lg bg-violet-600 text-white px-4 py-2 disabled:opacity-60">
          {saving ? "Guardando…" : "Crear ítem"}
        </button>
      </section>

      {/* Lista de ítems */}
      <section className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-violet-600 text-white">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Categoría</th>
              <th className="p-2">Unidad</th>
              <th className="p-2">Mínimo</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Costo prom.</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{it.name}</div>
                  {it.note ? <div className="text-xs text-gray-500">{it.note}</div> : null}
                </td>
                <td className="p-2 text-center">{it.sku || "—"}</td>
                <td className="p-2 text-center">{it.category || "—"}</td>
                <td className="p-2 text-center">{it.unit || "—"}</td>
                <td className="p-2 text-center">{it.minStock}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${it.stock <= it.minStock ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {it.stock}
                  </span>
                </td>
                <td className="p-2 text-right">$ {fmt(it.avgCost)}</td>
                <td className="p-2 flex gap-2 justify-center">
                  <button onClick={()=>openMove(it, "PURCHASE")} className="px-2 py-1 rounded border">Ingreso</button>
                  <button onClick={()=>openMove(it, "USE")} className="px-2 py-1 rounded border">Salida</button>
                  <button onClick={()=>openMove(it, "ADJUSTMENT")} className="px-2 py-1 rounded border">Ajuste</button>
                </td>
              </tr>
            ))}
            {items.length===0 && (
              <tr><td className="p-3 text-sm text-gray-500" colSpan={8}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Movimientos recientes */}
      <RecentMovements />

      {/* Modal Movimiento */}
      {mov.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-md space-y-3">
            <div className="font-medium">Movimiento: {mov.item?.name}</div>
            <div className="grid grid-cols-2 gap-2">
              <select className="border rounded px-2 py-2" value={mov.type} onChange={e=>setMov({...mov, type:e.target.value})}>
                <option value="PURCHASE">Ingreso (Compra)</option>
                <option value="USE">Salida (Uso)</option>
                <option value="ADJUSTMENT">Ajuste (+/-)</option>
                <option value="WASTE">Merma/Daño</option>
                <option value="RETURN">Devolución</option>
              </select>
              <input className="border rounded px-2 py-2" type="number" placeholder="Cantidad"
                value={mov.quantity} onChange={e=>setMov({...mov, quantity:e.target.value})}/>
              {mov.type==="PURCHASE" && (
                <input className="border rounded px-2 py-2 col-span-2" type="number" placeholder="Costo unitario (COP)"
                  value={mov.unitCost} onChange={e=>setMov({...mov, unitCost:e.target.value})}/>
              )}
              <input className="border rounded px-2 py-2 col-span-2" placeholder="Referencia (opcional)"
                value={mov.ref} onChange={e=>setMov({...mov, ref:e.target.value})}/>
              <textarea className="border rounded px-2 py-2 col-span-2" rows={2} placeholder="Nota (opcional)"
                value={mov.note} onChange={e=>setMov({...mov, note:e.target.value})}/>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setMov({ open:false, item:null, type:"PURCHASE", quantity:0, unitCost:0, note:"", ref:"" })} className="px-3 py-2 rounded border">Cancelar</button>
              <button onClick={doMove} className="px-3 py-2 rounded bg-violet-600 text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentMovements(){
  const [rows, setRows] = useState([]);
  useEffect(()=>{ fetch("/api/admin/inventory/movements?limit=20").then(r=>r.json()).then(j=>setRows(j.items||[])); },[]);
  const fmt = (n)=> new Intl.NumberFormat("es-CO").format(Number(n||0));
  const label = (t)=> ({PURCHASE:"Compra", USE:"Uso", ADJUSTMENT:"Ajuste", WASTE:"Merma", RETURN:"Devolución"}[t]||t);
  return (
    <section className="rounded-xl border p-4 space-y-2">
      <div className="font-medium">Movimientos recientes</div>
      <ul className="text-sm divide-y">
        {rows.map(m=>(
          <li key={m.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.item?.name || "—"}</div>
              <div className="text-gray-600">
                {label(m.type)} · {new Date(m.createdAt).toLocaleString()} {m.ref?`· Ref: ${m.ref}`:""}
              </div>
              {m.note ? <div className="text-gray-600">{m.note}</div> : null}
            </div>
            <div className={`font-semibold ${m.quantity>=0?"text-green-700":"text-red-700"}`}>
              {m.quantity>=0 ? `+${m.quantity}` : m.quantity}
              {m.unitCost ? <div className="text-right text-xs text-gray-600">$ {fmt(m.unitCost)}</div> : null}
            </div>
          </li>
        ))}
        {rows.length===0 && <li className="py-2 text-gray-500">Sin movimientos aún.</li>}
      </ul>
    </section>
  );
}
