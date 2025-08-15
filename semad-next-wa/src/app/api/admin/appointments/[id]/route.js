import { prisma } from "@/lib/prisma";

export async function DELETE(_req, { params }) {
  try {
    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "Cancelada" },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
