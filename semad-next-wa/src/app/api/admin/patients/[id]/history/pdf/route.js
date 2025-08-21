import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// utilidades
const violet = "#6D28D9";
const grayText = "#4B5563";
const fmtDate = (d) =>
  new Date(d).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
const age = (dob) => {
  if (!dob) return "—";
  const a = new Date(Date.now() - new Date(dob).getTime());
  return Math.abs(a.getUTCFullYear() - 1970) + " años";
};

// Dibuja el esquema básico del odontograma y resalta dientes con registros
function drawOdontogram(doc, x, y, cell, highlighted = new Set()) {
  const row = (arr, rowY) => {
    arr.forEach((n, i) => {
      const cx = x + i * (cell + 6);
      doc
        .roundedRect(cx, rowY, cell, cell, 6)
        .lineWidth(1)
        .strokeColor(violet)
        .fillOpacity(highlighted.has(String(n)) ? 0.12 : 0)
        .fillAndStroke();

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(grayText)
        .text(String(n), cx, rowY + cell + 2, { width: cell, align: "center" });
    });
  };

  // Orden clásico FDI (arriba: 18→11 y 21→28; abajo: 48→41 y 31→38)
  const topA = [18,17,16,15,14,13,12,11];
  const topB = [21,22,23,24,25,26,27,28];
  const botA = [48,47,46,45,44,43,42,41];
  const botB = [31,32,33,34,35,36,37,38];

  row(topA, y);
  row(topB, y + cell + 20);
  row(botA, y + (cell + 20) * 2);
  row(botB, y + (cell + 20) * 3);
}

// Compacta items de facturas a “procedimientos por diente”
function buildProceduresByTooth(invoices) {
  const map = new Map(); // tooth -> Set(names)
  for (const inv of invoices) {
    for (const it of inv.items) {
      const t = it.tooth || "";
      if (!t) continue;
      const name = it.procedure?.name || it.procedureCode || "Procedimiento";
      if (!map.has(t)) map.set(t, new Set());
      map.get(t).add(name);
    }
  }
  // a objeto plano con arrays ordenados
  const res = {};
  [...map.keys()].sort().forEach((k) => (res[k] = [...map.get(k)].sort()));
  return res;
}

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  // Trae al paciente + odontograma + últimas consultas + sus facturas (con items)
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: {
        orderBy: { date: "desc" },
        take: 3,
        include: { procedures: { include: { procedure: true } } },
      },
    },
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  const invoices = await prisma.invoice.findMany({
    where: { patientId: id },
    include: { items: { include: { procedure: true } } },
    orderBy: { date: "desc" },
  });

  const procsByTooth = buildProceduresByTooth(invoices);

  // Dientes “resaltados” (con algo registrado en facturas u odontograma)
  const highlighted = new Set([
    ...Object.keys(procsByTooth),
    ...(patient.odontogram || []).map((o) => String(o.tooth)),
  ]);

  // prepara PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  // Encabezado
  doc
    .fontSize(18)
    .fillColor(violet)
    .font("Helvetica-Bold")
    .text("Reporte de Historia Clínica / Odontograma", left, 40, { width: right - left });

  // Datos del paciente (tarjeta)
  let y = 80;
  doc
    .roundedRect(left, y, 350, 84, 10)
    .fillOpacity(0.08)
    .fillAndStroke(violet, violet);
  doc.fillOpacity(1);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Paciente:", left + 12, y + 10);
  doc
    .font("Helvetica")
    .fillColor(grayText)
    .text(patient.fullName || "—", left + 85, y + 10);

  doc.font("Helvetica-Bold").fillColor("#111827").text("Documento:", left + 12, y + 10 + 18);
  doc.font("Helvetica").fillColor(grayText).text(patient.document || "—", left + 85, y + 10 + 18);

  doc.font("Helvetica-Bold").fillColor("#111827").text("Teléfono:", left + 12, y + 10 + 36);
  doc.font("Helvetica").fillColor(grayText).text(patient.phone || "—", left + 85, y + 10 + 36);

  doc.font("Helvetica-Bold").fillColor("#111827").text("Edad:", left + 200, y + 10 + 36);
  doc.font("Helvetica").fillColor(grayText).text(age(patient.birthdate), left + 240, y + 10 + 36);

  // Cuadro “Fecha de reporte”
  doc
    .roundedRect(right - 180, y, 180, 60, 10)
    .fillOpacity(0.06)
    .fill(violet);
  doc.fillOpacity(1);
  doc
    .font("Helvetica-Bold")
    .fillColor(violet)
    .text("Fecha de reporte", right - 168, y + 8);
  doc.font("Helvetica").fillColor("#111827").text(fmtDate(new Date()), right - 168, y + 26);

  // Odontograma
  y += 110;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(violet).text("Odontograma", left, y);
  y += 10;
  drawOdontogram(doc, left, y + 10, 30, highlighted);

  // Leyenda
  doc
    .moveTo(left, y + 160)
    .lineTo(right, y + 160)
    .lineWidth(0.5)
    .strokeColor("#D1D5DB")
    .stroke();
  doc.font("Helvetica").fontSize(10).fillColor(grayText).text(
    "Cuadros resaltados indican dientes con procedimientos/entradas registradas.",
    left,
    y + 168
  );

  // Procedimientos por diente
  let colY = y + 188;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(violet)
    .text("Procedimientos por diente", left, colY);
  colY += 14;

  if (Object.keys(procsByTooth).length === 0) {
    doc.font("Helvetica").fillColor(grayText).text("— Sin procedimientos registrados —", left, colY);
    colY += 14;
  } else {
    doc.font("Helvetica").fillColor("#111827").fontSize(10);
    const cols = 2;
    const colW = Math.floor((right - left) / cols) - 12;
    const pairs = Object.entries(procsByTooth);
    for (let i = 0; i < pairs.length; i++) {
      const [tooth, arr] = pairs[i];
      const cx = left + (i % cols) * (colW + 12);
      const cy = colY + Math.floor(i / cols) * 34;
      doc
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`${tooth}:`, cx, cy);
      doc
        .font("Helvetica")
        .fillColor(grayText)
        .text(arr.join(", "), cx + 26, cy, { width: colW - 26 });
    }
    colY += Math.ceil(pairs.length / cols) * 34;
  }

  // Resumen de consultas recientes
  colY += 10;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(violet).text("Consultas recientes", left, colY);
  colY += 12;

  if (patient.consultations.length === 0) {
    doc.font("Helvetica").fillColor(grayText).text("— Sin consultas —", left, colY);
  } else {
    for (const c of patient.consultations) {
      doc
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`• ${fmtDate(c.date)}`, left, colY);
      colY += 12;
      if (c.diagnosis) {
        doc.font("Helvetica").fillColor(grayText).text(`Diag.: ${c.diagnosis}`, left + 12, colY);
        colY += 12;
      }
      if (c.anamnesis) {
        doc.font("Helvetica").fillColor(grayText).text(`Anam.: ${c.anamnesis}`, left + 12, colY, {
          width: right - left - 24,
        });
        colY += 12;
      }
      if (c.prescription) {
        doc.font("Helvetica").fillColor(grayText).text(`Fórmula: ${c.prescription}`, left + 12, colY, {
          width: right - left - 24,
        });
        colY += 12;
      }
      colY += 4;
    }
  }

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.fullName || id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
