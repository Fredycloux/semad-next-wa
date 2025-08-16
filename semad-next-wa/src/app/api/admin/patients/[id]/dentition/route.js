import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PUT(_req, { params }) {
  try {
    const body = await _req.json();
    const { dentition } = body || {};
    if (!["ADULT", "CHILD"].includes(dentition)) {
      return Response.json({ ok: false, error: "Dentición inválida" }, { status: 400 });
    }
    await prisma.patient.update({
      where: { id: params.id },
      data: { dentition },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
