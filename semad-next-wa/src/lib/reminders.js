/*
 * Utility functions to send WhatsApp and email reminders for upcoming
 * appointments. These helpers use Twilio for WhatsApp and Nodemailer
 * for email. All credentials and sender identities should be
 * provided via environment variables. To use these helpers you will
 * need to add the appropriate packages to your project:
 *
 *   npm install twilio nodemailer
 *
 * The following environment variables are expected:
 *
 *   TWILIO_ACCOUNT_SID     – Twilio account SID
 *   TWILIO_AUTH_TOKEN      – Twilio auth token
 *   TWILIO_WHATSAPP_FROM   – Your WhatsApp enabled Twilio number
 *   SMTP_HOST              – Hostname of your SMTP server
 *   SMTP_PORT              – Port number for your SMTP server
 *   SMTP_SECURE            – "true" if using TLS/SSL, otherwise "false"
 *   SMTP_USER              – Username for your SMTP server
 *   SMTP_PASS              – Password for your SMTP server
 *   EMAIL_FROM_NAME        – Friendly name used in the From header
 *   EMAIL_FROM_ADDRESS     – Email address used in the From header
 */

import twilio from "twilio";
import nodemailer from "nodemailer";

/**
 * Send a WhatsApp reminder message via the Twilio API.
 *
 * @param {string} toPhone   The recipient's phone number in E.164 format (e.g. "+573001234567")
 * @param {string} body      The message body to send
 * @returns {Promise<void>}
 */
export async function sendWhatsAppReminder(toPhone, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM in your environment."
    );
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body,
    from: `whatsapp:${fromNumber}`,
    to: `whatsapp:${toPhone}`,
  });
}

/**
 * Send an email reminder using an SMTP transport. Uses Nodemailer to
 * construct and dispatch the email. The HTML body can include
 * appointment details and links for confirmation or rescheduling.
 *
 * @param {string} to        Recipient email address
 * @param {string} subject   Subject line of the email
 * @param {string} html      HTML body of the message
 * @returns {Promise<void>}
 */
export async function sendEmailReminder(to, subject, html) {
  const host   = process.env.SMTP_HOST;
  const port   = parseInt(process.env.SMTP_PORT || "0", 10);
  const secure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  const fromName    = process.env.EMAIL_FROM_NAME || "SEMAD Consultorio";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  if (!host || !port || !user || !pass || !fromAddress) {
    throw new Error(
      "Missing SMTP configuration. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM_ADDRESS in your environment."
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject,
    html,
  });
}

/**
 * Build a personalized reminder message for WhatsApp based on an
 * appointment. The returned string can be passed directly to
 * sendWhatsAppReminder().
 *
 * @param {object} appointment   The appointment object containing patient and schedule info
 * @returns {string}
 */
export function buildWhatsAppMessage(appointment) {
  const { patientName, dateTime, doctorName, clinicName } = appointment;
  const date = new Date(dateTime).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const time = new Date(dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  return (
    `Hola ${patientName},\n` +
    `Te recordamos tu cita en ${clinicName} con el doctor ${doctorName} para el día ${date} a las ${time}.\n` +
    `Si necesitas reprogramar o cancelar, por favor comunícate con nosotros. ¡Te esperamos!`
  );
}

/**
 * Build an HTML email template for an appointment reminder. You can
 * customize styles or include additional information such as a
 * confirmation link or directions to the clinic.
 *
 * @param {object} appointment   The appointment object containing patient and schedule info
 * @returns {string}
 */
export function buildEmailTemplate(appointment) {
  const { patientName, dateTime, doctorName, clinicName, address } = appointment;
  const date = new Date(dateTime).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const time = new Date(dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  return `
    <div style="font-family: sans-serif; line-height:1.5; color:#374151;">
      <h2 style="color:#6d28d9;">Recordatorio de cita</h2>
      <p>Hola ${patientName},</p>
      <p>Este es un recordatorio de tu cita en <strong>${clinicName}</strong> con el doctor <strong>${doctorName}</strong>.</p>
      <p><strong>Fecha:</strong> ${date}<br/>
         <strong>Hora:</strong> ${time}</p>
      ${address ? `<p><strong>Dirección:</strong> ${address}</p>` : ""}
      <p>Si necesitas reprogramar o cancelar, contesta este correo o llámanos al número de contacto.</p>
      <p>¡Te esperamos!</p>
    </div>
  `;
}