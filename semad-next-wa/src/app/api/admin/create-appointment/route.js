// /src/app/api/admin/create-appointment/route.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Importa las funciones de recordatorio
import {
  sendWhatsAppReminder,
  sendEmailReminder,
  buildWhatsAppMessage,
  buildEmailTemplate,
} from "../../../../lib/reminders";

function to24h(t) {
  if (!t) return null;
  const x = t.trim().toLowerCase().replace(/\s+/g, "");
  const m = x.match(/^(\d{1,2}):(\d{2})(am|a\.m\.|pm|p\.m\.)?$/i);
  if (!m) return t;
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

    const patient  = String(body.patient || "").trim();
    const phone    = String(body.phone || "").trim();
    const email    = String(body.email || "").trim();        // nuevo campo
    const document = String(body.document || "").trim();
    const dateStr  = String(body.date || "").trim();
    const timeStr  = to24h(String(body.time || "").trim());
    const dentist  = String(body.dentist || "").trim();
    const reason   = String(body.reason || "").trim();

    if (!patient || !dateStr || !timeStr || !reason) {
      return Response.json(
        { ok: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Combinar fecha y hora
    const when = new Date(`${dateStr}T${timeStr}:00`);

    // === Buscar o crear/actualizar paciente ===
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
          email: email || null,   // guarda email al crear paciente
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
          email: email || null,   // actualiza email si viene en el formulario
        },
      });
    }

    // === Crear la cita conectando al paciente ===
    const appt = await prisma.appointment.create({
      data: {
        date: when,
        reason,
        dentist: dentist || null,
        patient: { connect: { id: dbPatient.id } },
      },
      select: { id: true },
    });

    // === Enviar recordatorios ===
    // Construimos un objeto con la información de la cita
    const appointmentInfo = {
      patientName: patient,
      patientPhone: phone,
      patientEmail: email,
      doctorName: dentist,
      clinicName: process.env.CLINIC_NAME || "Consultorio Odontológico",
      address: process.env.CLINIC_ADDRESS || "",
      dateTime: when.toISOString(),
    };

    // Enviar WhatsApp si hay teléfono
    if (phone) {
      try {
        const bodyMsg = buildWhatsAppMessage(appointmentInfo);
        await sendWhatsAppReminder(phone, bodyMsg);
      } catch (err) {
        console.error("Error al enviar WhatsApp al paciente:", err);
      }
    }

    // Enviar correo si hay email
    if (email) {
      try {
        const subject = `Recordatorio de cita – ${appointmentInfo.clinicName}`;
        const html    = buildEmailTemplate(appointmentInfo);
        await sendEmailReminder(email, subject, html);
      } catch (err) {
        console.error("Error al enviar correo electrónico al paciente:", err);
      }
    }

    // === Enviar copia al odontólogo ===
    // Obtén tus datos de contacto desde las variables de entorno
    const dentistPhone = process.env.DENTIST_PHONE;
    const dentistEmail = process.env.DENTIST_EMAIL;

    // Si hay un número de odontólogo configurado, envía WhatsApp
    if (dentistPhone) {
      try {
        const bodyDr = buildWhatsAppMessage(appointmentInfo);
        await sendWhatsAppReminder(dentistPhone, bodyDr);
      } catch (err) {
        console.error("Error al enviar WhatsApp al doctor:", err);
      }
    }

    // Si hay un correo de odontólogo configurado, envía correo
    if (dentistEmail) {
      try {
        const subjectDr = `Recordatorio de cita – ${appointmentInfo.clinicName}`;
        const htmlDr    = buildEmailTemplate(appointmentInfo);
        await sendEmailReminder(dentistEmail, subjectDr, htmlDr);
      } catch (err) {
        console.error("Error al enviar correo electrónico al doctor:", err);
      }
    }

    return Response.json({ ok: true, id: appt.id });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
