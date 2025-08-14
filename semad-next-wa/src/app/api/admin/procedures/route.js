import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const items = await prisma.procedure.findMany({
    orderBy: { name: "asc" },
  });
  return Response.json({ ok: true, items });
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body?.name) {
      return Response.json({ ok: false, error: "Nombre requerido" }, { status: 400 });
    }
    const item = await prisma.procedure.create({ data: { name: body.name } });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return Response.json({ ok: false, error: "id requerido" }, { status: 400 });
    await prisma.procedure.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
