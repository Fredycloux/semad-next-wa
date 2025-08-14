'use client';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const res = await signIn('credentials', {
      redirect: false,
      username: fd.get('username'),
      password: fd.get('password'),
    });
    setLoading(false);
    if (!res || res.error) {
      router.push('/login?error=Credenciales%20inv%C3%A1lidas');
      return;
    }
    router.push('/admin/agenda');
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Image src="/logo_semad.png" alt="SEMAD" width={48} height={48} />
        <div className="text-xl font-bold">SEMAD</div>
      </div>

      {errorMsg && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Usuario</label>
          <input
            name="username"
            defaultValue="admin"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Contraseña</label>
          <input
            name="password"
            type="password"
            defaultValue="admin123"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
            required
          />
        </div>
        <button
          disabled={loading}
          className="mt-2 w-full rounded-md bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Después del despliegue, visita <code>/api/seed</code> para crear los usuarios demo.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-fuchsia-100 via-purple-100 to-indigo-100 p-4">
      <Suspense fallback={<div>Cargando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
