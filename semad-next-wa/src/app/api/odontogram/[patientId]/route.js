import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET(_req, { params }) {
  const { patientId } = params;
  try {
    const entries = await prisma.odontogramEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ ok: true, entries });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { patientId } = params;
  try {
    const { tooth, label, color } = await req.json();
    if (!tooth || !label) {
      return Response.json({ ok: false, error: "tooth y label son requeridos" }, { status: 400 });
    }
    const entry = await prisma.odontogramEntry.create({
      data: {
        patientId,
        tooth: String(tooth),
        label: String(label),
        color: color || "#111827", // gray-900 por defecto
      },
    });
    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
