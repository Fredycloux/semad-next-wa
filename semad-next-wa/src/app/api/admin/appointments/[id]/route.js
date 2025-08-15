import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function DELETE(_req, { params }) {
  try {
    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "Cancelada" }, // o prisma.appointment.delete({ where: { id: params.id } })
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
