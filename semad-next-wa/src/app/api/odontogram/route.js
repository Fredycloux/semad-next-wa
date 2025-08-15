import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// GET ?patientId=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) {
    return Response.json({ ok: false, error: "patientId requerido" }, { status: 400 });
  }
  const rows = await prisma.odontogramEntry.findMany({
    where: { patientId },
    orderBy: { tooth: "asc" },
  });
  return Response.json({ ok: true, items: rows });
}

// POST { patientId, tooth, label, color }
// toggle: si existe y vuelves a mandar sin label/color => borra
export async function POST(req) {
  try {
    const { patientId, tooth, label, color } = await req.json();

    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "patientId y tooth son requeridos" }, { status: 400 });
    }

    const existing = await prisma.odontogramEntry.findFirst({ where: { patientId, tooth } });

    // si no envías label/color, interpretamos como borrar
    if (!label || !color) {
      if (existing) await prisma.odontogramEntry.delete({ where: { id: existing.id } });
      return Response.json({ ok: true, removed: true });
    }

    if (existing) {
      await prisma.odontogramEntry.update({
        where: { id: existing.id },
        data: { label, color },
      });
    } else {
      await prisma.odontogramEntry.create({
        data: { patientId, tooth, label, color },
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
