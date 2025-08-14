"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setL] = useState(false);
  const err = useSearchParams().get("error");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setL(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setL(false);
    if (res?.ok) router.push("/admin/agenda");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 p-4">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-xl p-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-extrabold">SEMAD</h1>
          <p className="text-sm text-gray-500 -mt-1">Consultorio Odontológico</p>
        </div>

        {err && (
          <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            Usuario o contraseña incorrectos
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <input
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={username}
              onChange={(e) => setU(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={password}
              onChange={(e) => setP(e.target.value)}
              placeholder="admin123"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 text-white py-2 font-semibold hover:bg-purple-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-xs text-center text-gray-500">
            Ya ejecutaste <span className="font-mono">/api/seed</span> ✔
          </p>
        </form>
      </div>
    </div>
  );
}
