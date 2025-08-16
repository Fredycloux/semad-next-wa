import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { patientId, tooth, surface = "O", label, color, on = true } = await req.json();

    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!on) {
      await prisma.odontogramEntry.deleteMany({ where: { patientId, tooth, surface } });
      return Response.json({ ok: true, deleted: true });
    }

    const existing = await prisma.odontogramEntry.findFirst({
      where: { patientId, tooth, surface },
      select: { id: true },
    });

    let entry;
    if (existing) {
      entry = await prisma.odontogramEntry.update({
        where: { id: existing.id },
        data: { label: label ?? "marcado", color: color ?? null },
      });
    } else {
      entry = await prisma.odontogramEntry.create({
        data: { patientId, tooth, surface, label: label ?? "marcado", color: color ?? null },
      });
    }

    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
