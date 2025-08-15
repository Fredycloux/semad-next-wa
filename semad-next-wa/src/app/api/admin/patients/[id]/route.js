import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const data = await req.json();

    await prisma.patient.update({
      where: { id },
      data: {
        fullName: data.fullName ?? undefined,
        document: data.document ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        insurer: data.insurer ?? undefined,
        allergies: data.allergies ?? undefined,
        history: data.history ?? undefined,
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
