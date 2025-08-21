import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOr(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function POST(req, { params }) {
  try {
    const id = params?.id;
    const b = await req.json();
    const type = String(b.type || "ADJUSTMENT").toUpperCase(); // PURCHASE | USE | ADJUSTMENT | WASTE | RETURN
    const qty = intOr(b.quantity, 0);
    const unitCost = b.unitCost != null ? intOr(b.unitCost, 0) : null;

    if (!id) return Response.json({ ok: false, error: "Item inválido" }, { status: 400 });
    if (!qty) return Response.json({ ok: false, error: "Cantidad requerida" }, { status: 400 });

    // signo: + ingresos, - egresos (salvo ADJUSTMENT que puede venir con signo)
    const sign = type === "PURCHASE" || type === "RETURN" ? 1 : type === "ADJUSTMENT" ? Math.sign(qty) || 1 : -1;
    const delta = sign * Math.abs(qty);

    const res = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new Error("Ítem no encontrado");

      // Crear movimiento
      const mov = await tx.inventoryMovement.create({
        data: {
          itemId: id,
          type,
          quantity: delta,
          unitCost,
          ref: b.ref || null,
          note: b.note || null,
        },
      });

      // Recalcular stock y costo promedio en compras
      let newStock = item.stock + delta;
      if (newStock < 0) newStock = 0; // clamp simple

      let avgCost = item.avgCost;
      let lastCost = item.lastCost;

      if (type === "PURCHASE" && unitCost != null) {
        // promedio ponderado: (stock*avg + qty*unit) / (stock+qty)
        const baseStock = Math.max(item.stock, 0);
        const totalCost = baseStock * avgCost + Math.abs(qty) * unitCost;
        const totalQty = baseStock + Math.abs(qty);
        avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : unitCost;
        lastCost = unitCost;
      }

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { stock: newStock, avgCost, lastCost },
      });

      return { mov, item: updated };
    });

    return Response.json({ ok: true, ...res });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
