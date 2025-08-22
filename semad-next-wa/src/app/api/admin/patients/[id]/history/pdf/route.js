import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { colorForLabel } from "@/lib/odontogram-config"; // mismo mapping que el UI

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIOLET = "#6d28d9";

function ageFrom(birthDate) {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  const diff = Date.now() - bd.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
}
const withAlpha = (hex, a = "33") => hex && /^#([0-9a-f]{6})$/i.test(hex) ? hex + a : "#00000033";

function drawBox(doc, x, y, w, h, title, body) {
  doc.roundedRect(x, y, w, h, 10).lineWidth(1).strokeColor(VIOLET).stroke();
  if (title) {
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(12).text(title, x + 10, y + 8);
  }
  if (body) {
    doc.fillColor("#111").font("Helvetica").fontSize(11);
    body(x + 10, y + 26);
  }
}

function drawTooth(doc, x, y, size, marks = {}) {
  const pad = 1.6;
  const w = size, h = size;
  const center = w * 0.36;
  const side = (w - center - pad * 2) / 2;
  const cx = (w - center) / 2;
  const cy = (h - center) / 2;

  const get = s => marks[s]; // { color, label }
  const fill = s => withAlpha((get(s)?.color || colorForLabel(get(s)?.label)), "33");
  const stroke = s => (get(s)?.color || colorForLabel(get(s)?.label) || "#CBD5E1");

  // marco exterior
  doc.roundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 6).lineWidth(0.8).strokeColor("#E5E7EB").stroke();

  // B (arriba)
  doc.rect(x + pad, y + pad, w - pad * 2, side).fillAndStroke(fill("B"), stroke("B"));
  // L (abajo)
  doc.rect(x + pad, y + h - pad - side, w - pad * 2, side).fillAndStroke(fill("L"), stroke("L"));
  // M (izq)
  doc.rect(x + pad, y + cy, side, center).fillAndStroke(fill("M"), stroke("M"));
  // D (der)
  doc.rect(x + w - pad - side, y + cy, side, center).fillAndStroke(fill("D"), stroke("D"));
  // O (centro)
  doc.roundedRect(x + cx, y + cy, center, center, 4).fillAndStroke(fill("O"), stroke("O"));
}

function groupMarks(entries) {
  // devuelve: { [tooth]: {B:{color,label}, L:{...}, ...} }
  const out = {};
  for (const e of entries) {
    const t = String(e.tooth);
    const s = (e.surface || "O").toUpperCase();
    if (!out[t]) out[t] = {};
    out[t][s] = { color: e.color || colorForLabel(e.label), label: e.label };
  }
  return out;
}

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  // Datos del paciente + odontograma + última consulta + procedimientos facturados por diente
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: { orderBy: { date: "desc" }, take: 1 },
      invoices: { include: { items: true } }, // para “procedimientos por diente”
      appointments: { orderBy: { date: "desc" } }
    }
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  const origin = req.nextUrl.origin;

  // Logo
  let logoBuf = null;
  try {
    const r = await fetch(new URL("/logo_semad.png", origin));
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch {}

  const doc = new PDFDocument({ size: "LETTER", margin: 36 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // Header
  let y = 24;
  if (logoBuf) doc.image(logoBuf, left, y - 8, { width: 110 });
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica /", left + 130, y)
     .text("Odontograma", left + 130, y + 26);
  y += 58;

  // Tarjeta paciente (incluye edad y email)
  const age = ageFrom(patient.birthDate);
  const boxH = 72;
  drawBox(doc, left, y, width * 0.62, boxH, null, (x, yy) => {
    const L = (k, v) => {
      doc.font("Helvetica-Bold").text(k, x, yy, { continued: true });
      doc.font("Helvetica").text(` ${v ?? "—"}`); yy += 16;
    };
    L("Paciente:", patient.fullName);
    L("Documento:", patient.document || "—");
    L("Teléfono:", patient.phone || "—");
    L("Email:", patient.email || "—");
  });
  drawBox(doc, left + width * 0.66, y, width * 0.34, boxH, "Fecha de reporte", (x, yy) => {
    doc.font("Helvetica").text(new Date().toLocaleString("es-CO"), x, yy);
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").text("Edad:", x, yy + 18, { continued: true });
    doc.font("Helvetica").text(` ${age ?? "—"}`);
  });
  y += boxH + 18;

  // Odontograma
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", left, y);
  y += 12;

  // Mapeo de marcas
  const marks = groupMarks(patient.odontogram || []);

  // FDI adulto (como en la UI)
  const TOP = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
  const BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

  const cell = 20;        // tamaño del diente
  const gap = 10;         // separación entre dientes
  const rowW = 16 * (cell + gap) - gap;
  const startX = left + Math.floor((width - rowW) / 2);

  const drawRow = (teeth, yy) => {
    let xx = startX;
    for (const t of teeth) {
      drawTooth(doc, xx, yy, cell, marks[t]);
      // número debajo
      doc.fontSize(8).fillColor("#6B7280").text(t, xx, yy + cell + 3, { width: cell, align: "center" });
      xx += cell + gap;
    }
    return yy + cell + 16;
  };
  y = drawRow(TOP, y + 6);
  y = drawRow(BOTTOM, y + 6);

  // Datos clínicos
  y += 8;
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#E5E7EB").stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", left, y);
  y += 4;

  const colW = Math.floor(width / 2) - 12;
  const L = (k, v, x0, yy) => {
    doc.font("Helvetica-Bold").fillColor("#111").fontSize(11).text(k, x0, yy, { continued: true });
    doc.font("Helvetica").fillColor("#111").text(` ${v ?? "—"}`);
  };
  const lastC = patient.consultations?.[0];
  L("EPS:", patient.insurer, left, y + 18);
  L("Alergias:", patient.allergies, left, y + 36);
  L("Antecedentes:", patient.medicalHistory ?? patient.background ?? "—", left, y + 54);
  L("Email:", patient.email || "—", left + colW, y + 18);
  L("Última consulta:", lastC?.date ? new Date(lastC.date).toLocaleString("es-CO") : "—", left + colW, y + 36);
  y += 72;

  // Procedimientos por diente (según facturación)
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#E5E7EB").stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Procedimientos por diente (según facturación)", left, y);
  y += 16;

  // Agrupar items de factura por diente (solo nombre de procedimiento)
  const byTooth = {};
  for (const inv of patient.invoices || []) {
    for (const it of inv.items || []) {
      if (!it.tooth) continue;
      const t = String(it.tooth);
      if (!byTooth[t]) byTooth[t] = new Set();
      byTooth[t].add(it.description || it.procedureName || it.procedureCode || "");
    }
  }
  if (Object.keys(byTooth).length) {
    doc.font("Helvetica").fontSize(11).fillColor("#111");
    const lines = [];
    for (const t of Object.keys(byTooth).sort((a,b)=>Number(a)-Number(b))) {
      lines.push(`${t}: ${Array.from(byTooth[t]).filter(Boolean).join(", ")}`);
    }
    doc.text(lines.join(" · "), left, y, { width, align: "left" });
    y += 20;
  } else {
    doc.font("Helvetica").fontSize(11).fillColor("#6B7280").text("—", left, y);
    y += 16;
  }

  // Citas
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#E5E7EB").stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", left, y);
  y += 14;
  const appts = (patient.appointments || []).slice(0, 6);
  if (appts.length) {
    doc.font("Helvetica").fontSize(11).fillColor("#111");
    for (const a of appts) {
      doc.text(
        `${new Date(a.date).toLocaleString("es-CO")} — ${a.reason || "—"} ${a.status ? `· ${a.status}` : ""}`,
        left, y
      );
      y += 14;
    }
  } else {
    doc.font("Helvetica").fontSize(11).fillColor("#6B7280").text("—", left, y);
    y += 14;
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
