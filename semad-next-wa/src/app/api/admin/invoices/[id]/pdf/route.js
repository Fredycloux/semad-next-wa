import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (n) => new Intl.NumberFormat("es-CO").format(Number(n || 0));

// Paleta (violeta estilo Tailwind)
const BRAND = "#7c3aed";        // violet-600
const BRAND_LIGHT = "#f5f3ff";  // violet-50
const TEXT_MUTED = "#6b7280";   // slate-500

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

  // QR PNG
  const qrDataUrl = await QRCode.toDataURL(detailUrl, { margin: 0, scale: 6 });
  const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");

  // Logo (opcional) - ajusta el path si tu archivo se llama distinto
  let logoBuf = null;
  try {
    const r = await fetch(new URL("/logo_semad.png", origin));
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch (_) {}

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Dimensiones útiles
  const left = doc.page.margins.left;                  // 50
  const right = doc.page.width - doc.page.margins.right; // 545
  const width = right - left;                          // 495

  // ======= Header =======
  const topY = 40;

  // Logo a la izquierda
  if (logoBuf) doc.image(logoBuf, left, topY, { width: 140 });

  // QR a la derecha
  const qrW = 130;
  const qrX = right - qrW;
  const qrY = topY + 10;
  doc.image(qrBuf, qrX, qrY, { width: qrW });

  // Tarjeta con info de la factura (izquierda del QR)
  const infoX = left + (logoBuf ? 150 : 0);
  const infoW = qrX - infoX - 16;
  const infoH = 70;

  doc.save()
    .roundedRect(infoX, topY, infoW, infoH, 8)
    .fillAndStroke(BRAND_LIGHT, BRAND);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND)
    .text("Factura", infoX + 12, topY + 10);
  doc.font("Helvetica").fillColor("black")
    .text(inv.folio || inv.id, infoX + 90, topY + 10);

  doc.font("Helvetica-Bold").fillColor(BRAND)
    .text("Fecha", infoX + 12, topY + 32);
  doc.font("Helvetica").fillColor("black")
    .text(new Date(inv.date).toLocaleString("es-CO"), infoX + 90, topY + 32);

  // ==== Paciente ====
  let y = topY + Math.max(infoH, qrW / 1.8) + 20;

  doc.font("Helvetica-Bold").fontSize(12).fillColor("black")
    .text("Paciente:", left, y);
  doc.font("Helvetica").fontSize(12)
    .text(inv.patient?.fullName || "—", left + 80, y);
  y += 16;
  doc.fillColor(TEXT_MUTED).fontSize(11)
    .text(
      `Doc: ${inv.patient?.document || "—"}${inv.patient?.phone ? `  ·  ${inv.patient.phone}` : ""}`,
      left + 80,
      y
    );
  y += 24;

  // Separador
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#d1d5db").stroke();
  y += 10;

  // ======= Tabla =======
  // Definimos columnas
  const colW = { code: 66, tooth: 44, qty: 44, unit: 90, sub: 100 };
  const gap = 10;

  const xSub   = right - colW.sub;
  const xUnit  = xSub  - gap - colW.unit;
  const xQty   = xUnit - gap - colW.qty;
  const xTooth = xQty  - gap - colW.tooth;
  const xCode  = left;
  const xName  = xCode + colW.code + gap;
  const wName  = xTooth - xName - gap;

  // Encabezado con fondo de color
  const headH = 22;
  doc.save()
    .rect(left, y, width, headH)
    .fill(BRAND);
  doc.restore();

  doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
    .text("Código", xCode + 4, y + 5)
    .text("Procedimiento", xName + 2, y + 5)
    .text("Diente", xTooth, y + 5, { width: colW.tooth })
    .text("Cant.", xQty, y + 5, { width: colW.qty, align: "right" })
    .text("P. unitario", xUnit, y + 5, { width: colW.unit, align: "right" })
    .text("Subtotal", xSub, y + 5, { width: colW.sub, align: "right" });

  y += headH;

  // Filas (cebra)
  doc.font("Helvetica").fontSize(11).fillColor("black");
  const rowPadY = 6;

  for (let i = 0; i < inv.items.length; i++) {
    const it = inv.items[i];
    const name = it.procedure?.name || "—";
    const hName = Math.max(16, doc.heightOfString(name, { width: wName }));

    const rowH = hName + rowPadY * 2;

    // zebra
    if (i % 2 === 0) {
      doc.save()
        .rect(left, y, width, rowH)
        .fill(BRAND_LIGHT);
      doc.restore();
    }

    const rowY = y + rowPadY;

    doc.fillColor("black");
    doc.text(it.procedureCode, xCode + 4, rowY, { width: colW.code });
    doc.text(name, xName + 2, rowY, { width: wName });
    doc.text(it.tooth || "—", xTooth, rowY, { width: colW.tooth });
    doc.text(String(it.quantity), xQty, rowY, { width: colW.qty, align: "right" });
    doc.text(`$ ${money(it.unitPrice)}`, xUnit, rowY, { width: colW.unit, align: "right" });
    doc.text(`$ ${money(it.subtotal)}`, xSub, rowY, { width: colW.sub, align: "right" });

    y += rowH;

    // salto simple si faltara espacio (caso raro)
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = topY;
    }
  }

  // Línea + Total destacado
  y += 8;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#d1d5db").stroke();
  y += 12;

  const totalBoxW = 200;
  const totalBoxH = 32;
  const totalBoxX = right - totalBoxW;

  doc.save()
    .roundedRect(totalBoxX, y, totalBoxW, totalBoxH, 8)
    .fill(BRAND);
  doc.restore();

  doc.fillColor("white").font("Helvetica-Bold").fontSize(12)
    .text("Total", totalBoxX + 12, y + 9);
  doc.text(`$ ${money(inv.total)}`, totalBoxX, y + 9, {
    width: totalBoxW - 12,
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
