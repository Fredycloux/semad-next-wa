import { prisma } from "@/lib/prisma";

async function nextFolio() {
  return await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const key = `invoice-${year}`;
    const c = await tx.counter.upsert({
      where: { name: key },
      update: { value: { increment: 1 } },
      create: { name: key, value: 1 },
    });
    const num = String(c.value).padStart(6, "0");
    return `FAC-${year}-${num}`;
  });
}

export async function GET() {
  const pending = await prisma.invoice.findMany({ where: { folio: null } });
  let updated = 0;
  for (const inv of pending) {
    const folio = await nextFolio();
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { folio },
    });
    updated++;
  }
  return Response.json({ ok: true, updated });
}
