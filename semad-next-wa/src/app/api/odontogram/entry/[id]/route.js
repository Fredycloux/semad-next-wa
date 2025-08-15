import { PrismaClient } from "@prisma/client";
export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function DELETE(_req, { params }) {
  const { id } = params;
  try {
    await prisma.odontogramEntry.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
