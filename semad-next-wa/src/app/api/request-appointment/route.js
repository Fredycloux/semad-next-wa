import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIP } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

/**
 * Endpoint público para solicitar una cita. Recibe un JSON con
 * { fullName, document, phone, email, reason } y crea un registro
 * en la tabla AppointmentRequest. Devuelve { ok: true } si la
 * operación fue exitosa.
 * Rate limit: 5 solicitudes por IP por minuto.
 */
export async function POST(req) {
  // Rate limiting
  const ip = getIP(req);
  const { allowed } = checkRateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  if (!allowed) {
    return Response.json(
      { ok: false, error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 },
    );
  }

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

    if (email && !EMAIL_RE.test(email)) {
      return Response.json(
        { ok: false, error: "El correo electrónico no tiene un formato válido" },
        { status: 400 },
      );
    }

    if (phone && !PHONE_RE.test(phone)) {
      return Response.json(
        { ok: false, error: "El teléfono no tiene un formato válido" },
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
