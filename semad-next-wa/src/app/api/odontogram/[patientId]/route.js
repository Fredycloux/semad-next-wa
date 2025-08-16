import { prisma } from "@/lib/prisma";

// GET: listar marcas del paciente
export async function GET(_req, { params }) {
  const entries = await prisma.odontogramEntry.findMany({
    where: { patientId: params.patientId },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ ok: true, entries });
}

// POST: crear una marca
export async function POST(req, { params }) {
  try {
    const { tooth, label, color, surface } = await req.json();
    if (!tooth || !label) {
      return Response.json({ ok: false, error: "tooth y label son obligatorios" }, { status: 400 });
    }
    const entry = await prisma.odontogramEntry.create({
      data: {
        patientId: params.patientId,
        tooth,
        label,
        color: color || "#111827",
        surface: surface || "WHOLE",
      },
    });
    return Response.json({ ok: true, entry }, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
