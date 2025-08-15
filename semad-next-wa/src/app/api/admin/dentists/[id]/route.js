import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req, { params }) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const data = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (!Object.keys(data).length) return Response.json({ error: "Sin cambios" }, { status: 400 });

    const updated = await prisma.dentist.update({ where: { id }, data });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const id = Number(params.id);
    await prisma.dentist.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
