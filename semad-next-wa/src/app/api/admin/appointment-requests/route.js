import { prisma } from "@/lib/prisma";

/**
 * Devuelve una lista de solicitudes de cita ordenadas por fecha de creación.
 * Cada elemento incluye id, fullName, document, phone, email, reason y status.
 */
export async function GET() {
  try {
    const items = await prisma.appointmentRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        fullName: true,
        document: true,
        phone: true,
        email: true,
        reason: true,
        status: true,
      },
    });
    return Response.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 },
    );
  }
}
