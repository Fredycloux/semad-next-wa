// src/app/api/admin/invoices/[id]/pdf/route.js
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { patient: true, items: { include: { procedure: true } } },
  });
  if (!inv) return new Response("Not found", { status: 404 });

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const stream = doc.pipe(new PassThroughStream());
  const buffers = [];

  stream.on("data", (c) => buffers.push(Buffer.from(c)));
  const done = new Promise((resolve) => stream.on("end", () => resolve()));

  // Encabezado
  doc.fontSize(16).text("SEMAD", { continued: true }).fontSize(10).text("   NIT 000.000.000-0");
  doc.moveDown(0.2).fontSize(10).text("Calle 0 # 0-00 · Ciudad · Tel: 000 000 0000");
  doc.moveDown();

  doc.fontSize(12).text(`Factura: ${inv.folio}`);
  doc.text(`Fecha: ${new Date(inv.date).toLocaleString()}`);
  doc.moveDown();

  // QR
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/invoices/${inv.id}`;
  const qrData = await QRCode.toDataURL(JSON.stringify({ folio: inv.folio, total: inv.total, url }), { margin: 1 });
  const qr = Buffer.from(qrData.split(",")[1], "base64");
  doc.image(qr, 450, 40, { width: 100 });

  // Paciente
  doc.moveDown().fontSize(10).text("Paciente:", { underline: true });
  doc.text(`${inv.patient.fullName}`);
  doc.text(`${inv.patient.document || "—"} · ${inv.patient.phone || "—"}`);
  doc.moveDown();

  // Items
  doc.fontSize(10);
  doc.text("Código", 40, doc.y, { continued: true, width: 70 });
  doc.text("Descripción", 110, doc.y, { continued: true, width: 260 });
  doc.text("Cant.", 370, doc.y, { continued: true, width: 40, align: "right" });
  doc.text("Unitario", 410, doc.y, { continued: true, width: 80, align: "right" });
  doc.text("Subtotal", 490, doc.y, { width: 80, align: "right" });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

  inv.items.forEach((it) => {
    doc.text(it.procedureCode, 40, doc.y + 4, { continued: true, width: 70 });
    doc.text(`${it.procedure?.name || "—"}${it.tooth ? ` · Pieza ${it.tooth}` : ""}`, 110, doc.y, { continued: true, width: 260 });
    doc.text(String(it.quantity), 370, doc.y, { continued: true, width: 40, align: "right" });
    doc.text(money(it.unitPrice), 410, doc.y, { continued: true, width: 80, align: "right" });
    doc.text(money(it.subtotal), 490, doc.y, { width: 80, align: "right" });
    doc.moveDown(0.2);
  });

  doc.moveDown();
  doc.moveTo(370, doc.y).lineTo(550, doc.y).stroke();
  doc.fontSize(11).text("Total:", 410, doc.y + 6, { continued: true, width: 80, align: "right" });
  doc.fontSize(11).text(money(inv.total), 490, doc.y + 6, { width: 80, align: "right" });

  doc.end();
  await done;

  const pdf = Buffer.concat(buffers);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.folio}.pdf"`,
    },
  });
}

// Pequeño helper para convertir stream en buffer en route handlers
class PassThroughStream {
  constructor() {
    this.chunks = [];
    this.controllers = [];
  }
  write(chunk) { this.chunks.push(chunk); }
  end() {
    for (const c of this.controllers) c.enqueue(new Uint8Array(Buffer.concat(this.chunks)));
    for (const c of this.controllers) c.close();
  }
  [Symbol.asyncIterator]() {
    const self = this;
    return {
      start(controller) { self.controllers.push(controller); },
      pull() {},
      cancel() {},
    };
  }
  pipe(dest) { return dest; }
}
