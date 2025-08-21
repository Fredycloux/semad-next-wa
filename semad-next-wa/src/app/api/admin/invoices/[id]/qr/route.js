import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return new Response("id requerido", { status: 400 });

  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, folio: true, total: true, date: true },
  });
  if (!inv) return new Response("No existe", { status: 404 });

  // El contenido del QR: puedes ajustar al URL público de tu despliegue
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const url = `${base}/admin/invoices/${inv.id}`;

  const png = await QRCode.toBuffer(
    JSON.stringify({ folio: inv.folio, total: inv.total, url }),
    { type: "png", width: 320, margin: 1 }
  );

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
