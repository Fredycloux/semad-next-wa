import { prisma } from "@/lib/prisma";

/**
 * Endpoint público para solicitar una cita. Recibe un JSON con
 * { fullName, document, phone, email, reason } y crea un registro
 * en la tabla AppointmentRequest. Devuelve { ok: true } si la
 * operación fue exitosa.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const document = String(body.document || "").trim();
    const phone    = String(body.phone || "").trim();
    const email    = String(body.email || "").trim();
    const reason   = String(body.reason || "").trim();

    if (!fullName) {
      return Response.json(
        { ok: false, error: "El nombre del paciente es obligatorio" },
        { status: 400 },
      );
    }

    await prisma.appointmentRequest.create({
      data: {
        fullName,
        document: document || null,
        phone: phone || null,
        email: email || null,
        reason: reason || null,
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
