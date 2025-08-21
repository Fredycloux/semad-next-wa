// src/app/api/admin/invoices/[id]/pdf/route.js
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req, { params }) {
  try {
    const id = params?.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { fullName: true, document: true, phone: true } },
        items: { include: { procedure: true } }, // para nombre del procedimiento
      },
    });
    if (!invoice) return new Response("Factura no encontrada", { status: 404 });

    const origin = new URL(req.url).origin;
    const qrBuf = await QRCode.toBuffer(`${origin}/admin/invoices/${invoice.id}`, {
      width: 140,
      margin: 0,
    });

    // Crear PDF (Node stream)
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // Encabezado
    doc.fontSize(20).text("SEMAD", 50, 40);
    doc.fontSize(12).text(`Factura ${invoice.folio || ""}`, { align: "right" });
    doc.moveDown(0.5);
    doc.text(new Date(invoice.date).toLocaleString(), { align: "right" });

    // Datos paciente
    doc.moveDown();
    doc.fontSize(10).text(`Paciente: ${invoice.patient?.fullName || "—"}`);
    doc.text(
      `Doc: ${invoice.patient?.document || "—"}  ${invoice.patient?.phone ? `· ${invoice.patient.phone}` : ""}`
    );

    // QR
    doc.image(qrBuf, doc.page.width - 50 - 140, 80, { width: 140 });

    // Tabla
    doc.moveDown(2);
    const y0 = doc.y;
    doc.fontSize(11).text("Código", 50, y0);
    doc.text("Procedimiento", 120, y0);
    doc.text("Diente", 360, y0);
    doc.text("Cant.", 410, y0, { width: 40, align: "right" });
    doc.text("P. unitario", 460, y0, { width: 80, align: "right" });
    doc.text("Subtotal", 540, y0, { width: 80, align: "right" });
    doc.moveTo(50, doc.y + 4).lineTo(560, doc.y + 4).stroke();

    const fmt = (n) =>
      new Intl.NumberFormat("es-CO").format(Number(n || 0));

    invoice.items.forEach((it) => {
      doc.moveDown(0.6);
      doc.fontSize(10).text(it.procedureCode, 50);
      doc.text(it.procedure?.name || "", 120, undefined, { width: 220 });
      doc.text(it.tooth || "", 360);
      doc.text(String(it.quantity || 0), 410, undefined, { width: 40, align: "right" });
      doc.text(`$ ${fmt(it.unitPrice)}`, 460, undefined, { width: 80, align: "right" });
      doc.text(`$ ${fmt(it.subtotal)}`, 540, undefined, { width: 80, align: "right" });
    });

    // Total
    doc.moveDown(1.2);
    doc.moveTo(400, doc.y).lineTo(560, doc.y).stroke();
    doc.fontSize(12).text("Total:", 460, doc.y + 6, { width: 80, align: "right" });
    doc.fontSize(12).text(`$ ${fmt(invoice.total)}`, 540, doc.y, { width: 80, align: "right" });

    doc.end();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Factura-${invoice.folio || id}.pdf"`,
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return new Response("PDF error: " + String(e?.message || e), { status: 500 });
  }
}
