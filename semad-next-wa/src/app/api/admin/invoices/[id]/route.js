import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      items: { include: { procedure: true } },
    },
  });
  if (!inv) return Response.json({ ok: false, error: "Factura no encontrada" }, { status: 404 });
  return Response.json({ ok: true, invoice: inv });
}
