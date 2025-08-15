import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { dentition } = await req.json(); // "ADULT" | "CHILD"

    if (!["ADULT", "CHILD"].includes(dentition))
      return Response.json({ ok: false, error: "Valor inválido" }, { status: 400 });

    await prisma.patient.update({
      where: { id },
      data: { dentition },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
