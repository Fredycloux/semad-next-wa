// src/app/api/admin/consultations/route.js
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ ok:false, error:"Cuerpo JSON inválido" }, { status:400 }); }

  const {
    patientId,
    appointmentId,          // opcional
    temperature, pulse, respRate, systolicBP, diastolicBP,
    anamnesis, diagnosis, evolution, prescription,
    procedureIds = [],      // [Int]
  } = body || {};

  if (!patientId) {
    return Response.json({ ok:false, error:"patientId es obligatorio" }, { status:400 });
  }

  try {
    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        appointmentId: appointmentId ?? null,
        temperature: typeof temperature === "number" ? temperature : null,
        pulse:       typeof pulse === "number" ? pulse : null,
        respRate:    typeof respRate === "number" ? respRate : null,
        systolicBP:  typeof systolicBP === "number" ? systolicBP : null,
        diastolicBP: typeof diastolicBP === "number" ? diastolicBP : null,
        anamnesis:   anamnesis || null,
        diagnosis:   diagnosis || null,
        evolution:   evolution || null,
        prescription: prescription || null,
      },
    });

    if (Array.isArray(procedureIds) && procedureIds.length) {
      await prisma.consultationProcedure.createMany({
        data: procedureIds.map(id => ({
          consultationId: consultation.id,
          procedureId: Number(id),
        })),
        skipDuplicates: true,
      });
    }

    return Response.json({ ok:true, id: consultation.id });
  } catch (e) {
    return Response.json({ ok:false, error:String(e.message || e) }, { status:500 });
  }
}
