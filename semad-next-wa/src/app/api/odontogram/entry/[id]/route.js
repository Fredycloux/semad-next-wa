import { prisma } from "@/lib/prisma";

export async function DELETE(_req, { params }) {
  try {
    await prisma.odontogramEntry.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
