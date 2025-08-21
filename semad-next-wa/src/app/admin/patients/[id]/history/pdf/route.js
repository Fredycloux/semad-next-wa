// src/app/api/admin/patients/[id]/history/pdf/route.js
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIOLET = "#6C2BD9";
const SOFT = "#F2ECFF";

const money = n => new Intl.NumberFormat("es-CO").format(Number(n || 0));
const fmtDate = d => new Date(d).toLocaleString("es-CO", { hour12: true });

function ageFrom(birth) {
  if (!birth) return "—";
  const b = new Date(birth);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return `${a} años`;
}

export async function GET(req, { params }) {
  const patientId = params?.id;
  if (!patientId) return new Response("ID inválido", { status: 400 });

  // Paciente + última consulta + facturas (para lista de procedimientos x diente)
  const [patient, lastConsult, invItems] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.consultation.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
    prisma.invoiceItem.findMany({
      where: { invoice: { patientId } },
      include: { procedure: true, invoice: true },
      orderBy: { invoice: { date: "desc" } },
    }).catch(() => []),
  ]);

  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // Intento de cargar marcas del odontograma si existieran (ignora si no hay tabla)
  let odontoMarks = [];
  try {
    odontoMarks = await prisma.odontogramMark.findMany({
      where: { patientId },
    });
  } catch (_) {
    // si el modelo no existe, continuamos con el fallback
  }

  // Conjunto de dientes “marcados”: por odontograma si existe, si no por facturación
  const teethSet = new Set(
    (odontoMarks?.map(m => m.tooth) ?? [])
      .concat(invItems.filter(it => it.tooth).map(it => String(it.tooth)))
  );

  // Mapa de procedimientos por diente (según facturación)
  const byTooth = new Map();
  for (const it of invItems) {
    if (!it.tooth) continue;
    const key = String(it.tooth);
    const arr = byTooth.get(key) || [];
    arr.push(it.procedure?.name || it.procedureCode || "Procedimiento");
    byTooth.set(key, arr);
  }

  // Intento de traer el logo (ponlo en /public/logo_semad.png)
  let logoBuf = null;
  try {
    const r = await fetch(new URL("/logo_semad.png", req.nextUrl.origin));
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch {}

  // ---------- PDF ----------
  const doc = new PDFDocument({ size: "A4", margin: 36 }); // márgenes más contenidos
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const CONTENT_W = right - left;

  // Header
  let y = 18;
  if (logoBuf) {
    doc.image(logoBuf, left, y, { width: 140 });
  }
  doc
    .fillColor(VIOLET)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Reporte de Historia Clínica / Odontograma", left + 160, y + 8);
  doc
    .moveTo(left, y + 50)
    .lineTo(right, y + 50)
    .lineWidth(1)
    .strokeColor(VIOLET)
    .stroke();
  y += 60;

  // Bloque de datos del paciente
  const colW = CONTENT_W * 0.62; // izquierda
  doc
    .roundedRect(left, y, colW, 90, 10)
    .fillAndStroke(SOFT, VIOLET)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Paciente:", left + 12, y + 10)
    .font("Helvetica")
    .text(patient.fullName || "—", left + 85, y + 10)
    .font("Helvetica-Bold")
    .text("Documento:", left + 12, y + 28)
    .font("Helvetica")
    .text(patient.document || "—", left + 85, y + 28)
    .font("Helvetica-Bold")
    .text("Edad:", left + 12, y + 46)
    .font("Helvetica")
    .text(ageFrom(patient.birthDate), left + 85, y + 46)
    .font("Helvetica-Bold")
    .text("Teléfono:", left + 220, y + 10)
    .font("Helvetica")
    .text(patient.phone || "—", left + 290, y + 10)
    .font("Helvetica-Bold")
    .text("Email:", left + 220, y + 28)
    .font("Helvetica")
    .text(patient.email || "—", left + 290, y + 28, { width: colW - 300 })
    .font("Helvetica-Bold")
    .text("EPS:", left + 220, y + 46)
    .font("Helvetica")
    .text(patient.eps || "—", left + 290, y + 46);
  
  // Chip de fecha de emisión (arriba a la derecha)
  const chipX = left + colW + 12;
  const chipY = y;
  doc
    .roundedRect(chipX, chipY, right - chipX, 38, 8)
    .strokeColor(VIOLET)
    .lineWidth(1)
    .stroke();
  doc
    .font("Helvetica-Bold").fillColor(VIOLET).fontSize(10)
    .text("Emitido:", chipX + 10, chipY + 9)
    .font("Helvetica").fillColor("#111")
    .text(fmtDate(Date.now()), chipX + 65, chipY + 9);
  y += 100;

  // Signos vitales (última consulta)
  if (lastConsult) {
    drawSectionTitle(doc, "Signos vitales", left, y); y += 18;
    const chips = [
      ["Temp", lastConsult.temperature ? `${lastConsult.temperature} °C` : "—"],
      ["Pulso", lastConsult.pulse ? `${lastConsult.pulse} lpm` : "—"],
      ["Resp", lastConsult.respiration ? `${lastConsult.respiration} rpm` : "—"],
      ["TA", (lastConsult.sys || lastConsult.dia) ? `${lastConsult.sys || "—"}/${lastConsult.dia || "—"}` : "—"],
    ];
    let cx = left, cy = y, cw = 110, ch = 26, gap = 10;
    for (const [k,v] of chips) {
      doc.roundedRect(cx, cy, cw, ch, 6).fillAndStroke(SOFT, VIOLET);
      doc.fillColor("#111").font("Helvetica-Bold").fontSize(10).text(`${k}:`, cx+8, cy+7);
      doc.font("Helvetica").text(v, cx+40, cy+7);
      cx += cw + gap;
    }
    y += ch + 14;
  }

  // Anamnesis, Diagnóstico, Plan, Prescripción, Alergias, Antecedentes
  drawSectionBlock(doc, "Alergias", patient.allergies || "—", left, y);        y += blockHeight(doc);
  drawSectionBlock(doc, "Antecedentes", patient.medicalHistory || "—", left, y);y += blockHeight(doc);

  if (lastConsult) {
    drawSectionBlock(doc, "Anamnesis", lastConsult.anamnesis || "—", left, y);       y += blockHeight(doc);
    drawSectionBlock(doc, "Diagnóstico", lastConsult.diagnosis || "—", left, y);     y += blockHeight(doc);
    drawSectionBlock(doc, "Plan de tratamiento", lastConsult.plan || "—", left, y);  y += blockHeight(doc);
    drawSectionBlock(doc, "Fórmula / Prescripción", lastConsult.prescription || "—", left, y); y += blockHeight(doc);
  }

  // Odontograma
  y += 4;
  drawSectionTitle(doc, "Odontograma", left, y); y += 10;
  y = drawOdontogram(doc, left, y, teethSet);

  // Procedimientos por diente (según facturación)
  y += 8;
  drawSectionTitle(doc, "Procedimientos por diente", left, y); y += 8;
  doc.font("Helvetica").fontSize(10).fillColor("#111");
  if (byTooth.size === 0) {
    doc.text("—", left, y);
  } else {
    for (const [tooth, arr] of [...byTooth.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))) {
      doc.text(`${tooth}: ${arr.join(", ")}`, left, y, { width: CONTENT_W });
      y += 14;
    }
  }

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.fullName || patientId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

// ---------- helpers de dibujo ----------
function drawSectionTitle(doc, title, x, y) {
  doc
    .font("Helvetica-Bold").fontSize(11).fillColor(VIOLET)
    .text(title, x, y);
  doc
    .moveTo(x, y + 14)
    .lineTo(x + 520, y + 14)
    .lineWidth(0.8)
    .strokeColor(SOFT)
    .stroke();
}

let _lastBlockHeight = 0;
function blockHeight() { return _lastBlockHeight; }
function drawSectionBlock(doc, title, text, x, y) {
  drawSectionTitle(doc, title, x, y);
  const top = y + 18;
  const h = doc.heightOfString(text || "—", { width: 520, align: "justify" }) + 14;
  doc
    .roundedRect(x, top, 520, h, 8)
    .fillAndStroke("#fff", "#eae7ff");
  doc
    .fillColor("#111").font("Helvetica").fontSize(10)
    .text(text || "—", x + 10, top + 8, { width: 500, align: "justify" });
  _lastBlockHeight = h + 26;
}

function drawOdontogram(doc, x, y, teethSet) {
  const gap = 6;
  const boxW = 28, boxH = 24;
  const rows = [
    [18,17,16,15,14,13,12,11],
    [21,22,23,24,25,26,27,28],
    [48,47,46,45,44,43,42,41],
    [31,32,33,34,35,36,37,38],
  ];
  doc.fontSize(9);
  for (let r = 0; r < rows.length; r++) {
    let cx = x;
    let cy = y + r * (boxH + gap);
    for (const n of rows[r]) {
      const t = String(n);
      const marked = teethSet.has(t);
      doc
        .roundedRect(cx, cy, boxW, boxH, 5)
        .fillAndStroke(marked ? SOFT : "#fff", VIOLET);
      doc
        .fillColor("#555")
        .text(String(n), cx + 8, cy + boxH / 2 - 5);
      cx += boxW + gap;
    }
  }
  // nota
  const bottom = y + rows.length * (boxH + gap) + 8;
  doc
    .moveTo(x, bottom)
    .lineTo(x + 520, bottom)
    .lineWidth(0.6)
    .strokeColor("#e9e9e9")
    .stroke();
  doc
    .font("Helvetica").fontSize(9).fillColor("#666")
    .text(
      "Cuadros resaltados indican dientes con procedimientos registrados (según odontograma o facturación).",
      x, bottom + 6
    );
  return bottom + 22;
}
