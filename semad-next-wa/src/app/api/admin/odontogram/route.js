import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * POST /api/admin/odontogram
 * body: { patientId, tooth, surface, label, color, on = true }
 * - on=true  -> upsert marca
 * - on=false -> borrar marca (patientId+tooth+surface)
 */
export async function POST(req) {
  try {
    const { patientId, tooth, surface, label, color, on = true } = await req.json();

    if (!patientId || !tooth || !surface) {
      return Response.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!on) {
      await prisma.odontogramEntry.deleteMany({ where: { patientId, tooth, surface } });
      return Response.json({ ok: true, deleted: true });
    }

    const entry = await prisma.odontogramEntry.upsert({
      where: {
        patient_tooth_surface: { patientId, tooth, surface },
      },
      update: { label: label ?? "marcado", color: color ?? null },
      create: { patientId, tooth, surface, label: label ?? "marcado", color: color ?? null },
    });

    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
