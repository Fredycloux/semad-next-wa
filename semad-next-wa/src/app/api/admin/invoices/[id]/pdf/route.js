import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export const runtime = "nodejs";

function money(v) {
  return new Intl.NumberFormat("es-CO").format(Number(v || 0));
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return new Response("id requerido", { status: 400 });

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: true,
      items: { include: { procedure: true } },
    },
  });
  if (!inv) return new Response("No existe", { status: 404 });

  // QR buffer (mismo payload que el endpoint de QR)
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const url = `${base}/admin/invoices/${inv.id}`;
  const qrBuf = await QRCode.toBuffer(
    JSON.stringify({ folio: inv.folio, total: inv.total, url }),
    { type: "png", width: 180, margin: 1 }
  );

  // Genera el PDF en memoria
  const pdfBuf = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Encabezado
    doc.fontSize(18).text("S E M A D", { continued: true }).fontSize(10).text("   Sistema de Historias Clínicas");
    doc.moveDown(0.5);
    doc.fontSize(14).text(`Factura ${inv.folio || inv.id}`);
    doc.fontSize(10).text(`Fecha: ${new Date(inv.date).toLocaleString()}`);

    // QR
    doc.image(qrBuf, doc.page.width - 40 - 120, 40, { width: 120 });

    doc.moveDown();
    doc.moveDown(0.5);
    doc.fontSize(12).text("Paciente", { underline: true });
    doc.fontSize(10)
      .text(inv.patient?.fullName || "—")
      .text(`Documento: ${inv.patient?.document || "—"}`)
      .text(`Teléfono: ${inv.patient?.phone || "—"}`);

    doc.moveDown();
    doc.fontSize(12).text("Detalle", { underline: true });
    doc.moveDown(0.3);
    // Tabla simple
    doc.fontSize(10);
    const headers = ["Código", "Procedimiento", "Diente", "Cant.", "P. unit.", "Subtotal"];
    const widths = [60, 220, 50, 50, 80, 80];
    const x0 = 40;
    let y = doc.y;

    function row(arr, bold = false) {
      let x = x0;
      arr.forEach((t, i) => {
        if (bold) doc.font("Helvetica-Bold");
        else doc.font("Helvetica");
        doc.text(String(t), x, y, { width: widths[i] });
        x += widths[i];
      });
      y += 18;
    }

    row(headers, true);
    doc.moveTo(x0, y - 2).lineTo(x0 + widths.reduce((a, b) => a + b, 0), y - 2).stroke();

    inv.items.forEach((it) => {
      row([
        it.procedureCode,
        it.procedure?.name || "",
        it.tooth || "",
        it.quantity,
        `$ ${money(it.unitPrice)}`,
        `$ ${money(it.subtotal)}`,
      ]);
    });

    doc.moveDown();
    doc.moveTo(x0, y + 6).lineTo(x0 + widths.reduce((a, b) => a + b, 0), y + 6).stroke();
    doc.font("Helvetica-Bold").text(`Total: $ ${money(inv.total)}`, x0 + 380, y + 12);

    doc.end();
  });

  return new Response(pdfBuf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Factura-${inv.folio || inv.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
