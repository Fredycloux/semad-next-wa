// src/app/api/admin/invoices/[id]/qr/route.js
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { id: true, folio: true, total: true, date: true },
  });
  if (!inv) return new Response("Not found", { status: 404 });

  // Lo que codifica el QR (puede ser la URL pública de la factura)
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/invoices/${inv.id}`;
  const payload = { folio: inv.folio, total: inv.total, url };
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { margin: 1, scale: 3 });

  const b64 = dataUrl.split(",")[1];
  const buf = Buffer.from(b64, "base64");
  return new Response(buf, { headers: { "Content-Type": "image/png" } });
}
