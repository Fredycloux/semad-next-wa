import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===== Estilo / constantes de layout ajustables ===== */
const VIOLET = "#6d28d9";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";
const GRAY = "#6b7280";
const LIGHT_BG = "#eef2ff";

const COLS = 16;          // columnas del grid
const CENTER_GAP = 14;    // hueco central entre hemiarcadas
const LOGO_W = 110;       // ancho del logo
const CARD_H = 64;        // alto de las tarjetas del encabezado

/* ===================================================== */

const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const CHILD_TOP    = ["55","54","53","52","51","61","62","63","64","65"];
const CHILD_BOTTOM = ["85","84","83","82","81","71","72","73","74","75"];

const fmtDate = d => { try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; } };
const ageFrom = b => {
  if (!b) return "—";
  const birth=new Date(b), now=new Date();
  let a=now.getFullYear()-birth.getFullYear();
  const m=now.getMonth()-birth.getMonth();
  if (m<0 || (m===0 && now.getDate()<birth.getDate())) a--;
  return `${a} años`;
};
const uniq = a => [...new Set(a.filter(Boolean))];

const normSurf = s => {
  s = String(s||"").toUpperCase();
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B"; // arriba
  if (["L","P","LINGUAL","PALATINO","BOTTOM","BOT"].includes(s)) return "L"; // abajo
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";      // izquierda
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";     // derecha
  return "O";                                                   // centro
};

/** Dibuja un diente con las 5 zonas como tu componente de UI,
 *  pero compacto y sin números para evitar "ruido". */
function drawTooth(doc, x, y, size, fills = {}) {
  const pad=2, w=size, h=size;
  const centerSize = w * 0.36;
  const side = (w - centerSize - pad*2) / 2;
  const cx = (w - centerSize)/2;
  const cy = (h - centerSize)/2;

  // marco exterior
  doc.lineWidth(1).strokeColor(SLATE_200).roundedRect(x+0.5,y+0.5,w-1,h-1,8).stroke();

  const paint = (fx, fy, fw, fh, key) => {
    const color = fills[key]?.stroke || fills[key] || null;
    const stroke = color || SLATE_300;
    const fill = color || "#ffffff";
    doc.save();
    doc.strokeColor(stroke).fillColor(fill).fillOpacity(color ? 0.18 : 1.0);
    doc.roundedRect(fx, fy, fw, fh, key === "O" ? 6 : 2).fillAndStroke();
    doc.restore();
  };

  // B (arriba) / L (abajo)
  paint(x+pad, y+pad,          w-pad*2, side, "B");
  paint(x+pad, y+h-pad-side,   w-pad*2, side, "L");
  // M / D
  paint(x+pad,         y+cy, side, centerSize, "M");
  paint(x+w-pad-side,  y+cy, side, centerSize, "D");
  // O
  paint(x+cx, y+cy, centerSize, centerSize, "O");
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

  // Procedimientos por diente (desde facturas) -> nombres amigables
  const invoices = await prisma.invoice.findMany({
    where: { patientId: id },
    include: { items: { include: { procedure: true } } },
    orderBy: { date: "desc" },
  });
  const procsByTooth = {};
  for (const inv of invoices) for (const it of inv.items) {
    if (!it.tooth) continue;
    const t = String(it.tooth);
    (procsByTooth[t] ||= []).push(it.procedure?.name || it.name || it.procedureCode);
  }
  for (const t of Object.keys(procsByTooth)) procsByTooth[t] = uniq(procsByTooth[t]);

  // Mapa de superficies del odontograma { tooth: {B|L|M|D|O: {stroke:#hex}} }
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurf(e.surface);
    (fillMap[t] ||= {})[s] = { stroke: e.color || VIOLET };
  }

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;

  /* ===== Header con LOGO + título ===== */
  let y = 28;
  try {
    const res = await fetch(new URL("/logo_semad.png", req.nextUrl.origin));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      doc.image(buf, L, y-8, { width: LOGO_W });
    }
  } catch {}

  const titleX = L + LOGO_W + 12;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica / Odontograma", titleX, y);

  y += 36;

  /* ===== Tarjetas (paciente y fecha/edad) ===== */
  const leftW = Math.round(W*0.60);
  const rightW = W - leftW - 16;
  const rightX = L + leftW + 16;

  // Izquierda (3 líneas)
  doc.lineWidth(1).strokeColor(VIOLET).fillColor("white");
  doc.roundedRect(L, y, leftW, CARD_H, 12).fillAndStroke("white", VIOLET);

  const cardPad = 12, lineH = 17;
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(11)
    .text("Paciente:", L+cardPad, y+10);
  doc.font("Helvetica").text(patient.fullName || "—", L+88, y+10, { width: leftW-98 });

  doc.font("Helvetica-Bold").text("Documento:", L+cardPad, y+10+lineH);
  doc.font("Helvetica").text(patient.document || "—", L+88, y+10+lineH);

  doc.font("Helvetica-Bold").text("Teléfono:", L+cardPad, y+10+lineH*2);
  doc.font("Helvetica").text(patient.phone || "—", L+88, y+10+lineH*2);

  // Derecha (fecha debajo y edad debajo, sin solaparse)
  doc.roundedRect(rightX, y, rightW, CARD_H, 12).fillAndStroke(LIGHT_BG, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").text("Fecha de reporte", rightX+12, y+10);
  doc.fillColor("#000").font("Helvetica").text(fmtDate(new Date()), rightX+12, y+10+lineH, { width: rightW-24 });
  doc.font("Helvetica-Bold").text("Edad:", rightX+12, y+10+lineH*2);
  doc.font("Helvetica").text(ageFrom(patient.birthDate), rightX+58, y+10+lineH*2);

  y += CARD_H + 14;
  doc.moveTo(L, y).lineTo(R, y).strokeColor(SLATE_200).lineWidth(1).stroke();
  y += 10;

  /* ===== Odontograma ===== */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", L, y);
  y += 6;

  const dent = patient.dentition === "CHILD" ? "CHILD" : "ADULT";
  const pad16 = arr => {
    const n=arr.length, left=Math.floor((COLS-n)/2);
    return Array.from({length:left},()=>null).concat(arr).concat(Array.from({length:COLS-left-n},()=>null));
  };
  const topRow = dent==="ADULT" ? ADULT_TOP : pad16(CHILD_TOP);
  const botRow = dent==="ADULT" ? ADULT_BOTTOM : pad16(CHILD_BOTTOM);

  // Cálculo de tamaño compactado que cabe en 16 columnas + hueco central
  const step = Math.floor((W - CENTER_GAP) / COLS);         // ancho de cada celda
  const size = Math.min(40, step - 6);                      // tamaño del diente (compacto)
  const gapX = (step - size) / 2;                           // centrar diente en celda
  const rowGap = size + 18;

  // Fila superior
  let x = L;
  topRow.forEach((t, i) => {
    if (t) drawTooth(doc, x + gapX, y, size, fillMap[t] || {});
    x += step;
    if (i === 7) x += CENTER_GAP;
  });

  // Fila inferior
  y += rowGap;
  x = L;
  botRow.forEach((t, i) => {
    if (t) drawTooth(doc, x + gapX, y, size, fillMap[t] || {});
    x += step;
    if (i === 7) x += CENTER_GAP;
  });

  y += size + 16;

  /* ===== Datos clínicos (2 columnas anchas) ===== */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", L, y);
  y += 18;

  const colW = Math.floor(W/2) - 10;
  const rightColX = L + colW + 20;
  const label = (t, x0, y0) => doc.font("Helvetica-Bold").fillColor(GRAY).fontSize(11).text(`${t}:`, x0, y0);
  const value = (v, x0, y0, w) => doc.font("Helvetica").fillColor("#000").fontSize(11).text(v || "—", x0, y0, { width: w });

  // izquierda
  label("EPS", L, y);            value(patient.eps, L+90, y, colW-100);
  label("Alergias", L, y+18);    value(patient.allergies, L+90, y+18, colW-100);
  label("Antecedentes", L, y+36);value(patient.medicalHistory, L+90, y+36, colW-100);

  // derecha
  label("Email", rightColX, y);             value(patient.email, rightColX+90, y, colW-110);
  const last = patient.consultations?.[0];
  label("Última consulta", rightColX, y+18); value(last ? fmtDate(last.date) : "—", rightColX+130, y+18, colW-150);

  y += 62;

  /* ===== Procedimientos por diente ===== */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)", L, y);
  y += 16;
  doc.font("Helvetica").fillColor("#000").fontSize(11);

  const keys = Object.keys(procsByTooth).sort((a,b)=>Number(a)-Number(b));
  if (keys.length === 0) {
    doc.text("—", L, y);
  } else {
    for (const t of keys) {
      doc.text(`${t}: ${procsByTooth[t].join(", ")}`, L, y, { width: W });
      y += 14;
    }
  }

  y += 6;

  /* ===== Citas ===== */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", L, y);
  y += 14;
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  if (!patient.appointments?.length) {
    doc.text("—", L, y);
  } else {
    for (const a of patient.appointments) {
      const status = a.status ? ` · ${a.status}` : "";
      doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${status}`, L, y, { width: W });
      y += 14;
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
