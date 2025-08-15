// src/app/api/admin/odontogram/route.js
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { patientId, tooth, label, color } = await req.json();

    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "Faltan campos" }, { status: 400 });
    }

    // Si label es null => borrar marca del diente (simple)
    if (label == null) {
      await prisma.odontogramEntry.deleteMany({ where: { patientId, tooth } });
      return Response.json({ ok: true });
    }

    const entry = await prisma.odontogramEntry.create({
      data: { patientId, tooth, label, color: color || "#7c3aed" },
    });

    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
