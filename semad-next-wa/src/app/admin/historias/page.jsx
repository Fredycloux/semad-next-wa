// src/app/admin/historias/page.jsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoriasPage({ searchParams }) {
  const q = (searchParams?.q ?? "").trim();

  let results = [];
  if (q !== "") {
    results = await prisma.patient.findMany({
      where: {
        OR: [
          { document: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, fullName: true, document: true, phone: true },
      take: 50,
      orderBy: { fullName: "asc" },
    });
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Historias</h1>

      <form className="flex items-center gap-2" action="/admin/historias">
        <input
          name="q"
          defaultValue={q}
          placeholder="Busca por número de cédula o nombre…"
          className="border rounded-lg px-3 py-2 w-full max-w-xl"
        />
        <button type="submit" className="rounded-lg bg-violet-600 text-white px-3 py-2">
          Buscar
        </button>
      </form>

      <div className="space-y-2">
        {results.map((p) => (
          <div key={p.id} className="rounded-lg border p-3">
            <div className="font-medium">{p.fullName}</div>
            <div className="text-sm text-gray-500">
              {p.document ?? "—"}{p.phone ? ` · ${p.phone}` : ""}
            </div>
            <div className="mt-2">
              <Link
                href={`/admin/patients/${p.id}`}
                className="text-violet-600 hover:underline"
              >
                Abrir historia
              </Link>
            </div>
          </div>
        ))}

        {q !== "" && results.length === 0 && (
          <div className="text-sm text-gray-500">Sin resultados para "{q}".</div>
        )}
      </div>
    </div>
  );
}
