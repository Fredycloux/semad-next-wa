'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e){
    e.preventDefault()
    const res = await signIn('credentials', { username, password, redirect: false })
    if(res?.ok){ router.replace('/dashboard') } else { setError('Credenciales inválidas') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border bg-white p-6 space-y-4">
        <h1 className="text-xl font-bold">SEMAD · Ingreso</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-2">
          <label className="text-sm">Usuario</label>
          <input className="rounded border px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin / odontologo / recepcion" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Contraseña</label>
          <input type="password" className="rounded border px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="w-full rounded-2xl bg-black px-4 py-2 text-white">Entrar</button>
        <p className="text-xs text-gray-500">Después del despliegue, visita /api/seed para crear usuarios demo.</p>
      </form>
    </div>
  )
}
