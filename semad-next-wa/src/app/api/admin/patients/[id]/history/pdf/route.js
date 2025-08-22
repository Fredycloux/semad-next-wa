// src/app/api/admin/patients/[id]/history/pdf/route.js
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIOLET = "#6d28d9";
const GRAY = "#6b7280";
const LIGHT = "#eef2ff";

function fmtDate(d) {
  try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; }
}
function ageFrom(birthDate) {
  if (!birthDate) return "—";
  const d = new Date(birthDate);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return `${a} años`;
}
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

// Odontograma – mapea superficies variadas a (top/right/bottom/left/center)
function normSurface(s = "") {
  s = String(s).toUpperCase();
  if (["O", "OCLUSAL", "CENTRO", "C", "CEN", "CENTER"].includes(s)) return "center";
  if (["M", "IZQ", "LEFT", "L"].includes(s)) return "left";
  if (["D", "DER", "RIGHT", "R"].includes(s)) return "right";
  if (["V", "B", "VESTIBULAR", "TOP", "T", "SUPERIOR"].includes(s)) return "top";
  if (["P", "L", "PALATINO", "LINGUAL", "INF", "BOTTOM"].includes(s)) return "bottom";
  return "center";
}

// Dibuja un diente (cuadro) con 5 zonas como en la UI
function drawTooth(doc, x, y, toothNumber, fillsBySurface = {}) {
  const S = 30;                // tamaño del diente
  const R = 6;                 // radio del contorno
  const PAD = 3;               // padding interno

  // contorno
  doc.lineWidth(1).strokeColor(VIOLET);
  doc.roundedRect(x, y, S, S, R).stroke();

  // zonas internas (5 rectangulitos)
  const iw = S - PAD * 2;
  const ih = S - PAD * 2;
  const cx = x + PAD;
  const cy = y + PAD;

  // top
  doc.roundedRect(cx, cy, iw, ih * 0.25, 3)
    .fillAndStroke(fillsBySurface.top ? fillsBySurface.top : "white", VIOLET);

  // bottom
  doc.roundedRect(cx, cy + ih * 0.75, iw, ih * 0.25, 3)
    .fillAndStroke(fillsBySurface.bottom ? fillsBySurface.bottom : "white", VIOLET);

  // left
  doc.roundedRect(cx, cy + ih * 0.25, iw * 0.25, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.left ? fillsBySurface.left : "white", VIOLET);

  // right
  doc.roundedRect(cx + iw * 0.75, cy + ih * 0.25, iw * 0.25, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.right ? fillsBySurface.right : "white", VIOLET);

  // center
  doc.roundedRect(cx + iw * 0.25, cy + ih * 0.25, iw * 0.5, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.center ? fillsBySurface.center : "white", VIOLET);

  // número
  doc.fillColor(GRAY).font("Helvetica").fontSize(8)
    .text(String(toothNumber), x, y + S + 4, { width: S, align: "center" });
}

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  // Trae TODO lo que mostramos en la pantalla de historia
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: {
        orderBy: { date: "desc" },
        include: { procedures: { include: { procedure: true } } },
      },
      appointments: { orderBy: { date: "desc" } },
    },
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // Procedimientos por diente (desde facturación)
  const invoices = await prisma.invoice.findMany({
    where: { patientId: id },
    include: { items: { include: { procedure: true } } },
    orderBy: { date: "desc" },
  });
  const procsByTooth = {};
  for (const inv of invoices) {
    for (const it of inv.items) {
      if (!it.tooth) continue;
      const t = String(it.tooth);
      if (!procsByTooth[t]) procsByTooth[t] = [];
      procsByTooth[t].push(it.procedure?.name || it.name || it.procedureCode);
    }
  }
  for (const t of Object.keys(procsByTooth)) procsByTooth[t] = uniq(procsByTooth[t]);

  // Odontograma del paciente -> { [tooth]: {surface->color} }
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurface(e.surface);
    if (!fillMap[t]) fillMap[t] = {};
    // si viene color guardado úsalo, si no usa violeta suave
    fillMap[t][s] = e.color || LIGHT;
  }

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Título
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica / Odontograma", { align: "left" });
  doc.moveDown(0.5);

  // Tarjeta con datos del paciente
  const cardY = doc.y;
  const cardH = 60;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Caja izquierda
  doc.lineWidth(1).strokeColor(VIOLET).fillColor("white");
  doc.roundedRect(doc.x, cardY, pageW * 0.62, cardH, 12).fillAndStroke("white", VIOLET);

  doc.fillColor("#000").fontSize(11).font("Helvetica-Bold")
     .text("Paciente:", doc.x + 12, cardY + 10);
  doc.font("Helvetica").text(patient.fullName || "—", doc.x + 90, cardY + 10);

  doc.font("Helvetica-Bold").text("Documento:", doc.x + 12, cardY + 27);
  doc.font("Helvetica").text(patient.document || "—", doc.x + 90, cardY + 27);

  doc.font("Helvetica-Bold").text("Teléfono:", doc.x + 12, cardY + 44);
  doc.font("Helvetica").text(patient.phone || "—", doc.x + 90, cardY + 44);

  // Caja derecha (fecha reporte)
  const rightX = doc.page.margins.left + pageW * 0.66;
  doc.roundedRect(rightX, cardY, pageW * 0.34, cardH, 12).fillAndStroke(LIGHT, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").text("Fecha de reporte", rightX + 12, cardY + 10);
  doc.fillColor("#000").font("Helvetica").text(fmtDate(new Date()), rightX + 12, cardY + 28);

  // Edad + Email dentro de la tarjeta izquierda
  doc.fillColor("#000").font("Helvetica-Bold").text("Edad:", doc.x + pageW * 0.62 - 150, cardY + 10);
  doc.font("Helvetica").text(ageFrom(patient.birthDate), doc.x + pageW * 0.62 - 100, cardY + 10, { width: 90, align: "left" });
  doc.font("Helvetica-Bold").text("Email:", doc.x + pageW * 0.62 - 150, cardY + 27);
  doc.font("Helvetica").text(patient.email || "—", doc.x + pageW * 0.62 - 100, cardY + 27, { width: 140, align: "left" });

  doc.moveDown();
  doc.moveTo(doc.page.margins.left, cardY + cardH + 18)
     .lineTo(doc.page.width - doc.page.margins.right, cardY + cardH + 18)
     .strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.y = cardY + cardH + 24;

  // Odontograma
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma");
  doc.moveDown(0.3);

  const topRow = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const botRow = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  const startX = doc.page.margins.left;
  let x = startX, y = doc.y + 8;
  const STEP = 42;

  // fila superior
  for (let i = 0; i < topRow.length; i++) {
    const t = String(topRow[i]);
    drawTooth(doc, x, y, t, fillMap[t]);
    x += STEP;
    if (i === 7) x += 18; // pequeño espacio entre cuadrantes
  }

  // fila inferior
  x = startX;
  y += 70;
  for (let i = 0; i < botRow.length; i++) {
    const t = String(botRow[i]);
    drawTooth(doc, x, y, t, fillMap[t]);
    x += STEP;
    if (i === 7) x += 18;
  }

  doc.moveDown(4);

  // Datos clínicos
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos");
  doc.moveDown(0.5);
  doc.font("Helvetica").fillColor("#000").fontSize(11);

  const dcX = doc.page.margins.left + 0;
  const dcY = doc.y;
  const line = (label, value, offY) => {
    doc.font("Helvetica-Bold").fillColor(GRAY).text(`${label}:`, dcX, dcY + offY, { width: 80 });
    doc.font("Helvetica").fillColor("#000").text(value || "—", dcX + 85, dcY + offY, { width: 260 });
  };
  line("EPS", patient.eps, 0);
  line("Alergias", patient.allergies, 18);
  line("Antecedentes", patient.medicalHistory, 36);

  // Última consulta (a la derecha)
  const last = patient.consultations?.[0];
  doc.font("Helvetica-Bold").fillColor(GRAY).text("Email:", rightX, dcY, { width: 80 });
  doc.font("Helvetica").fillColor("#000").text(patient.email || "—", rightX + 85, dcY, { width: pageW * 0.34 - 110 });

  doc.font("Helvetica-Bold").fillColor(GRAY).text("Última consulta", rightX, dcY + 18);
  doc.font("Helvetica").fillColor("#000").text(last ? fmtDate(last.date) : "—", rightX + 130, dcY + 18);

  doc.moveDown(3);

  // Procedimientos por diente (nombres)
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)");
  doc.moveDown(0.5);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  const teethSorted = Object.keys(procsByTooth).sort((a,b)=>Number(a)-Number(b));
  if (teethSorted.length === 0) {
    doc.text("—");
  } else {
    for (const t of teethSorted) {
      doc.text(`${t}: ${procsByTooth[t].join(", ")}`);
    }
  }

  doc.moveDown(1.5);

  // Citas (como en la pantalla)
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas");
  doc.moveDown(0.3);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  for (const a of patient.appointments || []) {
    const status = a.status ? ` · ${a.status}` : "";
    doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${status}`);
  }
  if (!patient.appointments || patient.appointments.length === 0) doc.text("—");

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.fullName || id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
