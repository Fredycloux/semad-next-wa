import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 200);

  const items = await prisma.inventoryMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { item: true },
  });

  return Response.json({ ok: true, items });
}
