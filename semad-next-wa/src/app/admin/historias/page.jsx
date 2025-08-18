// src/app/admin/historias/page.jsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoriasPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();

  const results = q
    ? await prisma.patient.findMany({
        where: {
          OR: [
            { document: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        orderBy: { fullName: "asc" },
        take: 25,
      })
    : [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Historias</h1>
      <p className="text-sm text-gray-500">Busca por número de cédula (documento) o nombre.</p>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Documento o nombre…"
          className="border rounded-lg px-3 py-2 flex-1"
        />
        <button className="rounded-lg bg-violet-600 text-white px-4">Buscar</button>
      </form>

      <div className="grid gap-2">
        {results.map((p) => (
          <div key={p.id} className="rounded-lg border bg-white/70 p-3">
            <div className="font-medium">{p.fullName}</div>
            <div className="text-sm text-gray-600">
              {p.document || "—"} · {p.phone || "—"}
            </div>
            <Link
              href={`/admin/patients/${p.id}`}
              className="text-sm text-violet-700 hover:underline"
            >
              Abrir historia
            </Link>
          </div>
        ))}

        {q && results.length === 0 && (
          <div className="text-sm text-gray-500">Sin resultados para “{q}”.</div>
        )}
      </div>
    </div>
  );
}
