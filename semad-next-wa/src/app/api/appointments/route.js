/*
 * Endpoint de ejemplo para crear una cita y enviar recordatorios
 * automáticamente por WhatsApp y correo electrónico. Este archivo usa
 * las funciones definidas en `src/lib/reminders.js`. Ajusta la
 * persistencia de la cita según tu base de datos y lógica.
 */

import { sendWhatsAppReminder, sendEmailReminder, buildWhatsAppMessage, buildEmailTemplate } from "../../../lib/reminders";

// Este handler implementa el método POST. Puedes añadir otros métodos
// (GET, PUT, DELETE) según las necesidades de tu aplicación.
export async function POST(req) {
  try {
    const data = await req.json();

    // TODO: Guarda la cita en tu base de datos aquí. Por ejemplo:
    // const appointment = await prisma.appointment.create({ data });
    // Para este ejemplo, creamos un objeto ficticio con los datos
    const appointment = {
      id: "temp-id",
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail: data.patientEmail,
      doctorName: data.doctorName,
      clinicName: process.env.CLINIC_NAME || "Consultorio Odontológico",
      address: process.env.CLINIC_ADDRESS || "",
      dateTime: data.dateTime,
    };

    // Envío del recordatorio por WhatsApp
    try {
      const body = buildWhatsAppMessage(appointment);
      await sendWhatsAppReminder(appointment.patientPhone, body);
    } catch (err) {
      console.error("Error al enviar WhatsApp:", err);
    }

    // Envío del recordatorio por correo electrónico
    try {
      const subject = `Recordatorio de cita – ${appointment.clinicName}`;
      const html = buildEmailTemplate(appointment);
      await sendEmailReminder(appointment.patientEmail, subject, html);
    } catch (err) {
      console.error("Error al enviar correo electrónico:", err);
    }

    return new Response(JSON.stringify({ appointmentId: appointment.id }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response("Error al crear la cita", { status: 500 });
  }
}
