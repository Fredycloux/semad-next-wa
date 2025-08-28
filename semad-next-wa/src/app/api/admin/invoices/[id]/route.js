import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Si tu ID en Prisma es Int, pon USE_INT_ID = true y convierte el id
 * Si es String (cuid/uuid), deja USE_INT_ID = false.
 */
const USE_INT_ID = false;

function coerceId(id) {
  if (!id) return id;
  return USE_INT_ID ? Number(id) : id;
}

export async function DELETE(_req, { params }) {
  try {
    const rawId = params?.id;
    if (!rawId) {
      return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
    }
    const id = coerceId(rawId);

    // 1) Borrar items primero para evitar constraint errors
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    // 2) Borrar la factura
    await prisma.invoice.delete({ where: { id } });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/invoices/[id] failed:", e);
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
