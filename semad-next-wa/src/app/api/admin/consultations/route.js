// src/app/api/admin/consultations/route.js
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      patientId,
      appointmentId,
      date, // iso opcional
      temperature,
      pulse,
      respRate,
      systolicBP,
      diastolicBP,
      anamnesis,
      diagnosis,
      evolution,
      prescription,
      procedureIds = [],
    } = body || {};

    if (!patientId) {
      return Response.json({ ok: false, error: "Falta patientId" }, { status: 400 });
    }

    // Validar IDs de procedimientos como enteros
    const procIds = (procedureIds || [])
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isInteger(n));

    const data = {
      patientId: String(patientId),
      appointmentId: appointmentId || null,
      date: date ? new Date(date) : undefined,
      temperature: typeof temperature === "number" ? temperature : undefined,
      pulse: Number.isInteger(pulse) ? pulse : undefined,
      respRate: Number.isInteger(respRate) ? respRate : undefined,
      systolicBP: Number.isInteger(systolicBP) ? systolicBP : undefined,
      diastolicBP: Number.isInteger(diastolicBP) ? diastolicBP : undefined,
      anamnesis: anamnesis || undefined,
      diagnosis: diagnosis || undefined,
      evolution: evolution || undefined,
      prescription: prescription || undefined,
      procedures: procIds.length
        ? {
            create: procIds.map((id) => ({
              procedure: { connect: { id } },
            })),
          }
        : undefined,
    };

    const created = await prisma.consultation.create({ data });
    return Response.json({ ok: true, id: created.id });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
