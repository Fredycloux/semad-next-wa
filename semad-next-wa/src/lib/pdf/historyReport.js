import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { prisma } from "@/lib/prisma";

/* ===== helpers / estilos ===== */
const VIOLET = "#6d28d9";
const LIGHT_BG = "#eef2ff";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";

const fmtDate = (d) => { try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; } };
const ageFrom = (birth) => {
  const b = birth ? new Date(birth) : null;
  if (!b || Number.isNaN(+b)) return "—";
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return `${a} años`;
};
const normSurf = (s = "") => {
  s = String(s).toUpperCase();
  if (["B", "V", "VESTIBULAR", "TOP", "T"].includes(s)) return "B";
  if (["L", "P", "PALATINO", "LINGUAL", "BOT", "BOTTOM"].includes(s)) return "L";
  if (["M", "MESIAL", "LEFT", "IZQ"].includes(s)) return "M";
  if (["D", "DISTAL", "RIGHT", "DER"].includes(s)) return "D";
  return "O";
};

// diente estilo UI (B/L/M/D/O) + número FDI debajo
function drawToothBox(doc, x, y, tooth, fills = {}, { W = 22, H = 18 } = {}) {
  const R = 6;
  doc.save().roundedRect(x, y, W, H, R).lineWidth(1).strokeColor(SLATE_200).stroke();

  const pad = 3;
  const cx = x + W / 2;
  const cy = y + H / 2;
  const w = W - pad * 2;
  const h = H - pad * 2;
  const sw = w * 0.34;
  const sh = h * 0.34;

  const paint = (fx, fy, fw, fh, key) => {
    const color = fills[key] || null;           // usamos el color guardado (idéntico a la UI)
    const stroke = color || SLATE_300;
    doc.save();
    doc.strokeColor(stroke).fillColor(color || "#fff").fillOpacity(color ? 0.18 : 1.0);
    doc.roundedRect(fx, fy, fw, fh, key === "O" ? 4 : 2).fillAndStroke();
    doc.restore();
  };

  paint(x + pad, y + pad, w, sh, "B");                           // B
  paint(x + pad, y + H - pad - sh, w, sh, "L");                  // L
  paint(x + pad, cy - sh / 2, sw, sh, "M");                      // M
  paint(x + W - pad - sw, cy - sh / 2, sw, sh, "D");             // D
  paint(cx - sw / 2, cy - sh / 2, sw, sh, "O");                  // O

  doc.fillColor("#6b7280").font("Helvetica").fontSize(8)
    .text(String(tooth), x, y + H + 2, { width: W, align: "center" });
  doc.restore();
}

/**
 * Genera y devuelve un Response con el PDF de historia/odontograma.
 * Se puede llamar desde cualquier ruta/API.
 */
export async function historyPdfResponse(req, patientId) {
  // 1) datos principales
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      odontogram: true,
      toothConditions: true,
      consultations: { orderBy: { date: "desc" }, take: 1 },
      appointments: { orderBy: { date: "desc" }, take: 5 },
    },
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // 2) procedimientos por diente (desde facturas)
  const invoices = await prisma.invoice.findMany({
    where: { patientId },
    include: { items: { include: { procedure: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });
  const procsByTooth = new Map();
  for (const inv of invoices) {
    for (const it of inv.items) {
      if (!it.tooth) continue;
      const t = String(it.tooth);
      if (!procsByTooth.has(t)) procsByTooth.set(t, new Set());
      procsByTooth.get(t).add(it.procedure?.name || it.name || it.procedureCode);
    }
  }

  // 3) colores de superficies (exactos a la UI)
  const fillMap = {};
  for (const e of patient.odontogram || []) {
    const t = String(e.tooth);
    const s = normSurf(e.surface);
    if (!fillMap[t]) fillMap[t] = {};
    if (e.color) fillMap[t][s] = e.color;
  }

  // 4) PDF Setup with new margins
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
    doc.font("Helvetica-Bold").fontSize(13).fillColor(VIOLET).text(title, left, currentY);
    currentY += 18;
    doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(1).strokeColor(BORDER).stroke();
    currentY += 14;
  };

  const drawSectionBlock = (title, text) => {
    drawSectionTitle(title);
    const h = doc.heightOfString(text || "—", { width: CONTENT_W, align: "justify" });
    checkPageBreak(h + 20);
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MAIN).text(text || "—", left, currentY, { width: CONTENT_W, align: "justify" });
    currentY += h + 24;
  };

  let logoBuf = null;
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(new URL("/logo_semad.png", origin));
    if (res.ok) {
      logoBuf = Buffer.from(await res.arrayBuffer());
    }
  } catch { }

  // 1. Header Logo and Title
  if (logoBuf) {
    doc.image(logoBuf, left, currentY, { height: 45 });
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

  currentY += 60;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(2).strokeColor(VIOLET).stroke();
  currentY += 24;

  // 2. Patient Info Card
  const cardH = 80;
  doc.roundedRect(left, currentY, CONTENT_W, cardH, 8).fillColor(BG_LIGHT).fill();
  doc.rect(left, currentY, 5, cardH).fillColor(VIOLET).fill(); // Left accent border

  let py = currentY + 16;
  doc.font("Helvetica-Bold").fontSize(14).fillColor(TEXT_MAIN).text(patient.fullName || "—", left + 20, py);

  py += 28;
  const drawMetas = (items, startX, startY) => {
    let px = startX;
    for (const { label, value, w } of items) {
      doc.font("Helvetica").fontSize(10).fillColor(TEXT_MUTED).text(`${label}:`, px, startY, { continued: true });
      doc.font("Helvetica-Bold").fillColor(TEXT_MAIN).text(` ${value}`);
      px += w;
    }
  };

  drawMetas([
    { label: "Documento", value: patient.document || "—", w: 140 },
    { label: "Edad", value: ageFrom(patient.birthDate), w: 90 },
    { label: "Teléfono", value: patient.phone || "—", w: 140 },
    { label: "Email", value: patient.email || "—", w: 180 },
  ], left + 20, py);

  currentY += cardH + 32;

  // 3. Clinical Data (EPS, Alergias, Antecedentes)
  drawSectionTitle("Datos Clínicos");
  const epsVal = patient.insurer || patient.eps || patient.EPS || null;
  const antecedentes = patient.medicalHistory ?? patient.medicalBackground ?? patient.background ?? patient.antecedentes ?? patient.history ?? null;

  const drawLine = (lab, val, colW) => {
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MUTED).text(`${lab}:`, left, currentY, { continued: true });
    doc.font("Helvetica-Bold").fillColor(TEXT_MAIN).text(` ${val || "—"}`);
    currentY += 18;
  };

  drawLine("EPS", epsVal);
  drawLine("Alergias", patient.allergies);
  drawLine("Antecedentes", antecedentes);

  const lastC = patient.consultations?.[0] || null;
  doc.font("Helvetica").fillColor(TEXT_MUTED).fontSize(10).text("Última consulta:", left + 300, currentY - (18 * 3));
  doc.font("Helvetica-Bold").fillColor(TEXT_MAIN).text(lastC ? fmtDate(lastC.date) : "—", left + 380, currentY - (18 * 3));

  currentY += 14;

  // 4. Odontograma
  checkPageBreak(150);
  drawSectionTitle("Odontograma");
  currentY += 8;

  const dent = String(patient.dentition || "ADULT").toUpperCase();
  const rows = dent === "CHILD"
    ? [
      ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
      ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
    ]
    : [
      ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
      ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
    ];

  const stepX = 30; // Spacing logic identical to UI but slightly airier
  const stepY = 46;
  const boxSize = { W: 24, H: 20 };
  const midGap = 12;

  const rowPixelWidth = (nums) => nums.length * boxSize.W + (nums.length - 1) * (stepX - boxSize.W) + midGap;
  const widest = Math.max(...rows.map(rowPixelWidth));
  const startX = left + Math.max(0, (CONTENT_W - widest) / 2);

  rows.forEach((nums, r) => {
    const rowY = currentY + r * stepY;
    let x = startX;
    const midIndex = Math.floor((nums.length - 1) / 2);
    nums.forEach((n, i) => {
      drawToothBox(doc, x, rowY, n, fillMap[n] || {}, boxSize);
      x += stepX;
      if (i === midIndex) x += midGap;
    });
  });

  currentY += rows.length * stepY + 16;

  // Legend
  doc.font("Helvetica").fontSize(8).fillColor(TEXT_MUTED).text(
    "Cuadros internos representan las superficies: V/B (arriba), P/L (abajo), M (centro izq), D (centro der), O (central).",
    left, currentY, { align: "center", width: CONTENT_W }
  );
  currentY += 24;

  // 5. Examen Periodontal & Tooth Conditions
  if (patient.periodontalExam) {
    drawSectionBlock("Examen Periodontal", patient.periodontalExam);
  }

  if (patient.toothConditions?.length > 0) {
    drawSectionTitle("Condiciones por Diente (Examen Periodontal)");
    checkPageBreak(50);

    doc.roundedRect(left, currentY, CONTENT_W, 24, 6).fillColor(BG_LIGHT).fill();
    const tblY = currentY + 8;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT_MUTED);
    doc.text("Diente", left + 16, tblY, { width: 50 });
    doc.text("Vestibular", left + 80, tblY, { width: 100 });
    doc.text("Palatino/Lingual", left + 200, tblY, { width: 120 });
    doc.text("Movilidad", left + 340, tblY, { width: 100 });
    currentY += 34;

    doc.font("Helvetica").fontSize(9).fillColor(TEXT_MAIN);
    for (const c of patient.toothConditions.sort((a, b) => Number(a.tooth) - Number(b.tooth))) {
      if (c.vestibular || c.lingual || c.mobility) {
        checkPageBreak(25);
        const yBase = currentY;
        doc.font("Helvetica-Bold").text(c.tooth, left + 16, yBase, { width: 50 });
        doc.font("Helvetica").text(c.vestibular || "-", left + 80, yBase, { width: 100 });
        doc.text(c.lingual || "-", left + 200, yBase, { width: 120 });
        doc.text(c.mobility || "-", left + 340, yBase, { width: 100 });
        currentY += 18;
        doc.moveTo(left + 16, currentY - 6).lineTo(right - 16, currentY - 6).lineWidth(0.5).strokeColor(BORDER).stroke();
      }
    }
    currentY += 16;
  }

  // 6. Procedimientos por diente
  drawSectionTitle("Procedimientos por diente (según facturación)");
  const entries = [...procsByTooth.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  if (entries.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MUTED).text("No hay procedimientos registrados.", left, currentY);
    currentY += 24;
  } else {
    for (const [t, set] of entries) {
      checkPageBreak(20);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(VIOLET).text(`Diente ${t}: `, left, currentY, { continued: true });
      doc.font("Helvetica").fillColor(TEXT_MAIN).text([...set].join(", "));
      currentY += 20;
    }
    currentY += 12;
  }

  // 7. Citas
  drawSectionTitle("Historial de Citas");
  if (!patient.appointments?.length) {
    doc.font("Helvetica").fontSize(10).fillColor(TEXT_MUTED).text("No hay citas registradas.", left, currentY);
    currentY += 24;
  } else {
    for (const a of patient.appointments) {
      checkPageBreak(20);
      const status = a.status ? ` · ${a.status}` : "";
      doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT_MAIN).text(`${fmtDate(a.date)}`, left, currentY, { width: 150 });
      doc.font("Helvetica").fillColor(TEXT_MUTED).text(`— ${a.reason || "—"}${status}`, left + 160, currentY, { width: CONTENT_W - 160 });
      currentY += 20;
    }
    currentY += 12;
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
