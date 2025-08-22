import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===== Estilo / layout ===== */
const VIOLET = "#6d28d9";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";
const GRAY = "#6b7280";
const LIGHT_BG = "#eef2ff";

const COLS = 16;          // columnas del grid
const CENTER_GAP = 16;    // hueco entre 11–21 y 41–31
const LOGO_W = 110;       // ancho del logo
const CARD_H = 68;        // alto tarjetas del encabezado
const TOP_Y  = 44;        // ↓ baja un poco el encabezado

/* ===== FDI ===== */
const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const CHILD_TOP    = ["55","54","53","52","51","61","62","63","64","65"];
const CHILD_BOTTOM = ["85","84","83","82","81","71","72","73","74","75"];

/* ===== util ===== */
const fmtDate = d => { try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; } };
const ageFrom = b => {
  if (!b) return "—";
  const birth=new Date(b), now=new Date();
  let a=now.getFullYear()-birth.getFullYear();
  const m=now.getMonth()-birth.getMonth();
  if (m<0 || (m===0 && now.getDate()<birth.getDate())) a--;
  return `${a} años`;
};
const uniq = a => [...new Set((a||[]).filter(Boolean))];

// normaliza superficies (como en tu componente)
const normSurf = s => {
  s = String(s||"").toUpperCase();
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B";
  if (["L","P","LINGUAL","PALATINO","BOTTOM","BOT"].includes(s)) return "L";
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";
  return "O";
};

/* ===== diente (misma lógica de 5 zonas) ===== */
function drawTooth(doc, x, y, size, fills = {}) {
  const pad=2, w=size, h=size;
  const centerSize = w * 0.36;
  const side = (w - centerSize - pad*2) / 2;
  const cx = (w - centerSize)/2;
  const cy = (h - centerSize)/2;

  // marco
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

  // B / L / M / D / O
  paint(x+pad, y+pad,          w-pad*2, side, "B");
  paint(x+pad, y+h-pad-side,   w-pad*2, side, "L");
  paint(x+pad,         y+cy, side, centerSize, "M");
  paint(x+w-pad-side,  y+cy, side, centerSize, "D");
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

  // mapa de superficies -> color guardado en BD
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurf(e.surface);
    (fillMap[t] ||= {})[s] = { stroke: e.color || VIOLET };
  }

  /* ====== PDF ====== */
  const doc = new PDFDocument({ size: "A4", margin: 46 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;

  /* Header con logo y título */
  let y = TOP_Y;
  try {
    const res = await fetch(new URL("/logo_semad.png", req.nextUrl.origin));
    if (res.ok) doc.image(Buffer.from(await res.arrayBuffer()), L, y-10, { width: LOGO_W });
  } catch {}

  const titleX = L + LOGO_W + 12;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica /", titleX, y);
  doc.text("Odontograma", titleX, undefined);

  y += 38;

  /* Fichas: Paciente (con email) y Fecha/Edad */
  const leftW = Math.round(W*0.60);
  const rightW = W - leftW - 16;
  const rightX = L + leftW + 16;

  // ficha paciente
  doc.lineWidth(1).strokeColor(VIOLET).fillColor("white");
  doc.roundedRect(L, y, leftW, CARD_H, 12).fillAndStroke("white", VIOLET);

  const p = 12, lh = 17;
  const label = (t, x0, y0) => doc.font("Helvetica-Bold").fillColor("#000").fontSize(11).text(t, x0, y0);
  const value = (v, x0, y0, w) => doc.font("Helvetica").fillColor("#000").fontSize(11).text(v || "—", x0, y0, { width: w });

  label("Paciente:",   L+p, y+10); value(patient.fullName,          L+90, y+10, leftW-100);
  label("Documento:",  L+p, y+10+lh); value(patient.document,       L+90, y+10+lh);
  label("Teléfono:",   L+p, y+10+lh*2); value(patient.phone,        L+90, y+10+lh*2);
  label("Email:",      L+p, y+10+lh*3); value(patient.email,        L+90, y+10+lh*3, leftW-100);

  // ficha fecha/edad
  doc.roundedRect(rightX, y, rightW, CARD_H, 12).fillAndStroke(LIGHT_BG, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").text("Fecha de reporte", rightX+12, y+10);
  doc.fillColor("#000").font("Helvetica").text(fmtDate(new Date()), rightX+12, y+10+lh, { width: rightW-24 });
  doc.font("Helvetica-Bold").text("Edad:", rightX+12, y+10+lh*2);
  doc.font("Helvetica").text(ageFrom(patient.birthDate), rightX+58, y+10+lh*2);

  y += CARD_H + 16;
  doc.moveTo(L, y).lineTo(R, y).strokeColor(SLATE_200).lineWidth(1).stroke();
  y += 12;

  /* Odontograma */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", L, y);
  y += 8;

  const dent = patient.dentition === "CHILD" ? "CHILD" : "ADULT";
  const pad16 = arr => {
    const n=arr.length, left=Math.floor((COLS-n)/2);
    return Array.from({length:left},()=>null).concat(arr).concat(Array.from({length:COLS-left-n},()=>null));
  };
  const topRow = dent==="ADULT" ? ADULT_TOP : pad16(CHILD_TOP);
  const botRow = dent==="ADULT" ? ADULT_BOTTOM : pad16(CHILD_BOTTOM);

  // cálculo compacto y centrado al mismo margen del título
  const step = Math.floor((W - CENTER_GAP) / COLS);
  const size = Math.min(34, step - 6);
  const gapX = (step - size) / 2;
  const rowGap = size + 18;

  // fila superior
  let x = L;
  topRow.forEach((t, i) => {
    if (t) {
      drawTooth(doc, x + gapX, y, size, fillMap[t] || {});
      // numeración bajo cada pieza
      doc.font("Helvetica").fontSize(9).fillColor("#9CA3AF")
         .text(t, x + step/2 - 6, y + size + 2, { width: 12, align: "center" });
    }
    x += step;
    if (i === 7) x += CENTER_GAP;
  });

  // fila inferior
  y += rowGap;
  x = L;
  botRow.forEach((t, i) => {
    if (t) {
      drawTooth(doc, x + gapX, y, size, fillMap[t] || {});
      doc.font("Helvetica").fontSize(9).fillColor("#9CA3AF")
         .text(t, x + step/2 - 6, y + size + 2, { width: 12, align: "center" });
    }
    x += step;
    if (i === 7) x += CENTER_GAP;
  });

  y += size + 18;

  /* Datos clínicos (dos columnas) */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", L, y);
  y += 18;

  const colW = Math.floor(W/2) - 10;
  const rightColX = L + colW + 20;
  const lbl = (t, x0, y0) => doc.font("Helvetica-Bold").fillColor(GRAY).fontSize(11).text(`${t}:`, x0, y0);
  const val = (v, x0, y0, w) => doc.font("Helvetica").fillColor("#000").fontSize(11).text(v || "—", x0, y0, { width: w });

  // izquierda
  lbl("EPS",         L, y);      val(patient.insurer,        L+90, y,     colW-100);
  lbl("Alergias",    L, y+18);   val(patient.allergies,      L+90, y+18,  colW-100);
  lbl("Antecedentes",L, y+36);   val(patient.antecedentes, L+90, y+36,  colW-100);

  // derecha (sin repetir el email aquí)
  const last = patient.consultations?.[0];
  lbl("Última consulta", rightColX, y); val(last ? fmtDate(last.date) : "—", rightColX+130, y, colW-150);

  y += 62;

  /* Procedimientos por diente */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)", L, y);
  y += 16;
  doc.font("Helvetica").fillColor("#000").fontSize(11);

  const keys = Object.keys(procsByTooth).sort((a,b)=>Number(a)-Number(b));
  if (!keys.length) {
    doc.text("—", L, y);
  } else {
    for (const t of keys) {
      doc.text(`${t}: ${procsByTooth[t].join(", ")}`, L, y, { width: W });
      y += 14;
    }
  }

  y += 8;

  /* Citas */
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
