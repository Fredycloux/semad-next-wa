import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const dentists = await prisma.dentist.findMany({ orderBy: { name: "asc" } });
  return Response.json(dentists);
}

export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return Response.json({ error: "Nombre requerido" }, { status: 400 });

    const created = await prisma.dentist.create({
      data: { name: name.trim(), active: true },
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
