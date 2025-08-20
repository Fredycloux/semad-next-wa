import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function nextFolio(tx) {
  const year = new Date().getFullYear();
  const key = `invoice-${year}`;
  const c = await tx.counter.upsert({
    where: { name: key },
    update: { value: { increment: 1 } },
    create: { name: key, value: 1 },
  });
  const num = String(c.value).padStart(6, "0");
  return `FAC-${year}-${num}`;
}

export async function GET() {
  // Rellena TODAS las facturas con folio NULL (no espera id)
  const updated = await prisma.$transaction(async (tx) => {
    const pending = await tx.invoice.findMany({ where: { folio: null } });
    let count = 0;
    for (const inv of pending) {
      const folio = await nextFolio(tx);
      await tx.invoice.update({ where: { id: inv.id }, data: { folio } });
      count++;
    }
    return count;
  });
  return Response.json({ ok: true, updated });
}
