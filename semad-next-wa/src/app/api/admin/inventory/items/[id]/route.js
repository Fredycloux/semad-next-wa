import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOr(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    const b = await req.json();
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        sku: b.sku ?? undefined,
        name: b.name ?? undefined,
        category: b.category ?? undefined,
        unit: b.unit ?? undefined,
        minStock: b.minStock != null ? intOr(b.minStock, 0) : undefined,
        note: b.note ?? undefined,
        active: b.active ?? undefined,
      },
    });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
