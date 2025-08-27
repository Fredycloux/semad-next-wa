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
    const email    = String(body.email || "").trim();
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
          email: email || null,
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
          email: email || null,
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

    // === Enviar recordatorios al paciente ===
    // Construimos un objeto con la información de la cita
    const appointmentInfo = {
      patientName: patient,
      patientPhone: phone,
      patientEmail: email,
      doctorName: dentist,
      clinicName: process.env.CLINIC_NAME || "Consultorio Odontológico",
      address: process.env.CLINIC_ADDRESS || "",
      dateTime: when.toISOString(),
      reason,  // añadimos el motivo para usarlo en el correo del doctor
    };

    // WhatsApp y correo al paciente
    if (phone) {
      try {
        const bodyMsg = buildWhatsAppMessage(appointmentInfo);
        await sendWhatsAppReminder(phone, bodyMsg);
      } catch (err) {
        console.error("Error al enviar WhatsApp al paciente:", err);
      }
    }

    if (email) {
      try {
        const subject = `Recordatorio de cita – ${appointmentInfo.clinicName}`;
        const html    = buildEmailTemplate(appointmentInfo);
        await sendEmailReminder(email, subject, html);
      } catch (err) {
        console.error("Error al enviar correo electrónico al paciente:", err);
      }
    }

    // === Enviar aviso al odontólogo con mensaje personalizado ===
    const dentistPhone = process.env.DENTIST_PHONE;
    const dentistEmail = process.env.DENTIST_EMAIL;

    // Formatear fecha y hora para el mensaje del doctor
    const dateFormatted = new Date(appointmentInfo.dateTime).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFormatted = new Date(appointmentInfo.dateTime).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // WhatsApp al doctor: nueva cita
    if (dentistPhone) {
      try {
        const doctorBody =
          `Hola Dr.(a) ${appointmentInfo.doctorName || ""},\n` +
          `Tienes una nueva cita programada con ${appointmentInfo.patientName} el día ${dateFormatted} a las ${timeFormatted}.\n` +
          `Motivo: ${appointmentInfo.reason || "-"}.`;
        await sendWhatsAppReminder(dentistPhone, doctorBody);
      } catch (err) {
        console.error("Error al enviar WhatsApp al doctor:", err);
      }
    }

    // Correo al doctor: nueva cita
    if (dentistEmail) {
      try {
        const doctorSubject = `Nueva cita programada con ${appointmentInfo.patientName}`;
        const doctorHtml = `
          <div style="font-family: sans-serif; line-height:1.5; color:#374151;">
            <h2 style="color:#6d28d9;">Nueva cita programada</h2>
            <p>Hola Dr.(a) ${appointmentInfo.doctorName || ""},</p>
            <p>Se ha programado una cita con <strong>${appointmentInfo.patientName}</strong>.</p>
            <p><strong>Fecha:</strong> ${dateFormatted}<br/>
               <strong>Hora:</strong> ${timeFormatted}</p>
            <p><strong>Motivo:</strong> ${appointmentInfo.reason || "-"}</p>
          </div>
        `;
        await sendEmailReminder(dentistEmail, doctorSubject, doctorHtml);
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
