// /src/app/api/admin/create-appointment/route.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function to24h(t) {
  // "08:42 p. m." | "08:42 pm" | "8:42 pm" -> "20:42"
  if (!t) return null;
  const x = t.trim().toLowerCase().replace(/\s+/g, ''); // "08:42p.m." / "08:42pm"
  const m = x.match(/^(\d{1,2}):(\d{2})(am|a\.m\.|pm|p\.m\.)?$/i);
  if (!m) return t; // ya podría venir "20:42"
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = (m[3] || '').replace(/\./g, '');
  if (ampm.startsWith('p') && h < 12) h += 12;
  if (ampm.startsWith('a') && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const patient   = String(body.patient || '').trim();
    const phone     = String(body.phone || '').trim();
    const document  = String(body.document || '').trim();
    const dateStr   = String(body.date || '').trim();  // "2025-08-14"
    const timeStr   = to24h(String(body.time || '').trim()); // "20:42" normalizado
    const dentist   = String(body.dentist || '').trim();     // nombre del select
    const reason    = String(body.reason || '').trim();      // nombre del select

    if (!patient || !phone || !document || !dateStr || !timeStr || !dentist || !reason) {
      return Response.json({ ok: false, error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Combina fecha y hora a Date ISO (tomando hora local)
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);

    // (Opcional) Si Appointment referencia por id de Dentist/Procedure,
    // busca sus ids aquí. Si tu tabla guarda NOMBRE, puedes saltarte esto.
    // const dentistRow = await prisma.dentist.findFirst({ where: { name: dentist } });
    // const procedureRow = await prisma.procedure.findFirst({ where: { name: reason } });
    // if (!dentistRow || !procedureRow) {
    //   return Response.json({ ok:false, error:'Dentista o Procedimiento no encontrado' }, { status: 400 });
    // }

    // Crea la cita. Ajusta nombres de campos si tu modelo difiere.
    const appt = await prisma.appointment.create({
      data: {
        patient,
        phone,
        document,
        date: dateTime,
        dentist,  // o dentistId: dentistRow.id
        reason,   // o procedureCode / procedureId: procedureRow.id
      },
    });

    return Response.json({ ok: true, id: appt.id });
  } catch (e) {
    // devolvemos el mensaje real para depurar desde el front
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
