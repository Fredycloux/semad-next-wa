// src/app/api/odontogram/[patientId]/route.js
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const patientId = params.patientId;
  const entries = await prisma.odontogramEntry.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
  });

  const conditions = await prisma.toothCondition.findMany({
    where: { patientId },
  });

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { periodontalExam: true },
  });

  return Response.json({
    ok: true,
    entries,
    toothConditions: conditions,
    periodontalExam: patient?.periodontalExam
  });
}

export async function POST(req, { params }) {
  try {
    const { tooth, label, color, surface = "WHOLE" } = await req.json();
    if (!tooth || !label) {
      return Response.json({ ok: false, error: "tooth y label son obligatorios" }, { status: 400 });
    }
    const entry = await prisma.odontogramEntry.create({
      data: { patientId: params.patientId, tooth, label, color: color || "#111827", surface },
    });
    return Response.json({ ok: true, entry }, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
