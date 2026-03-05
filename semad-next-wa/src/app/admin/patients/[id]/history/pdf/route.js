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
  const [patient, lastConsult, invItems, conditions] = await Promise.all([
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
    prisma.toothCondition.findMany({
      where: { patientId },
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
  } catch { }

  // ---------- PDF ----------
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 50, left: 40, right: 40 },
    bufferPages: true,
  });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const CONTENT_W = right - left;

  const VIOLET = "#6d28d9";
  const TEXT_MAIN = "#1e293b";
  const TEXT_MUTED = "#64748b";
  const BORDER = "#e2e8f0";
  const BG_LIGHT = "#f8fafc";

  let currentY = 40;

  const checkPageBreak = (neededH) => {
    if (currentY + neededH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      currentY = doc.page.margins.top;
    }
  };

  const drawSectionTitle = (title) => {
    checkPageBreak(40);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(VIOLET).text(title, left, currentY);
    currentY += 16;
    doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(1).strokeColor(BORDER).stroke();
    currentY += 12;
  };

  const drawSectionBlock = (title, text) => {
    drawSectionTitle(title);
    const h = doc.heightOfString(text || "—", { width: CONTENT_W, align: "justify" });
    checkPageBreak(h + 20);
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MAIN).text(text || "—", left, currentY, { width: CONTENT_W, align: "justify" });
    currentY += h + 20;
  };

  // 1. Header Logo and Title
  if (logoBuf) {
    doc.image(logoBuf, left, currentY, { height: 40 });
  }

  doc
    .fillColor(VIOLET)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Reporte de Historia Clínica", left, currentY + 4, { align: "right", width: CONTENT_W })
    .fillColor(TEXT_MUTED)
    .font("Helvetica")
    .fontSize(10)
    .text(`Generado: ${fmtDate(Date.now())}`, left, doc.y + 2, { align: "right", width: CONTENT_W });

  currentY += 56;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(2).strokeColor(VIOLET).stroke();
  currentY += 20;

  // 2. Patient Info Card
  const cardH = 75;
  doc.roundedRect(left, currentY, CONTENT_W, cardH, 6).fillColor(BG_LIGHT).fill();
  doc.rect(left, currentY, 4, cardH).fillColor(VIOLET).fill(); // Left accent border

  let py = currentY + 14;
  doc.font("Helvetica-Bold").fontSize(14).fillColor(TEXT_MAIN).text(patient.fullName || "—", left + 16, py);

  py += 26;
  const drawMetas = (items, startX, startY) => {
    let px = startX;
    for (const { label, value, w } of items) {
      doc.font("Helvetica").fontSize(9).fillColor(TEXT_MUTED).text(`${label}:`, px, startY, { continued: true });
      doc.font("Helvetica-Bold").fillColor(TEXT_MAIN).text(` ${value}`);
      px += w;
    }
  };

  drawMetas([
    { label: "Documento", value: patient.document || "—", w: 140 },
    { label: "Edad", value: ageFrom(patient.birthDate), w: 90 },
    { label: "Teléfono", value: patient.phone || "—", w: 140 },
    { label: "Email", value: patient.email || "—", w: 180 },
  ], left + 16, py);

  currentY += cardH + 25;

  // 3. Vital Signs
  if (lastConsult && (lastConsult.temperature || lastConsult.pulse || lastConsult.respiration || lastConsult.sys)) {
    drawSectionTitle("Signos Vitales");
    const chips = [
      { label: "Temp", value: lastConsult.temperature ? `${lastConsult.temperature} °C` : "—" },
      { label: "Pulso", value: lastConsult.pulse ? `${lastConsult.pulse} lpm` : "—" },
      { label: "Resp", value: lastConsult.respiration ? `${lastConsult.respiration} rpm` : "—" },
      { label: "TA", value: (lastConsult.sys || lastConsult.dia) ? `${lastConsult.sys || "—"}/${lastConsult.dia || "—"}` : "—" },
    ];
    let cx = left;
    for (const c of chips) {
      doc.roundedRect(cx, currentY, 115, 26, 4).fillAndStroke(BG_LIGHT, BORDER);
      doc.fillColor(TEXT_MUTED).font("Helvetica").fontSize(9).text(`${c.label}: `, cx + 8, currentY + 7.5, { continued: true });
      doc.fillColor(TEXT_MAIN).font("Helvetica-Bold").text(c.value);
      cx += 130;
    }
    currentY += 26 + 25;
  }

  // 4. Clinical Blocks
  if (patient.eps) {
    drawSectionTitle("Datos Clínicos");
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_MUTED).text(`EPS: `, left, currentY, { continued: true });
    doc.font("Helvetica-Bold").fillColor(TEXT_MAIN).text(patient.eps);
    currentY += 20;
  }

  drawSectionBlock("Alergias", patient.allergies || "—");
  drawSectionBlock("Antecedentes", patient.medicalHistory || "—");

  if (lastConsult) {
    drawSectionBlock("Anamnesis (Última consulta)", lastConsult.anamnesis || "—");
    drawSectionBlock("Diagnóstico", lastConsult.diagnosis || "—");
    drawSectionBlock("Plan de tratamiento", lastConsult.plan || "—");
    drawSectionBlock("Fórmula / Prescripción", lastConsult.prescription || "—");
  }

  // 5. Odontogram
  drawSectionTitle("Odontograma");
  checkPageBreak(120);
  const rows = [
    [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  ];
  const obW = 20, obH = 20, ogapX = 4, ogapY = 24, omidGap = 16;
  const orowW = (8 * obW + 7 * ogapX) * 2 + omidGap;
  const ostartX = left + (CONTENT_W - orowW) / 2;

  for (let r = 0; r < rows.length; r++) {
    let cx = ostartX;
    for (let i = 0; i < rows[r].length; i++) {
      if (i === 8) cx += omidGap;
      const t = String(rows[r][i]);
      const marked = teethSet.has(t);
      doc.roundedRect(cx, currentY, obW, obH, 4).fillAndStroke(marked ? "#DDD6FE" : "#F1F5F9", marked ? VIOLET : BORDER);
      doc.fillColor(marked ? VIOLET : TEXT_MUTED).font("Helvetica-Bold").fontSize(9).text(t, cx, currentY + 6, { width: obW, align: "center" });
      cx += obW + ogapX;
    }
    currentY += obH + ogapY;
  }
  doc.font("Helvetica").fontSize(8).fillColor(TEXT_MUTED).text("Dientes resaltados en violeta tienen un procedimiento registrado.", left, currentY - 10, { align: "center", width: CONTENT_W });
  currentY += 15;

  // 6. Periodontal Exam
  if (patient.periodontalExam) {
    drawSectionBlock("Notas de Examen Periodontal", patient.periodontalExam);
  }

  if (conditions.length > 0) {
    drawSectionTitle("Condiciones por Diente (Examen Periodontal)");
    checkPageBreak(50);

    doc.roundedRect(left, currentY, CONTENT_W, 22, 4).fillColor(BG_LIGHT).fill();
    const tblY = currentY + 6;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT_MUTED);
    doc.text("DIENTE", left + 10, tblY, { width: 50 });
    doc.text("VESTIBULAR", left + 70, tblY, { width: 100 });
    doc.text("PALATINO/LINGUAL", left + 190, tblY, { width: 120 });
    doc.text("MOVILIDAD", left + 330, tblY, { width: 100 });
    currentY += 30;

    doc.font("Helvetica").fontSize(9).fillColor(TEXT_MAIN);
    for (const c of conditions.sort((a, b) => Number(a.tooth) - Number(b.tooth))) {
      if (c.vestibular || c.lingual || c.mobility) {
        checkPageBreak(25);
        const yBase = currentY;
        doc.font("Helvetica-Bold").text(c.tooth, left + 10, yBase, { width: 50 });
        doc.font("Helvetica").text(c.vestibular || "-", left + 70, yBase, { width: 100 });
        doc.text(c.lingual || "-", left + 190, yBase, { width: 120 });
        doc.text(c.mobility || "-", left + 330, yBase, { width: 100 });
        currentY += 18;
        doc.moveTo(left + 10, currentY - 6).lineTo(right - 10, currentY - 6).lineWidth(0.5).strokeColor("#f1f5f9").stroke();
      }
    }
    currentY += 15;
  }

  // 7. Procedures
  drawSectionTitle("Procedimientos Detallados");
  if (byTooth.size === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MUTED).text("No hay procedimientos registrados.", left, currentY);
    currentY += 20;
  } else {
    for (const [tooth, arr] of [...byTooth.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
      checkPageBreak(20);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(VIOLET).text(`Diente ${tooth}:`, left, currentY, { continued: true });
      doc.font("Helvetica").fillColor(TEXT_MAIN).text(` ${arr.join(", ")}`);
      currentY += 18;
    }
    currentY += 10;
  }

  // Footer Pagination
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor(TEXT_MUTED).text(
      `Página ${i + 1} de ${pages.count}`,
      left,
      doc.page.height - 30,
      { align: "center", width: CONTENT_W }
    );
  }

  doc.end();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.document || patientId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
