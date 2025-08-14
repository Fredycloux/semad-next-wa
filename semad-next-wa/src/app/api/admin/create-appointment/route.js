// /src/app/api/admin/create-appointment/route.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function to24h(t) {
  if (!t) return null;
  const x = t.trim().toLowerCase().replace(/\s+/g, ""); // "08:42pm" / "08:42p.m."
  const m = x.match(/^(\d{1,2}):(\d{2})(am|a\.m\.|pm|p\.m\.)?$/i);
  if (!m) return t; // ya puede venir "20:42"
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = (m[3] || "").replace(/\./g, "");
  if (ampm.startsWith("p") && h < 12) h += 12;
  if (ampm.startsWith("a") && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const patient  = String(body.patient || "").trim();      // Nombre completo
    const phone    = String(body.phone || "").trim();        // Teléfono
    const document = String(body.document || "").trim();     // Documento (puede ser vacío)
    const dateStr  = String(body.date || "").trim();         // "YYYY-MM-DD"
    const timeStr  = to24h(String(body.time || "").trim());  // "HH:mm" normalizado
    const dentist  = String(body.dentist || "").trim();      // Nombre del odontólogo (string)
    const reason   = String(body.reason || "").trim();       // Procedimiento (string)

    if (!patient || !dateStr || !timeStr || !reason) {
      return Response.json(
        { ok: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Combinar fecha y hora a Date (zona local del servidor)
    const when = new Date(`${dateStr}T${timeStr}:00`);

    // === Buscar o crear/actualizar paciente ===
    // Como document NO es @unique en tu schema, usamos findFirst por document o phone.
    let dbPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          document ? { document } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean),
      },
      select: { id: true },
    });

    if (!dbPatient) {
      dbPatient = await prisma.patient.create({
        data: {
          fullName: patient,
          phone: phone || null,
          document: document || null,
        },
        select: { id: true },
      });
    } else {
      // Actualiza datos básicos por si cambiaron
      await prisma.patient.update({
        where: { id: dbPatient.id },
        data: {
          fullName: patient,
          phone: phone || null,
          document: document || null,
        },
      });
    }

    // === Crear la cita conectando al paciente ===
    const appt = await prisma.appointment.create({
      data: {
        date: when,
        reason,              // string
        dentist: dentist || null, // string (opcional)
        patient: { connect: { id: dbPatient.id } },
      },
      select: { id: true },
    });

    return Response.json({ ok: true, id: appt.id });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
