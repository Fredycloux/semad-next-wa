// src/app/api/admin/invoices/[id]/route.js
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) {
    return Response.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: true,
      items: { include: { procedure: true } },
    },
  });

  if (!invoice) {
    return Response.json({ ok: false, error: "No existe" }, { status: 404 });
  }
  return Response.json({ ok: true, invoice });
}
