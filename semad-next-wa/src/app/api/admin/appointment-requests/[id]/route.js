import { prisma } from "@/lib/prisma";

/**
 * Elimina una solicitud de cita. Se utiliza cuando el odontólogo asigna o
 * descarta la solicitud. Alternativamente, podría actualizar el estado,
 * pero para simplicidad la eliminamos.
 */
export async function DELETE(_req, { params }) {
  try {
    const { id } = params;
    await prisma.appointmentRequest.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 },
    );
  }
}
