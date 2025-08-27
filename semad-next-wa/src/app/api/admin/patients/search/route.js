import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) return Response.json({ ok: true, items: [] });

  const items = await prisma.patient.findMany({
    where: {
      OR: [
        { document: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, document: true, phone: true, email: true },
    orderBy: { fullName: "asc" },
    take: 20,
  });

  return Response.json({ ok: true, items });
}
