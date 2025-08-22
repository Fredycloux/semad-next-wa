import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- util ---------- */
const VIOLET = "#6d28d9";
const GRAY_BORDER = "#E5E7EB";
const GRAY_TEXT = "#6B7280";

const TOP_ADULT = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const BOT_ADULT = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

function yearsFrom(dateLike){
  const d = dateLike && new Date(dateLike);
  if (!d || isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
}
function drawBox(doc, x, y, w, h, title, body){
  doc.roundedRect(x, y, w, h, 10).lineWidth(1).strokeColor(VIOLET).stroke();
  if (title){
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(12).text(title, x+10, y+8);
  }
  if (body){
    doc.fillColor("#111").font("Helvetica").fontSize(11);
    body(x+10, y+(title?28:10));
  }
}
function toothMarksBySurface(entries){
  // { [tooth]: {B:{color},L:{…},M:{…},D:{…},O:{…}} }
  const out = {};
  for (const e of entries||[]){
    const t = String(e.tooth);
    const s = (e.surface||"O").toUpperCase();
    if (!out[t]) out[t] = {};
    // **IMPORTANTE**: usamos SOLO el color guardado, para que sea IGUAL al UI
    if (e.color) out[t][s] = { color: e.color };
  }
  return out;
}
function drawTooth(doc, x, y, size, marks = {}){
  const pad = 1.6;
  const w = size, h = size;
  const center = w*0.36;
  const side = (w - center - pad*2)/2;
  const cx = (w - center)/2;
  const cy = (h - center)/2;

  const fill = s => (marks[s]?.color ? marks[s].color + "33" : "#ffffff");
  const stroke = s => (marks[s]?.color || GRAY_BORDER);

  doc.roundedRect(x+0.5, y+0.5, w-1, h-1, 6).lineWidth(0.8).strokeColor(GRAY_BORDER).stroke();
  // B
  doc.rect(x+pad, y+pad, w-pad*2, side).fillAndStroke(fill("B"), stroke("B"));
  // L
  doc.rect(x+pad, y+h-pad-side, w-pad*2, side).fillAndStroke(fill("L"), stroke("L"));
  // M
  doc.rect(x+pad, y+cy, side, center).fillAndStroke(fill("M"), stroke("M"));
  // D
  doc.rect(x+w-pad-side, y+cy, side, center).fillAndStroke(fill("D"), stroke("D"));
  // O
  doc.roundedRect(x+cx, y+cy, center, center, 4).fillAndStroke(fill("O"), stroke("O"));
}

/* ---------- route ---------- */
export async function GET(req, { params }){
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: { orderBy: { date: "desc" }, take: 1 },
      appointments: { orderBy: { date: "desc" }, take: 6 },
      invoices: { include: { items: { include: { procedure: true } } } }, // <-- nombre del procedimiento
    },
  });
  if (!patient) return new Response("Paciente no encontrado.", { status: 404 });

  const origin = req.nextUrl.origin;
  let logo = null;
  try{
    const r = await fetch(new URL("/logo_semad.png", origin));
    if (r.ok) logo = Buffer.from(await r.arrayBuffer());
  }catch{}

  const doc = new PDFDocument({ size: "LETTER", margin: 36 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  /* Header */
  let y = 24;
  if (logo) doc.image(logo, left, y-6, { width: 110 });
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(24)
     .text("Reporte de Historia Clínica /", left+130, y)
     .text("Odontograma", left+130, y+28);
  y += 60;

  /* Tarjetas superiores */
  const age =
    yearsFrom(patient.birthDate) ??
    yearsFrom(patient.birthdate) ??
    yearsFrom(patient.dob) ??
    (typeof patient.age === "number" ? patient.age : null);

  const boxH = 78;
  drawBox(doc, left, y, width*0.62, boxH, null, (x, yy) => {
    const L = (k,v) => { doc.font("Helvetica-Bold").text(k, x, yy, {continued:true}); doc.font("Helvetica").text(` ${v ?? "—"}`); yy+=16; };
    L("Paciente:", patient.fullName);
    L("Documento:", patient.document || "—");
    L("Teléfono:", patient.phone || "—");
    L("Email:", patient.email || "—");
  });
  drawBox(doc, left+width*0.66, y, width*0.34, boxH, "Fecha de reporte", (x, yy) => {
    doc.font("Helvetica").text(new Date().toLocaleString("es-CO"), x, yy);
    yy += 18;
    doc.font("Helvetica-Bold").text("Edad:", x, yy, {continued:true});
    doc.font("Helvetica").text(` ${age ?? "—"}`);
  });
  y += boxH + 16;

  /* Odontograma */
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_BORDER).lineWidth(1).stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", left, y);
  y += 8;

  const marks = toothMarksBySurface(patient.odontogram);
  const cell = 16;      // más chico para que no se amontone
  const gap  = 8;
  const rowW = 16 * (cell + gap) - gap;
  const startX = left + Math.floor((width - rowW)/2);

  const drawRow = (teeth, yy) => {
    let xx = startX;
    for (const t of teeth){
      drawTooth(doc, xx, yy, cell, marks[t]);
      doc.fontSize(7).fillColor(GRAY_TEXT).text(t, xx, yy+cell+2, { width: cell, align: "center" });
      xx += cell + gap;
    }
    return yy + cell + 14;
  };
  y = drawRow(TOP_ADULT, y + 6);
  y = drawRow(BOT_ADULT, y + 6);

  /* Datos clínicos */
  y += 6;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_BORDER).stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", left, y);
  y += 2;

  const colW = Math.floor(width/2) - 12;
  const L = (k,v,x0,yy) => { doc.font("Helvetica-Bold").fillColor("#111").fontSize(11).text(k, x0, yy, {continued:true}); doc.font("Helvetica").text(` ${v ?? "—"}`); };

  // nombres alternativos para antecedentes (usa el que tengas en el modelo)
  const antecedentes =
    patient.medicalHistory ??
    patient.medicalBackground ??
    patient.background ??
    patient.antecedentes ??
    patient.history ??
    null;

  L("EPS:", patient.insurer, left, y+18);
  L("Alergias:", patient.allergies, left, y+36);
  L("Antecedentes:", antecedentes, left, y+54);
  const lastC = patient.consultations?.[0];
  L("Email:", patient.email || "—", left+colW, y+18);
  L("Última consulta:", lastC?.date ? new Date(lastC.date).toLocaleString("es-CO") : "—", left+colW, y+36);
  y += 72;

  /* Procedimientos por diente */
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_BORDER).stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
     .text("Procedimientos por diente (según facturación)", left, y);
  y += 14;

  // Mostrar NOMBRE del procedimiento (no el código)
  const byTooth = {};
  for (const inv of patient.invoices || []){
    for (const it of inv.items || []){
      if (!it.tooth) continue;
      const t = String(it.tooth);
      if (!byTooth[t]) byTooth[t] = new Set();
      const name = it.procedure?.name || it.description || it.procedureName || "";
      if (name) byTooth[t].add(name);
    }
  }
  if (Object.keys(byTooth).length){
    const lines = [];
    for (const t of Object.keys(byTooth).sort((a,b)=>Number(a)-Number(b))){
      lines.push(`${t}: ${Array.from(byTooth[t]).join(", ")}`);
    }
    doc.font("Helvetica").fontSize(11).fillColor("#111").text(lines.join(" · "), left, y, { width });
    y += 18;
  } else {
    doc.font("Helvetica").fontSize(11).fillColor(GRAY_TEXT).text("—", left, y);
    y += 12;
  }

  /* Citas */
  doc.moveTo(left, y).lineTo(right, y).strokeColor(GRAY_BORDER).stroke();
  y += 10;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", left, y);
  y += 12;
  if (patient.appointments?.length){
    doc.font("Helvetica").fontSize(11).fillColor("#111");
    for (const a of patient.appointments){
      doc.text(`${new Date(a.date).toLocaleString("es-CO")} — ${a.reason || "—"}${a.status ? ` · ${a.status}` : ""}`, left, y);
      y += 14;
    }
  } else {
    doc.font("Helvetica").fontSize(11).fillColor(GRAY_TEXT).text("—", left, y);
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
