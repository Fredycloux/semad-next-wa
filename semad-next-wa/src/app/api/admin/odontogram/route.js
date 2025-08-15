import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * POST  { patientId, tooth, label, color }
 * Si label = null => borra la marca del diente (si existía)
 * Si existe => actualiza; si no => crea
 */
export async function POST(req) {
  try {
    const { patientId, tooth, label, color } = await req.json();

    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "Faltan campos" }, { status: 400 });
    }

    const found = await prisma.odontogramEntry.findFirst({
      where: { patientId, tooth },
    });

    if (!label) {
      if (found) await prisma.odontogramEntry.delete({ where: { id: found.id } });
      return Response.json({ ok: true, deleted: true });
    }

    if (found) {
      await prisma.odontogramEntry.update({
        where: { id: found.id },
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
