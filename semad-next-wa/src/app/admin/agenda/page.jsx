'use client'
import { useState } from 'react'

export default function AdminAgenda(){
  const [form, setForm] = useState({
    fullName:'', phone:'', document:'',
    date:'', time:'', dentist:'', reason:''
  })
  const [msg, setMsg] = useState('')

  async function handleCreate(e){
    e.preventDefault()
    setMsg('Guardando...')
    const r = await fetch('/api/admin/create-appointment',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await r.json()
    setMsg(r.ok ? 'Cita creada correctamente' : ('Error: '+(data.error||'verifica datos')))
  }

  return (
    <div className="max-w-xl p-4 mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin · Crear cita (DB)</h1>
      <form onSubmit={handleCreate} className="space-y-3 bg-white p-4 border rounded-2xl">
        <div className="grid gap-1">
          <label>Paciente (nombre completo)</label>
          <input className="border rounded px-3 py-2" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} required/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label>Documento</label>
            <input className="border rounded px-3 py-2" value={form.document} onChange={e=>setForm({...form, document:e.target.value})}/>
          </div>
          <div className="grid gap-1">
            <label>Teléfono (con 57)</label>
            <input className="border rounded px-3 py-2" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="573001234567" required/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label>Fecha</label>
            <input type="date" className="border rounded px-3 py-2" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} required/>
          </div>
          <div className="grid gap-1">
            <label>Hora</label>
            <input type="time" className="border rounded px-3 py-2" value={form.time} onChange={e=>setForm({...form, time:e.target.value})} required/>
          </div>
        </div>
        <div className="grid gap-1">
          <label>Odontólogo</label>
          <input className="border rounded px-3 py-2" value={form.dentist} onChange={e=>setForm({...form, dentist:e.target.value})}/>
        </div>
        <div className="grid gap-1">
          <label>Motivo</label>
          <input className="border rounded px-3 py-2" value={form.reason} onChange={e=>setForm({...form, reason:e.target.value})}/>
        </div>
        <button className="rounded-2xl bg-black text-white px-4 py-2">Crear cita</button>
        {msg && <p className="text-sm mt-2">{msg}</p>}
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <p><b>Recordatorio de WhatsApp:</b> Si configuraste el Cron y las variables, la cita recibirá mensaje automático el día anterior.</p>
      </div>
    </div>
  )
}
