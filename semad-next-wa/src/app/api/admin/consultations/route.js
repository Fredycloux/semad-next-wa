// src/app/api/admin/consultations/route.js
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      patientId,
      appointmentId = null,
      temperature = null,
      pulse = null,
      respRate = null,
      systolicBP = null,
      diastolicBP = null,
      anamnesis = null,
      diagnosis = null,
      evolution = null,
      prescription = null,
      procedures = [], // [procedureId,...]
    } = body || {};

    if (!patientId) {
      return Response.json({ ok: false, error: "patientId requerido" }, { status: 400 });
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        appointmentId,
        temperature: temperature ?? null,
        pulse: pulse ?? null,
        respRate: respRate ?? null,
        systolicBP: systolicBP ?? null,
        diastolicBP: diastolicBP ?? null,
        anamnesis,
        diagnosis,
        evolution,
        prescription,
        procedures: {
          create: (procedures || []).map(pid => ({
            procedure: { connect: { id: Number(pid) } }
          })),
        },
      },
      include: {
        procedures: { include: { procedure: true } },
      },
    });

    return Response.json({ ok: true, consultation });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
