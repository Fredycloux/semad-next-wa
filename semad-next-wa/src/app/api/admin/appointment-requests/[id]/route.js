export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";

/**
 * Elimina una solicitud de cita cuando se atiende.
 * (Si prefieres marcar como Asignada en vez de borrar,
 *   usa el PATCH de abajo y no llames a DELETE.)
 */
export async function DELETE(_req, { params }) {
  try {
    await prisma.appointmentRequest.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

/** OPCIONAL: marcar como Asignada en lugar de borrar
export async function PATCH(req, { params }) {
  try {
    const { status = "Asignada" } = await req.json();
    await prisma.appointmentRequest.update({
      where: { id: params.id },
      data: { status },
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
*/
