import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
export const runtime = "nodejs";

function fmt(n){ return new Intl.NumberFormat("es-CO").format(Number(n||0)); }

export async function GET(_req, { params }) {
  const id = params?.id;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: true,
      items: { include: { procedure: true } },
    },
  });
  if (!inv) return new Response("No encontrada", { status: 404 });

  const qrBuf = await QRCode.toBuffer(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/admin/invoices/${id}`, { width: 128 });

  const stream = new ReadableStream({
    start(controller) {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      doc.on("data", (chunk) => controller.enqueue(chunk));
      doc.on("end",  () => controller.close());

      // Encabezado
      doc.fontSize(14).text("SEMAD - Factura", { align: "left" });
      doc.moveDown(0.2);
      doc.fontSize(10).text(`Folio: ${inv.folio || "-"}`);
      doc.text(`Fecha: ${new Date(inv.date).toLocaleString()}`);
      doc.moveDown();
      doc.text(`Paciente: ${inv.patient?.fullName || "-"}`);
      doc.text(`Documento: ${inv.patient?.document || "-"}`);
      doc.moveDown();

      // Tabla simple
      doc.fontSize(11).text("Detalle", { underline: true });
      doc.moveDown(0.5);
      inv.items.forEach(it => {
        const name = it.procedure?.name || it.procedureCode;
        const line = `${name}  x${it.quantity}  -  $ ${fmt(it.unitPrice)}   =   $ ${fmt(it.subtotal)}`;
        doc.text(line);
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total: $ ${fmt(inv.total)}`, { align: "right" });

      // QR
      doc.moveDown(1);
      doc.image(qrBuf, doc.x, doc.y, { width: 100 });
      doc.text("Escanea para ver la factura", doc.x + 110, doc.y - 5);

      doc.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${inv.folio || id}.pdf"`,
    },
  });
}
