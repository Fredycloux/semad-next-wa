import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status ?? "Cancelada";

    await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
