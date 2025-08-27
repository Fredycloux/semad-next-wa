// Este archivo replica el formulario de inicio de sesión original y añade
// un botón "Solicitar cita" que redirige a la página pública para
// solicitar una cita. Coloque este archivo en
// `src/app/(auth)/login/page.jsx` reemplazando el anterior.

'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

// Evita el prerender estático y el error de useSearchParams
export const dynamic = 'force-dynamic'

// Componente con los hooks (queda dentro de <Suspense>)
function LoginForm() {
  const [loading, setLoading] = useState(false)
  const search = useSearchParams()
  const error = search.get('error')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const username = fd.get('username')
    const password = fd.get('password')

    await signIn('credentials', {
      username,
      password,
      redirect: true,
      callbackUrl: '/admin/agenda',
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur rounded-2xl shadow-sm border p-6">
        {/* SOLO LOGO */}
        <div className="flex justify-center mb-4">
          <Image src="/logo_semad.png" alt="SEMAD" width={84} height={84} priority />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            Credenciales inválidas
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">Usuario</label>
            <input
              name="username"
              autoComplete="username"
              placeholder="admin"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Sistemas de gestión SEMAD - Consultorio Odontológico.
        </p>
        {/* Botón para solicitar cita */}
        <div className="mt-4 text-center">
          <Link
            href="/request-appointment"
            className="inline-block rounded-lg border border-violet-600 text-violet-600 px-4 py-2 text-sm hover:bg-violet-50"
          >
            Solicitar cita
          </Link>
        </div>
      </div>
    </div>
  )
}

// Página: envuelve el formulario en <Suspense>
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
