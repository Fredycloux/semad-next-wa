import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      patientId,
      appointmentId = null,
      date = new Date(),
      temperature = null,
      pulse = null,
      respRate = null,
      systolicBP = null,
      diastolicBP = null,
      anamnesis = "",
      diagnosis = "",
      evolution = "",
      prescription = "",
      procedureIds = [], // [Int, Int, ...]
    } = body || {};

    if (!patientId) {
      return Response.json({ ok: false, error: "patientId requerido" }, { status: 400 });
    }

    const created = await prisma.consultation.create({
      data: {
        patientId,
        appointmentId,
        date: date ? new Date(date) : new Date(),
        temperature: temperature != null ? Number(temperature) : null,
        pulse:       pulse != null ? Number(pulse) : null,
        respRate:    respRate != null ? Number(respRate) : null,
        systolicBP:  systolicBP != null ? Number(systolicBP) : null,
        diastolicBP: diastolicBP != null ? Number(diastolicBP) : null,
        anamnesis, diagnosis, evolution, prescription,
        procedures: {
          create: (Array.isArray(procedureIds) ? procedureIds : [])
            .map((pid) => ({ procedureId: Number(pid) })),
        },
      },
      include: {
        procedures: { include: { procedure: true } },
      },
    });

    return Response.json({ ok: true, consultation: created });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
