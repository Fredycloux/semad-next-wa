// src/app/api/admin/invoices/[id]/qr/route.js
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export const runtime = "nodejs";
// 👇 OJO: aquí había un typo ("force-dynamc")
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!inv) return new Response("Factura no encontrada", { status: 404 });

    const origin = new URL(req.url).origin;
    const url = `${origin}/admin/invoices/${id}`;

    const png = await QRCode.toBuffer(url, { width: 256, margin: 0 });

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        // evita caches intermedios
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return new Response("QR error: " + String(e?.message || e), { status: 500 });
  }
}

