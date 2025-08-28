// src/app/admin/historias/page.jsx

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoriasPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();

  const where = q
    ? {
        OR: [
          { document: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ fullName: "asc" }],
    take: 50,
  });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Historias</h1>
        <p className="text-sm text-gray-500">
          Busca por número de documento o nombre y abre la historia clínica.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          className="border rounded-lg px-3 py-2 w-full"
          placeholder="Documento o nombre (ej: 1001234567)"
        />
        <button className="rounded-lg bg-violet-600 text-white px-4">Buscar</button>
      </form>

      <div className="rounded-xl border bg-white/70 backdrop-blur divide-y">
        {patients.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Sin resultados.</div>
        ) : (
          patients.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.fullName}</div>
                <div className="text-sm text-gray-600">{p.document || "—"} · {p.phone || "—"}</div>
              </div>
              <Link
                href={`/admin/patients/${p.id}`}
                //className="text-sm rounded-lg bg-violet-600 text-white px-3 py-1.5"
                className="text-sm text-violet-700 hover:underline"
              >
                Abrir historia
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
