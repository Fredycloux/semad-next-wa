// src/app/api/admin/patients/[id]/history/pdf/route.js
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Colores UI (tailwind-ish)
const VIOLET = "#6d28d9";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";
const GRAY = "#6b7280";
const LIGHT_BG = "#eef2ff";

const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const CHILD_TOP    = ["55","54","53","52","51","61","62","63","64","65"];
const CHILD_BOTTOM = ["85","84","83","82","81","71","72","73","74","75"];

const fmtDate = d => {
  try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; }
};
const ageFrom = birth => {
  if (!birth) return "—";
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return `${a} años`;
};
const uniq = a => [...new Set(a.filter(Boolean))];

// Normaliza superficies a tus claves B/L/M/D/O
const normSurf = (s = "") => {
  s = String(s).toUpperCase();
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B";      // arriba
  if (["L","P","PALATINO","LINGUAL","BOTTOM","BOT"].includes(s)) return "L"; // abajo
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";           // izq
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";          // der
  return "O";
};

// Dibuja un diente igual a <ToothSVG/>
function drawTooth(doc, x, y, tooth, fills = {}) {
  const size = 52;           // igual al svg
  const pad  = 2;
  const w = size, h = size;
  const centerSize = w * 0.36;
  const side = (w - centerSize - pad * 2) / 2;
  const cx = (w - centerSize) / 2;
  const cy = (h - centerSize) / 2;

  // Marco exterior
  doc.lineWidth(1).strokeColor(SLATE_200).roundedRect(x+0.5, y+0.5, w-1, h-1, 8).stroke();

  // Helper para pintar una zona con fillOpacity y borde del color
  const paint = (fx, fy, fw, fh, key) => {
    const color = fills[key]?.stroke || fills[key] || null;
    const stroke = color || SLATE_300;
    const fill = color || "#ffffff";
    doc.save();
    doc.strokeColor(stroke).fillColor(fill).fillOpacity(color ? 0.18 : 1.0);
    doc.roundedRect(fx, fy, fw, fh, key === "O" ? 6 : 2).fillAndStroke();
    doc.restore();
  };

  // B (arriba)
  paint(x+pad, y+pad, w-pad*2, side, "B");
  // L (abajo)
  paint(x+pad, y+h-pad-side, w-pad*2, side, "L");
  // M (izquierda)
  paint(x+pad, y+cy, side, centerSize, "M");
  // D (derecha)
  paint(x+w-pad-side, y+cy, side, centerSize, "D");
  // O (centro)
  paint(x+cx, y+cy, centerSize, centerSize, "O");

  // Número en esquina inferior derecha
  doc.font("Helvetica").fontSize(9).fillColor("#9CA3AF")
    .text(String(tooth), x, y + h - 10, { width: w - 6, align: "right" });
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

  // Procedimientos por diente (desde facturas) -> nombres
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

  // Odontograma guardado: construir mapa {tooth: {B|L|M|D|O: color}}
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurf(e.surface);
    if (!fillMap[t]) fillMap[t] = {};
    // guardamos el color como { stroke: '#hex' } para usar mismo stroke y fillOpacity
    fillMap[t][s] = { stroke: e.color || VIOLET };
  }

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Geometría base
  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;
  const GAP = 16;

  // Título
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica / Odontograma", L, doc.y, { width: W });
  doc.moveDown(0.5);

  // Tarjetas fijas
  const hdrY = doc.y + 6;
  const leftW = Math.round(W * 0.58);
  const rightW = W - leftW - GAP;
  const rightX = L + leftW + GAP;
  const cardH = 66;

  // Izquierda
  doc.lineWidth(1).strokeColor(VIOLET).fillColor("white");
  doc.roundedRect(L, hdrY, leftW, cardH, 12).fillAndStroke("white", VIOLET);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(11);
  doc.text("Paciente:", L + 12, hdrY + 10);
  doc.font("Helvetica").text(patient.fullName || "—", L + 90, hdrY + 10, { width: leftW - 100 });

  doc.font("Helvetica-Bold").text("Documento:", L + 12, hdrY + 27);
  doc.font("Helvetica").text(patient.document || "—", L + 90, hdrY + 27);

  doc.font("Helvetica-Bold").text("Teléfono:", L + 12, hdrY + 44);
  doc.font("Helvetica").text(patient.phone || "—", L + 90, hdrY + 44);

  // Derecha (fecha + edad)
  doc.roundedRect(rightX, hdrY, rightW, cardH, 12).fillAndStroke(LIGHT_BG, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").text("Fecha de reporte", rightX + 12, hdrY + 10);
  doc.fillColor("#000").font("Helvetica").text(fmtDate(new Date()), rightX + 12, hdrY + 27, { width: rightW - 24 });

  doc.fillColor("#000").font("Helvetica-Bold")
    .text("Edad:", rightX + rightW - 120, hdrY + 10, { width: 40, align: "right" });
  doc.font("Helvetica")
    .text(ageFrom(patient.birthDate), rightX + rightW - 76, hdrY + 10, { width: 64, align: "left" });

  // Separador
  const afterHdr = hdrY + cardH + 20;
  doc.moveTo(L, afterHdr).lineTo(R, afterHdr).strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.y = afterHdr + 8;

  // Odontograma
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", L, doc.y);
  doc.moveDown(0.3);

  // Filas según dentición (niño centrado)
  const dent = patient.dentition === "CHILD" ? "CHILD" : "ADULT";
  const pad16 = arr => {
    const total = 16, n = arr.length, left = Math.floor((total - n) / 2);
    return Array.from({ length: left }, () => null)
      .concat(arr)
      .concat(Array.from({ length: total - left - n }, () => null));
  };
  const topRow = dent === "ADULT" ? ADULT_TOP : pad16(CHILD_TOP);
  const botRow = dent === "ADULT" ? ADULT_BOTTOM : pad16(CHILD_BOTTOM);

  // Grid 16 columnas con hueco central
  let x = L, y = doc.y + 6;
  const STEP = 42;

  topRow.forEach((t, i) => {
    if (t) drawTooth(doc, x, y, t, fillMap[t] || {});
    x += STEP;
    if (i === 7) x += 18; // gap central
  });

  x = L; y += 76;
  botRow.forEach((t, i) => {
    if (t) drawTooth(doc, x, y, t, fillMap[t] || {});
    x += STEP;
    if (i === 7) x += 18;
  });

  doc.y = y + 64;

  // Datos clínicos
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", L, doc.y);
  doc.moveDown(0.5);
  const colY = doc.y;
  const colW = Math.floor(W / 2) - GAP / 2;
  const rightColX = L + colW + GAP;

  const label = (lab, x0, y0) => doc.font("Helvetica-Bold").fillColor(GRAY).fontSize(11).text(`${lab}:`, x0, y0);
  const value = (val, x0, y0, w = colW - 90) => doc.font("Helvetica").fillColor("#000").fontSize(11).text(val || "—", x0, y0, { width: w });

  // izquierda
  label("EPS", L, colY);           value(patient.eps, L + 90, colY);
  label("Alergias", L, colY + 18); value(patient.allergies, L + 90, colY + 18);
  label("Antecedentes", L, colY + 36); value(patient.medicalHistory, L + 90, colY + 36);

  // derecha
  label("Email", rightColX, colY); value(patient.email, rightColX + 90, colY, rightW - 110);
  const last = patient.consultations?.[0];
  label("Última consulta", rightColX, colY + 18);
  value(last ? fmtDate(last.date) : "—", rightColX + 130, colY + 18, rightW - 150);

  doc.y = colY + 64;
  doc.moveDown(0.8);

  // Procedimientos por diente (nombres)
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)", L, doc.y);
  doc.moveDown(0.4);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  const teethSorted = Object.keys(procsByTooth).sort((a,b)=>Number(a)-Number(b));
  if (teethSorted.length === 0) {
    doc.text("—", L, doc.y);
  } else {
    for (const t of teethSorted) {
      doc.text(`${t}: ${procsByTooth[t].join(", ")}`, L, doc.y, { width: W });
    }
  }

  doc.moveDown(0.8);

  // Citas
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", L, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  if (!patient.appointments?.length) {
    doc.text("—", L, doc.y);
  } else {
    for (const a of patient.appointments) {
      const status = a.status ? ` · ${a.status}` : "";
      doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${status}`, L, doc.y, { width: W });
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
