// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { patientId, tooth, surface = "WHOLE", label = "marcado", color = "#7c3aed", on = true } = await req.json();
    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "patientId y tooth son obligatorios" }, { status: 400 });
    }

    if (on) {
      const entry = await prisma.odontogramEntry.create({
        data: { patientId, tooth, surface, label, color },
      });
      return Response.json({ ok: true, entry });
    } else {
      await prisma.odontogramEntry.deleteMany({ where: { patientId, tooth, surface } });
      return Response.json({ ok: true, deleted: true });
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
