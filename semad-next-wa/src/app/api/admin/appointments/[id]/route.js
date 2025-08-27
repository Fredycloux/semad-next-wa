import { prisma } from "@/lib/prisma";
import {
  sendWhatsAppReminder,
  sendEmailReminder,
  buildCancellationWhatsAppMessage,
  buildCancellationEmailTemplate,
} from "@/lib/reminders";

export async function DELETE(_req, { params }) {
  try {
    // 1. Recuperar la cita y datos del paciente antes de cancelarla
    const appt = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: {
        date: true,
        dentist: true,
        reason: true,
        patient: {
          select: { fullName: true, phone: true, email: true },
        },
      },
    });

    if (!appt) {
      return Response.json({ ok: false, error: "Cita no encontrada" }, { status: 404 });
    }

    // 2. Actualizar la cita a "Cancelada"
    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "Cancelada" },
    });

    // 3. Construir un objeto común con la información de la cita
    const appointmentInfo = {
      patientName: appt.patient.fullName,
      patientPhone: appt.patient.phone,
      patientEmail: appt.patient.email,
      doctorName: appt.dentist ?? "",
      clinicName: process.env.CLINIC_NAME || "Consultorio Odontológico",
      address: process.env.CLINIC_ADDRESS || "",
      dateTime: appt.date.toISOString(),
      reason: appt.reason || "",
    };

    // 4. Avisar al paciente utilizando las plantillas de cancelación
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

    // 5. Avisar al odontólogo con un mensaje personalizado
    const dentistPhone = process.env.DENTIST_PHONE;
    const dentistEmail = process.env.DENTIST_EMAIL;
    // Formatear fecha y hora para el mensaje del doctor
    const date = new Date(appointmentInfo.dateTime).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = new Date(appointmentInfo.dateTime).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // WhatsApp al doctor: cita cancelada
    if (dentistPhone) {
      try {
        const doctorBody =
          `Hola Dr.(a) ${appointmentInfo.doctorName || ""},\n` +
          `La cita con ${appointmentInfo.patientName} del día ${date} a las ${time} ha sido cancelada.`;
        await sendWhatsAppReminder(dentistPhone, doctorBody);
      } catch (err) {
        console.error("Error al enviar WhatsApp de cancelación al doctor:", err);
      }
    }

    // Correo al doctor: cita cancelada
    if (dentistEmail) {
      try {
        const doctorSubject = `Cita cancelada – ${appointmentInfo.patientName}`;
        const doctorHtml = `
          <div style="font-family: sans-serif; line-height:1.5; color:#374151;">
            <h2 style="color:#dc2626;">Cita cancelada</h2>
            <p>Hola Dr.(a) ${appointmentInfo.doctorName || ""},</p>
            <p>La cita con <strong>${appointmentInfo.patientName}</strong> prevista para el día ${date} a las ${time} ha sido cancelada.</p>
            <p><strong>Motivo:</strong> ${appointmentInfo.reason || "-"}</p>
          </div>
        `;
        await sendEmailReminder(dentistEmail, doctorSubject, doctorHtml);
      } catch (err) {
        console.error("Error al enviar correo de cancelación al doctor:", err);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
