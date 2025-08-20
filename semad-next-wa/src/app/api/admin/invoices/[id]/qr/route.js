import QRCode from "qrcode";
export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const id = params?.id;
  const text = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/admin/invoices/${id}`;
  const png = await QRCode.toBuffer(text, { width: 256, margin: 1 });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
