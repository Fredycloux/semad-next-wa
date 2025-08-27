import { prisma } from "@/lib/prisma";
import {
  sendWhatsAppReminder,
  sendEmailReminder,
  buildCancellationWhatsAppMessage,
  buildCancellationEmailTemplate,
} from "@/lib/reminders";

export async function DELETE(_req, { params }) {
  try {
    // 1. Recuperar datos de la cita antes de cancelarla
    const appt = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: {
        date: true,
        dentist: true,
        patient: {
          select: { fullName: true, phone: true, email: true },
        },
      },
    });

    if (!appt) {
      return Response.json({ ok: false, error: "Cita no encontrada" }, { status: 404 });
    }

    // 2. Actualizar estado a "Cancelada"
    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "Cancelada" },
    });

    // 3. Construir información de la cita para los mensajes
    const appointmentInfo = {
      patientName: appt.patient.fullName,
      patientPhone: appt.patient.phone,
      patientEmail: appt.patient.email,
      doctorName: appt.dentist ?? "",
      clinicName: process.env.CLINIC_NAME || "Consultorio Odontológico",
      address: process.env.CLINIC_ADDRESS || "",
      dateTime: appt.date.toISOString(),
    };

    // 4. Avisar al paciente
    if (appointmentInfo.patientPhone) {
      try {
        const body = buildCancellationWhatsAppMessage(appointmentInfo);
        await sendWhatsAppReminder(appointmentInfo.patientPhone, body);
      } catch (err) {
        console.error("Error al enviar WhatsApp de cancelación al paciente:", err);
      }
    }
    if (appointmentInfo.patientEmail) {
      try {
        const subject = `Cancelación de cita – ${appointmentInfo.clinicName}`;
        const html    = buildCancellationEmailTemplate(appointmentInfo);
        await sendEmailReminder(appointmentInfo.patientEmail, subject, html);
      } catch (err) {
        console.error("Error al enviar correo de cancelación al paciente:", err);
      }
    }

    // 5. Avisar al odontólogo (usando variables de entorno)
    const dentistPhone = process.env.DENTIST_PHONE;
    const dentistEmail = process.env.DENTIST_EMAIL;

    if (dentistPhone) {
      try {
        const bodyDr = buildCancellationWhatsAppMessage(appointmentInfo);
        await sendWhatsAppReminder(dentistPhone, bodyDr);
      } catch (err) {
        console.error("Error al enviar WhatsApp de cancelación al doctor:", err);
      }
    }
    if (dentistEmail) {
      try {
        const subjectDr = `Cancelación de cita – ${appointmentInfo.clinicName}`;
        const htmlDr    = buildCancellationEmailTemplate(appointmentInfo);
        await sendEmailReminder(dentistEmail, subjectDr, htmlDr);
      } catch (err) {
        console.error("Error al enviar correo de cancelación al doctor:", err);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
