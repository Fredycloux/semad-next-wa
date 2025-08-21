import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOr(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const low = searchParams.get("low") === "1";

  const where = {
    active: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  let items = await prisma.inventoryItem.findMany({
    where,
    orderBy: [{ name: "asc" }],
    take: 300,
  });

  if (low) items = items.filter((i) => i.stock <= i.minStock);

  return Response.json({ ok: true, items });
}

export async function POST(req) {
  try {
    const b = await req.json();
    const item = await prisma.inventoryItem.create({
      data: {
        sku: b.sku || null,
        name: String(b.name || "").trim(),
        category: b.category || null,
        unit: b.unit || null,
        minStock: intOr(b.minStock, 0),
        note: b.note || null,
      },
    });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
