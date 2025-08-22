import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------- helpers / estilos --------------------------- */
const VIOLET = "#6d28d9";
const LIGHT_BG = "#eef2ff";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";

const fmtDate = (d) => {
  try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; }
};

const ageFrom = (birth) => {
  const b = birth ? new Date(birth) : null;
  if (!b || Number.isNaN(+b)) return "—";
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return `${a} años`;
};

// normaliza superficies a las claves de tu UI
const normSurf = (s = "") => {
  s = String(s).toUpperCase();
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B";
  if (["L","P","PALATINO","LINGUAL","BOT","BOTTOM"].includes(s)) return "L";
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";
  return "O";
};

// diente estilo UI (B/L/M/D/O) + número FDI debajo
function drawToothBox(doc, x, y, tooth, fills = {}, { W = 22, H = 18 } = {}) { // ajustado tamaño a 22x18
  const R = 4;
  doc.save().roundedRect(x, y, W, H, R).lineWidth(1).strokeColor(SLATE_200).stroke();

  const pad = 2;
  const cx = x + W / 2;
  const cy = y + H / 2;
  const w = W - pad * 2;
  const h = H - pad * 2;
  const sw = w * 0.34;
  const sh = h * 0.34;

  // helper
  const paint = (fx, fy, fw, fh, key) => {
    // **IMPORTANTE**: usamos SOLO el color guardado para que coincida con la UI
    const color = fills[key] || null;
    const stroke = color || SLATE_300;
    doc.save();
    doc.strokeColor(stroke).fillColor(color || "#fff").fillOpacity(color ? 0.18 : 1.0);
    doc.roundedRect(fx, fy, fw, fh, key === "O" ? 3 : 2).fillAndStroke(); // ajustado radio a 3
    doc.restore();
  };

  // B (arriba)
  paint(x + pad, y + pad, w, sh, "B");
  // L (abajo)
  paint(x + pad, y + H - pad - sh, w, sh, "L");
  // M (izquierda)
  paint(x + pad, cy - sh / 2, sw, sh, "M");
  // D (derecha)
  paint(x + W - pad - sw, cy - sh / 2, sw, sh, "D");
  // O (centro)
  paint(cx - sw / 2, cy - sh / 2, sw, sh, "O");

  // número FDI debajo
  doc.fillColor("#6b7280").font("Helvetica").fontSize(7) // ajustado tamaño a 7
     .text(String(tooth), x, y + H + 2, { width: W, align: "center" });
  doc.restore();
}

/* --------------------------------- GET ---------------------------------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return new Response("ID inválido", { status: 400 });

    // datos principales
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        odontogram: true,
        consultations: { orderBy: { date: "desc" }, take: 1 },
        appointments: { orderBy: { date: "desc" }, take: 5 },
      }
    });
    if (!patient) return new Response("Paciente no encontrado", { status: 404 });

    // nombres de procedimientos por diente (desde facturas)
    const invoices = await prisma.invoice.findMany({
      where: { patientId: id },
      include: { items: { include: { procedure: true } } },
    });
    const procByTooth = invoices.reduce((acc, inv) => {
      inv.items.forEach(({ tooth, procedure }) => {
        if (!acc[tooth]) acc[tooth] = new Set();
        acc[tooth].add(procedure.name);
      });
      return acc;
    }, {});

    // generar PDF
    const stream = new PassThrough();
    const doc = new PDFDocument({ size: "LETTER", margin: 30 });
    doc.pipe(stream);

    // encabezado
    const cardW = 180;
    const card2W = 160;
    const stepX = 30;
    const stepY = 25;

    doc.save().fillColor(VIOLET).font("Helvetica-Bold").fontSize(18)
      .text("Historia Clínica", 0, 20, { align: "center", width: 612 });

    // tarjeta del paciente
    doc.save().translate(30, 50)
      .rect(0, 0, cardW, 70).fillColor(LIGHT_BG).fill()
      .fillColor("#000").font("Helvetica-Bold").fontSize(12)
      .text(patient.fullName, 10, 10)
      .font("Helvetica").fontSize(10)
      .text(`Documento: ${patient.document}`, 10, 25)
      .text(`Teléfono: ${patient.phone || "—"}`, 10, 40)
      .text(`Email: ${patient.email || "—"}`, 10, 55)
      .restore();

    // datos clínicos
    const colW = 150;
    const col2X = colW + 30;
    const row1Y = 140;
    const row2Y = row1Y + 25;

    doc.save().translate(30, row1Y)
      .fillColor("#000").font("Helvetica-Bold").fontSize(12)
      .text("Datos Clínicos", 0, 0)
      .font("Helvetica").fontSize(10)
      .text("Edad:", 0, 15)
      .text("Fecha Registro:", 0, 30)
      .text("Última Consulta:", col2X, 15)
      .text("Próxima Cita:", col2X, 30)
      .fillColor("#6b7280")
      .text(ageFrom(patient.birthDate), colW, 15)
      .text(fmtDate(patient.createdAt), colW, 30)
      .text(fmtDate(patient.consultations[0]?.date), col2X, 15)
      .text(fmtDate(patient.appointments[0]?.date), col2X, 30)
      .restore();

    // odontograma
    const odontoY = row2Y + 30;
    const odontoW = 400;
    const odontoH = 300;

    doc.save().translate(30, odontoY)
      .rect(0, 0, odontoW, odontoH).fillColor(LIGHT_BG).fill()
      .fillColor(VIOLET).font("Helvetica-Bold").fontSize(12)
      .text("Odontograma", odontoW / 2, 10, { align: "center" });

    let x = 30, y = 40;
    for (const tooth of patient.odontogram) {
      drawToothBox(doc, x, y, tooth.number, tooth.fills);
      x += stepX;
      if (x + 22 > odontoW) {
        x = 30;
        y += stepY;
      }
    }
    doc.restore();

    // procedimientos por diente
    const procY = odontoY + odontoH + 30;
    const procW = 400;

    doc.save().translate(30, procY)
      .fillColor(VIOLET).font("Helvetica-Bold").fontSize(12)
      .text("Procedimientos por Diente", procW / 2, 0, { align: "center" })
      .fillColor("#000").font("Helvetica").fontSize(10)
      .text("Diente", 0, 20, { width: 50, align: "left" })
      .text("Procedimientos", 50, 20, { width: procW - 50, align: "left" })
      .rect(0, 30, procW, 1).fillColor(SLATE_200).fill();

    let cy = 40;
    for (const tooth of patient.odontogram) {
      const procs = procByTooth[tooth.number]?.size
        ? Array.from(procByTooth[tooth.number]).join(", ")
        : "—";
      doc.text(String(tooth.number), 0, cy, { width: 50, align: "left" })
         .text(procs, 50, cy, { width: procW - 50, align: "left" });
      cy += 20;
    }
    doc.restore();

    // citas
    const apptY = procY + 120;
    const apptW = 400;

    doc.save().translate(30, apptY)
      .fillColor(VIOLET).font("Helvetica-Bold").fontSize(12)
      .text("Próximas Citas", apptW / 2, 0, { align: "center" })
      .fillColor("#000").font("Helvetica").fontSize(10)
      .text("Fecha", 0, 20, { width: 100, align: "left" })
      .text("Motivo", 100, 20, { width: apptW - 100, align: "left" })
      .rect(0, 30, apptW, 1).fillColor(SLATE_200).fill();

    let ay = 40;
    for (const appt of patient.appointments) {
      doc.text(fmtDate(appt.date), 0, ay, { width: 100, align: "left" })
         .text(appt.reason, 100, ay, { width: apptW - 100, align: "left" });
      ay += 20;
    }
    doc.restore();

    doc.end();
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Error generando PDF", { status: 500 });
  }
}
