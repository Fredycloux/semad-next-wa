// src/app/api/admin/create-appointment/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Acepta "20:35", "08:35 p. m.", "08:35 pm", "8:05am", etc. y devuelve "HH:mm"
function to24h(time) {
  if (!time) return null;
  const t = time.toLowerCase().replace(/\s/g, "");
  // 8:35pm / 08:35p.m.
  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)?\.?m?\.?$/);
  if (!m) {
    // ya viene 24h (p.e. 20:35) -> dejamos pasar
    if (/^\d{2}:\d{2}$/.test(time)) return time;
    return null;
  }
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]; // am | pm | undefined
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export async function POST(req) {
  try {
    const { patient, phone, document, date, time, dentist, reason } = await req.json();

    // Validación mínima
    if (!patient || !phone || !document || !date || !time || !dentist || !reason) {
      return NextResponse.json({ ok: false, error: "Faltan campos requeridos" }, { status: 400 });
    }

    const hhmm = to24h(time);
    if (!hhmm) {
      return NextResponse.json({ ok: false, error: "Hora inválida" }, { status: 400 });
    }

    // Construimos un Date a partir de date (YYYY-MM-DD) + HH:mm
    // Usa tu campo real en Prisma: cambiar "datetime" por "date" o el que tengas
    const when = new Date(`${date}T${hhmm}:00`);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha/hora inválida" }, { status: 400 });
    }

    // Guarda la cita (ADAPTA el/los nombres de campos a tu modelo Appointment)
    const appt = await prisma.appointment.create({
      data: {
        patient,
        phone,
        document,
        // Si tu modelo tiene "date" (DateTime):
        // date: when,
        // Si tu modelo tiene "datetime" (DateTime):
        datetime: when,
        dentist,  // si guardas texto; si guardas FK usa dentistId e identifica aquí
        reason,   // idem arriba
      },
    });

    return NextResponse.json({ ok: true, id: appt.id });
  } catch (err) {
    console.error("create-appointment error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
