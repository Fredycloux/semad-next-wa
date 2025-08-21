import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (n) => new Intl.NumberFormat("es-CO").format(Number(n || 0));

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

  // Logo opcional: /public/semad-logo.png
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
  const left = doc.page.margins.left;            // 50
  const right = doc.page.width - doc.page.margins.right; // 595 - 50 = 545
  const width = right - left;                    // 495

  // Header: logo + título
  let headerY = 40;
  if (logoBuf) {
    doc.image(logoBuf, left, headerY, { width: 110 });
  }
  doc.font("Helvetica-Bold").fontSize(22).text("", left + (logoBuf ? 120 : 0), headerY);

  // Info factura + QR a la derecha
  const qrW = 120;
  const qrX = right - qrW;
  const infoX = qrX - 150;
  doc.font("Helvetica").fontSize(11)
     .text(`Factura ${inv.folio || inv.id}`, infoX, headerY)
     .text(new Date(inv.date).toLocaleString("es-CO"), infoX, headerY + 16);
  doc.image(qrBuf, qrX, headerY + 40, { width: qrW });

  // Datos paciente
  let y = headerY + 120;
  doc.font("Helvetica-Bold").fontSize(11).text("Paciente:", left, y);
  doc.font("Helvetica").text(inv.patient?.fullName || "—", left + 70, y);
  y += 14;
  const docLine = `${inv.patient?.document || "—"}${inv.patient?.phone ? `  ·  ${inv.patient.phone}` : ""}`;
  doc.text(`Doc: ${docLine}`, left + 70, y);

  // --- Tabla alineada ---
  y = Math.max(y + 30, headerY + 190);

  // Definimos anchos/posiciones en función del ancho útil
  const colW = {
    code: 70,
    tooth: 40,
    qty: 40,
    unit: 70,
    sub: 80,
  };
  const gap = 10;

  const xSub  = right - colW.sub;
  const xUnit = xSub  - gap - colW.unit;
  const xQty  = xUnit - gap - colW.qty;
  const xTooth= xQty  - gap - colW.tooth;
  const xCode = left;
  const xName = xCode + colW.code + gap;
  const wName = xTooth - xName - gap;

  // Encabezado
  doc.moveTo(left, y - 8).lineTo(right, y - 8).lineWidth(0.5).strokeColor("#000").stroke();
  doc.font("Helvetica-Bold").fontSize(11)
     .text("Código", xCode, y)
     .text("Procedimiento", xName, y)
     .text("Diente", xTooth, y, { width: colW.tooth })
     .text("Cant.", xQty, y, { width: colW.qty, align: "right" })
     .text("P. unitario", xUnit, y, { width: colW.unit, align: "right" })
     .text("Subtotal", xSub, y, { width: colW.sub, align: "right" });
  y += 16;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
  y += 8;

  // Filas
  doc.font("Helvetica").fontSize(11);
  for (const it of inv.items) {
    doc.text(it.procedureCode, xCode, y, { width: colW.code });
    doc.text(it.procedure?.name || "—", xName, y, { width: wName });
    doc.text(it.tooth || "—", xTooth, y, { width: colW.tooth });
    doc.text(String(it.quantity), xQty, y, { width: colW.qty, align: "right" });
    doc.text(`$ ${money(it.unitPrice)}`, xUnit, y, { width: colW.unit, align: "right" });
    doc.text(`$ ${money(it.subtotal)}`, xSub, y, { width: colW.sub, align: "right" });
    y += 18;
  }

  // Total
  y += 8;
  doc.moveTo(infoX, y).lineTo(right, y).stroke();
  y += 10;
  doc.font("Helvetica-Bold").text("Total:", infoX, y);
  doc.font("Helvetica").text(`$ ${money(inv.total)}`, xSub, y, { width: colW.sub, align: "right" });

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${inv.folio || inv.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
