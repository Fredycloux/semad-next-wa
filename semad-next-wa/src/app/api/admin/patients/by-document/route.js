import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return Response.json({ ok: true, patients: [] });
  }

  // Búsqueda por coincidencia en document (insensible a mayúsculas)
  const patients = await prisma.patient.findMany({
    where: {
      document: { contains: q, mode: "insensitive" },
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, document: true, phone: true },
    take: 50,
  });

  return Response.json({ ok: true, patients });
}
