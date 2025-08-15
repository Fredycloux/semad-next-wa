import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(_req, { params }) {
  const entries = await prisma.odontogramEntry.findMany({
    where: { patientId: params.patientId },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ entries });
}

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const { tooth, surface = null, label = null, color = null } = body;

    if (!tooth) return new Response("tooth required", { status: 400 });

    const entry = await prisma.odontogramEntry.create({
      data: {
        patientId: params.patientId,
        tooth: String(tooth),
        surface, // puede ser null si no ampliaste BD
        label,
        color,
      },
    });
    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
