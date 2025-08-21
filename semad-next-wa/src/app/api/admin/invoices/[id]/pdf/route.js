import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (n) => new Intl.NumberFormat("es-CO").format(Number(n || 0));

// Colores y tamaños compactos
const BRAND = "#7c3aed";        // violeta
const BRAND_LIGHT = "#f5f3ff";  // violeta muy claro
const TEXT_MUTED = "#6b7280";   // gris
const FONT = { base: 10, small: 9, hdr: 11 };

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { patient: true, items: { include: { procedure: true } } },
  });
  if (!inv) return new Response("Factura no encontrada", { status: 404 });

  const origin = req.nextUrl.origin;
  const detailUrl = new URL(`/admin/invoices/${inv.id}`, origin).toString();

  // QR compacto y nítido
  const qrDataUrl = await QRCode.toDataURL(detailUrl, { margin: 0, scale: 4 });
  const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");

  // Logo (opcional)
  let logoBuf = null;
  try {
    const r = await fetch(new URL("/logo_semad.png", origin));
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch {}

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // ======= HEADER COMPACTO =======
  const topY = 36;
  const logoW = logoBuf ? 120 : 0;
  const gutter = logoBuf ? 18 : 0;

  if (logoBuf) doc.image(logoBuf, left, topY, { width: logoW });

  // QR reducido y alineado a la derecha
  const qrW = 100;
  const qrX = right - qrW;
  const qrY = topY;
  doc.image(qrBuf, qrX, qrY, { width: qrW });

  // Tarjeta “Factura / Fecha” entre logo y QR
  const infoX = left + logoW + gutter;
  const infoW = Math.max(240, qrX - 16 - infoX); // deja aire con el QR
  const infoH = 56;

  doc.save()
    .roundedRect(infoX, topY, infoW, infoH, 8)
    .fillAndStroke(BRAND_LIGHT, BRAND);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(FONT.hdr).fillColor(BRAND)
    .text("Factura", infoX + 12, topY + 10);
  doc.font("Helvetica").fontSize(FONT.hdr).fillColor("black")
    .text(inv.folio || inv.id, infoX + 82, topY + 10);

  doc.font("Helvetica-Bold").fontSize(FONT.hdr).fillColor(BRAND)
    .text("Fecha", infoX + 12, topY + 32);
  doc.font("Helvetica").fontSize(FONT.base).fillColor("black")
    .text(new Date(inv.date).toLocaleString("es-CO"), infoX + 82, topY + 32);

  // ======= PACIENTE =======
  let y = Math.max(topY + infoH, qrY + qrW) + 18;

  doc.font("Helvetica-Bold").fontSize(FONT.hdr).fillColor("black")
    .text("Paciente:", left, y);
  doc.font("Helvetica").fontSize(FONT.hdr)
    .text(inv.patient?.fullName || "—", left + 76, y);

  y += 15;
  doc.fillColor(TEXT_MUTED).fontSize(FONT.base)
    .text(
      `Doc: ${inv.patient?.document || "—"}${inv.patient?.phone ? `  ·  ${inv.patient.phone}` : ""}`,
      left + 76,
      y
    );

  y += 16;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#d1d5db").stroke();
  y += 8;

  // ======= TABLA COMPACTA =======
  const colW = { code: 62, tooth: 40, qty: 40, unit: 86, sub: 96 };
  const gap = 10;

  const xSub   = right - colW.sub;
  const xUnit  = xSub  - gap - colW.unit;
  const xQty   = xUnit - gap - colW.qty;
  const xTooth = xQty  - gap - colW.tooth;
  const xCode  = left;
  const xName  = xCode + colW.code + gap;
  const wName  = xTooth - xName - gap;

  // Encabezado con fondo
  const headH = 20;
  doc.save().rect(left, y, width, headH).fill(BRAND).restore();

  doc.fillColor("white").font("Helvetica-Bold").fontSize(FONT.base)
    .text("Código", xCode + 4, y + 4)
    .text("Procedimiento", xName + 2, y + 4)
    .text("Diente", xTooth, y + 4, { width: colW.tooth })
    .text("Cant.", xQty, y + 4, { width: colW.qty, align: "right" })
    .text("P. unitario", xUnit, y + 4, { width: colW.unit, align: "right" })
    .text("Subtotal", xSub, y + 4, { width: colW.sub, align: "right" });

  y += headH;

  // Filas (cebra) con altura mínima compacta
  doc.font("Helvetica").fontSize(FONT.base).fillColor("black");
  const rowPadY = 4;

  for (let i = 0; i < inv.items.length; i++) {
    const it = inv.items[i];
    const name = it.procedure?.name || "—";
    const hName = Math.max(14, doc.heightOfString(name, { width: wName, lineGap: 2 }));
    const rowH = hName + rowPadY * 2;

    if (i % 2 === 0) {
      doc.save().rect(left, y, width, rowH).fill(BRAND_LIGHT).restore();
    }

    const rowY = y + rowPadY;
    doc.text(it.procedureCode, xCode + 4, rowY, { width: colW.code });
    doc.text(name, xName + 2, rowY, { width: wName, lineGap: 2 });
    doc.text(it.tooth || "—", xTooth, rowY, { width: colW.tooth });
    doc.text(String(it.quantity), xQty, rowY, { width: colW.qty, align: "right" });
    doc.text(`$ ${money(it.unitPrice)}`, xUnit, rowY, { width: colW.unit, align: "right" });
    doc.text(`$ ${money(it.subtotal)}`, xSub, rowY, { width: colW.sub, align: "right" });

    y += rowH;

    // Salto de página si hiciera falta
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = topY;
    }
  }

  // ======= TOTAL COMPACTO =======
  y += 6;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
  y += 10;

  const totalBoxW = 220;
  const totalBoxH = 28;
  const totalBoxX = right - totalBoxW;

  doc.save().roundedRect(totalBoxX, y, totalBoxW, totalBoxH, 10).fill(BRAND).restore();

  doc.fillColor("white").font("Helvetica-Bold").fontSize(FONT.base + 1)
    .text("Total", totalBoxX + 14, y + 7);
  doc.text(`$ ${money(inv.total)}`, totalBoxX + 14, y + 7, {
    width: totalBoxW - 28,
    align: "right",
  });

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${inv.folio || inv.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
