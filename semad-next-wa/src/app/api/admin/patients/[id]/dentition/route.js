// src/app/api/admin/patients/[id]/dentition/route.js
import { prisma } from "@/lib/prisma";

export async function PUT(req, { params }) {
  try {
    const { dentition } = await req.json(); // "ADULT" | "CHILD"
    if (!["ADULT", "CHILD"].includes(dentition)) {
      return Response.json({ ok: false, error: "Dentición inválida" }, { status: 400 });
    }
    await prisma.patient.update({ where: { id: params.id }, data: { dentition } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
