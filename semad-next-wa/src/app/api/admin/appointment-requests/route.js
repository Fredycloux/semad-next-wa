// Impide caching/ISR y fuerza ejecución en cada request
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";

/**
 * Devuelve SOLO las solicitudes de cita PENDIENTES,
 * ordenadas por fecha de creación (más recientes primero).
 */
export async function GET() {
  try {
    const items = await prisma.appointmentRequest.findMany({
      where: { status: "Pendiente" },      // <--- FILTRO CLAVE
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
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
