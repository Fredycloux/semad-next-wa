import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  const { dentition } = await req.json(); // "ADULT" | "CHILD"
  await prisma.patient.update({
    where: { id: params.id },
    data: { dentition },
  });
  return Response.json({ ok: true });
}
