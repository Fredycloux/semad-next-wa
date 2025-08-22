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

// Mapea superficies -> top/right/bottom/left/center
function normSurface(s = "") {
  s = String(s).toUpperCase();
  if (["O", "OCLUSAL", "CENTRO", "C", "CENTER"].includes(s)) return "center";
  if (["M", "IZQ", "LEFT", "L"].includes(s)) return "left";
  if (["D", "DER", "RIGHT", "R"].includes(s)) return "right";
  if (["V", "B", "VESTIBULAR", "TOP", "T", "SUPERIOR"].includes(s)) return "top";
  if (["P", "L", "PALATINO", "LINGUAL", "INF", "BOTTOM"].includes(s)) return "bottom";
  return "center";
}

// Dibuja diente 5 superficies
function drawTooth(doc, x, y, toothNumber, fillsBySurface = {}) {
  const S = 30, R = 6, PAD = 3;
  doc.lineWidth(1).strokeColor(VIOLET);
  doc.roundedRect(x, y, S, S, R).stroke();

  const iw = S - PAD * 2, ih = S - PAD * 2;
  const cx = x + PAD, cy = y + PAD;

  doc.roundedRect(cx, cy, iw, ih * 0.25, 3)
    .fillAndStroke(fillsBySurface.top || "white", VIOLET);
  doc.roundedRect(cx, cy + ih * 0.75, iw, ih * 0.25, 3)
    .fillAndStroke(fillsBySurface.bottom || "white", VIOLET);
  doc.roundedRect(cx, cy + ih * 0.25, iw * 0.25, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.left || "white", VIOLET);
  doc.roundedRect(cx + iw * 0.75, cy + ih * 0.25, iw * 0.25, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.right || "white", VIOLET);
  doc.roundedRect(cx + iw * 0.25, cy + ih * 0.25, iw * 0.5, ih * 0.5, 3)
    .fillAndStroke(fillsBySurface.center || "white", VIOLET);

  doc.fillColor(GRAY).font("Helvetica").fontSize(8)
    .text(String(toothNumber), x, y + S + 4, { width: S, align: "center" });
}

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

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

  // Odontograma guardado
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurface(e.surface);
    if (!fillMap[t]) fillMap[t] = {};
    fillMap[t][s] = e.color || LIGHT;
  }

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Geometría base (evitar doc.x)
  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;
  const GAP = 16;

  // Título
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica / Odontograma", L, doc.y, { width: W });
  doc.moveDown(0.5);

  // Tarjetas encabezado (coordenadas absolutas)
  const cardY = doc.y + 6;
  const leftW = Math.round(W * 0.58);
  const rightW = W - leftW - GAP;
  const rightX = L + leftW + GAP;
  const cardH = 66;

  // Caja izquierda
  doc.lineWidth(1).strokeColor(VIOLET).fillColor("white");
  doc.roundedRect(L, cardY, leftW, cardH, 12).fillAndStroke("white", VIOLET);

  // Texto caja izquierda (usar posiciones absolutas)
  doc.fillColor("#000").fontSize(11).font("Helvetica-Bold");
  doc.text("Paciente:", L + 12, cardY + 10);
  doc.font("Helvetica").text(patient.fullName || "—", L + 90, cardY + 10, { width: leftW - 100 });

  doc.font("Helvetica-Bold").text("Documento:", L + 12, cardY + 27);
  doc.font("Helvetica").text(patient.document || "—", L + 90, cardY + 27);

  doc.font("Helvetica-Bold").text("Teléfono:", L + 12, cardY + 44);
  doc.font("Helvetica").text(patient.phone || "—", L + 90, cardY + 44);

  // Caja derecha
  doc.roundedRect(rightX, cardY, rightW, cardH, 12).fillAndStroke(LIGHT, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").text("Fecha de reporte", rightX + 12, cardY + 10);
  doc.fillColor("#000").font("Helvetica").text(fmtDate(new Date()), rightX + 12, cardY + 27, { width: rightW - 24 });

  // Edad dentro de la caja derecha (arriba a la derecha)
  doc.fillColor("#000").font("Helvetica-Bold")
    .text("Edad:", rightX + rightW - 120, cardY + 10, { width: 40, align: "right" });
  doc.font("Helvetica")
    .text(ageFrom(patient.birthDate), rightX + rightW - 76, cardY + 10, { width: 64, align: "left" });

  // Línea separadora
  const afterHeaderY = cardY + cardH + 20;
  doc.moveTo(L, afterHeaderY).lineTo(R, afterHeaderY)
     .strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.y = afterHeaderY + 8;

  // Odontograma
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", L, doc.y);
  doc.moveDown(0.3);

  const topRow = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const botRow = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  let x = L, y = doc.y + 8;
  const STEP = 42;

  for (let i = 0; i < topRow.length; i++) {
    const t = String(topRow[i]);
    drawTooth(doc, x, y, t, fillMap[t]);
    x += STEP;
    if (i === 7) x += 18;
  }

  x = L; y += 70;
  for (let i = 0; i < botRow.length; i++) {
    const t = String(botRow[i]);
    drawTooth(doc, x, y, t, fillMap[t]);
    x += STEP;
    if (i === 7) x += 18;
  }

  doc.y = y + 60;

  // Datos clínicos: dos columnas firmes
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Datos clínicos", L, doc.y);
  doc.moveDown(0.5);

  const colY = doc.y;
  const colW = Math.floor(W / 2) - GAP / 2;
  const rightColX = L + colW + GAP;

  const label = (lab, x0, y0) => doc.font("Helvetica-Bold").fillColor(GRAY).text(`${lab}:`, x0, y0);
  const value = (val, x0, y0, w = colW - 90) =>
    doc.font("Helvetica").fillColor("#000").text(val || "—", x0, y0, { width: w });

  // izquierda
  label("EPS", L, colY);
  value(patient.eps, L + 90, colY);

  label("Alergias", L, colY + 18);
  value(patient.allergies, L + 90, colY + 18);

  label("Antecedentes", L, colY + 36);
  value(patient.medicalHistory, L + 90, colY + 36);

  // derecha
  label("Email", rightColX, colY);
  value(patient.email, rightColX + 90, colY, rightW - 110);

  const last = patient.consultations?.[0];
  label("Última consulta", rightColX, colY + 18);
  value(last ? fmtDate(last.date) : "—", rightColX + 130, colY + 18, rightW - 150);

  doc.y = colY + 64;
  doc.moveDown(0.6);

  // Procedimientos por diente
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)", L, doc.y);
  doc.moveDown(0.5);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  const teethSorted = Object.keys(procsByTooth).sort((a,b)=>Number(a)-Number(b));
  if (teethSorted.length === 0) {
    doc.text("—", L, doc.y);
  } else {
    for (const t of teethSorted) {
      doc.text(`${t}: ${procsByTooth[t].join(", ")}`, L, doc.y, { width: W });
    }
  }

  doc.moveDown(1.2);

  // Citas
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", L, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  for (const a of patient.appointments || []) {
    const status = a.status ? ` · ${a.status}` : "";
    doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${status}`, L, doc.y, { width: W });
  }
  if (!patient.appointments || patient.appointments.length === 0) doc.text("—", L, doc.y);

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.fullName || id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
