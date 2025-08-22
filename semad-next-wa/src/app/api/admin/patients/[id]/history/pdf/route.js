import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
// Usa exactamente la misma paleta que el front.
import { colorForLabel } from "@/lib/odontogram-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIOLET = "#6D28D9";          // tailwind violet-700
const GRAY_STROKE = "#E5E7EB";     // slate-200
const GRAY_TEXT = "#6B7280";       // slate-500

// FDI adulto
const TOP = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const BOT = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const SURFACES = ["O","M","D","B","L"];

const mm = n => n * 2.83465; // helper si lo necesitas (no obligatorio)

function ageFrom(birthDate) {
  if (!birthDate) return "—";
  const d = new Date(birthDate);
  if (Number.isNaN(+d)) return "—";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return `${a} años`;
}

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: { orderBy: { date: "desc" }, take: 1 },
      appointments:  { orderBy: { date: "desc" }, take: 3 },
      invoices: {
        orderBy: { date: "desc" },
        include: { items: { include: { procedure: true } } }
      }
    }
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // ==== Build maps ====
  // Odontograma: clave "diente|superficie"
  const marks = new Map();
  for (const e of (patient.odontogram || [])) {
    const s = (e.surface || "O").toUpperCase();
    marks.set(`${e.tooth}|${s}`, { ...e, surface: s });
  }

  // Procedimientos por diente (según facturación)
  const procsByTooth = new Map();
  for (const inv of (patient.invoices || [])) {
    for (const it of inv.items || []) {
      const t = it.tooth || it.toothNumber || null;
      if (!t) continue;
      const list = procsByTooth.get(t) || [];
      list.push(it.procedure?.name || it.description || it.procedureCode || "Procedimiento");
      procsByTooth.set(String(t), list);
    }
  }

  const lastConsult = patient.consultations?.[0]?.date || null;

  // ==== PDF =====
  const doc = new PDFDocument({ size: "A4", margin: 36 }); // 0.5in
  const stream = new PassThrough();
  doc.pipe(stream);

  const left  = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // --- Encabezado: logo + título
  const origin = req.nextUrl.origin;
  let logoBuf = null;
  try {
    const r = await fetch(new URL("/logo_semad.png", origin));
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch {}
  const y0 = 24;

  if (logoBuf) doc.image(logoBuf, left, y0 - 6, { width: 110 });

  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("Reporte de Historia Clínica /", left + (logoBuf ? 120 : 0), y0, { continued: true });
  doc
    .fillColor(VIOLET)
    .text(" Odontograma");

  // --- Tarjeta paciente (izquierda)
  let y = y0 + 36;
  const cardH = 68;
  const colGap = 16;
  const cardW = (width - colGap) * 0.58;

  doc.roundedRect(left, y, cardW, cardH, 12).strokeColor(VIOLET).lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000");
  const L1 = left + 12;
  const TY = y + 10;
  const LH = 16;

  const age = ageFrom(patient.birthDate);
  doc.text("Paciente:", L1, TY);
  doc.text("Documento:", L1, TY + LH);
  doc.text("Teléfono:", L1, TY + LH * 2);
  doc.text("Email:", L1, TY + LH * 3);

  doc.font("Helvetica").fillColor("#000");
  const VX = L1 + 80;
  doc.text(patient.fullName || "—", VX, TY);
  doc.text(patient.document || "—",  VX, TY + LH);
  doc.text(patient.phone || "—",     VX, TY + LH * 2);
  doc.text(patient.email || "—",     VX, TY + LH * 3);

  // Edad al final de la tarjeta (alineado a la derecha)
  doc.font("Helvetica-Bold").text("Edad:", left + cardW - 110, TY);
  doc.font("Helvetica").text(age, left + cardW - 60, TY);

  // --- Tarjeta fecha (derecha)
  const card2X = left + cardW + colGap;
  const card2W = width - cardW - colGap;
  doc.roundedRect(card2X, y, card2W, cardH, 12).strokeColor(VIOLET).lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(VIOLET).text("Fecha de reporte", card2X + 12, TY);
  doc.font("Helvetica").fillColor("#000").text(new Date().toLocaleString("es-CO"), { align: "left" });

  y += cardH + 18;

  // --- Separador
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(GRAY_STROKE).stroke();
  y += 10;

  // --- Odontograma
  doc.font("Helvetica-Bold").fontSize(12).fillColor(VIOLET).text("Odontograma", left, y);
  y += 8;

  // dibujo de tooth (idéntico al UI)
  function toothRects({ x, y, size, tooth }) {
    const pad = 2;
    const w = size, h = size;
    const centerSize = w * 0.36;
    const side = (w - centerSize - pad * 2) / 2;
    const cx = x + (w - centerSize) / 2;
    const cy = y + (h - centerSize) / 2;

    // Helper fill/stroke por superficie
    const F = (s) => {
      const key = `${tooth}|${s}`;
      const e = marks.get(key);
      if (!e) return { fill: "#FFFFFF", stroke: GRAY_STROKE };
      const c = e.color || colorForLabel(e.label) || VIOLET;
      return { fill: `${c}22`, stroke: c };
    };

    // marco exterior
    doc.roundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 8).lineWidth(1).fillAndStroke("#FFFFFF", GRAY_STROKE);

    // B (superior)
    let s = F("B");
    doc.rect(x + pad, y + pad, w - pad * 2, side).fillAndStroke(s.fill, s.stroke);

    // L (inferior)
    s = F("L");
    doc.rect(x + pad, y + h - pad - side, w - pad * 2, side).fillAndStroke(s.fill, s.stroke);

    // M (izquierda)
    s = F("M");
    doc.rect(x + pad, cy, side, centerSize).fillAndStroke(s.fill, s.stroke);

    // D (derecha)
    s = F("D");
    doc.rect(x + w - pad - side, cy, side, centerSize).fillAndStroke(s.fill, s.stroke);

    // O (centro)
    s = F("O");
    doc.roundedRect(cx, cy, centerSize, centerSize, 6).fillAndStroke(s.fill, s.stroke);

    // número del diente
    doc.font("Helvetica").fontSize(8).fillColor(GRAY_TEXT)
       .text(tooth, x, y + h + 2, { width: w, align: "center" });
  }

  // Grid 16 columnas × 2 filas (adulto)
  const cell = 22;         // tamaño del “diente”
  const gap  = 8;          // separación
  const gridW = 16 * cell + 15 * gap;
  const gx = left; // centrado a izquierda respetando ancho
  let gy = y + 16;

  // superior
  for (let i = 0; i < TOP.length; i++) {
    const t = TOP[i];
    toothRects({ x: gx + i * (cell + gap), y: gy, size: cell, tooth: t });
  }
  // inferior
  gy += cell + 22; // 22 deja espacio para números
  for (let i = 0; i < BOT.length; i++) {
    const t = BOT[i];
    toothRects({ x: gx + i * (cell + gap), y: gy, size: cell, tooth: t });
  }

  y = gy + cell + 30;

  // === Datos clínicos
  doc.font("Helvetica-Bold").fontSize(12).fillColor(VIOLET).text("Datos clínicos", left, y);
  y += 10;

  const colW = (width - colGap) / 2;
  const L = left, R = left + colW + colGap;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text("EPS:", L, y);
  doc.font("Helvetica").text(patient.insurer || "—", L + 40, y);
  y += 14;

  doc.font("Helvetica-Bold").text("Alergias:", L, y);
  doc.font("Helvetica").text(patient.allergies || "—", L + 60, y);
  y += 14;

  doc.font("Helvetica-Bold").text("Antecedentes:", L, y);
  doc.font("Helvetica").text(patient.medicalBackground || "—", L + 90, y);

  // Derecha
  let yR = y - 28;
  doc.font("Helvetica-Bold").text("Email:", R, yR);
  doc.font("Helvetica").text(patient.email || "—", R + 40, yR);
  yR += 14;

  doc.font("Helvetica-Bold").text("Última consulta:", R, yR);
  doc.font("Helvetica").text(lastConsult ? new Date(lastConsult).toLocaleString("es-CO") : "—", R + 110, yR);

  y = Math.max(y, yR) + 18;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_STROKE).lineWidth(0.8).stroke();
  y += 10;

  // === Procedimientos por diente
  doc.font("Helvetica-Bold").fontSize(12).fillColor(VIOLET)
     .text("Procedimientos por diente (según facturación)", left, y);
  y += 8;

  doc.font("Helvetica").fontSize(10).fillColor("#000");
  if (procsByTooth.size === 0) {
    doc.text("—", left, y);
  } else {
    const sorted = [...procsByTooth.entries()].sort((a,b)=> Number(a[0]) - Number(b[0]));
    for (const [tooth, list] of sorted) {
      const line = `${tooth}: ${Array.from(new Set(list)).join(", ")}`;
      doc.text(line, left, y, { width, continued: false });
      y += 14;
    }
  }

  y += 6;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_STROKE).lineWidth(0.8).stroke();
  y += 10;

  // === Citas (hasta 3 más recientes)
  doc.font("Helvetica-Bold").fontSize(12).fillColor(VIOLET).text("Citas", left, y);
  y += 8;
  doc.font("Helvetica").fontSize(10).fillColor("#000");
  if (!patient.appointments?.length) {
    doc.text("—", left, y);
  } else {
    for (const a of patient.appointments) {
      doc.text(
        `${new Date(a.date).toLocaleString("es-CO")} — ${a.reason || "Consulta inicial"} · ${a.status || "Programada"}`,
        left, y
      );
      y += 14;
    }
  }

  doc.end();
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.fullName || patient.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
