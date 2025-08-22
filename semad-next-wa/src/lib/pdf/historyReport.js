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
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B";
  if (["L","P","PALATINO","LINGUAL","BOT","BOTTOM"].includes(s)) return "L";
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";
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

  // 4) PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // Logo (opcional)
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(new URL("/logo_semad.png", origin));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      doc.image(buf, left, 18, { width: 120 });
    }
  } catch {}

  // Título (bajado y con salto de línea controlado)
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
     .text("Reporte de Historia Clínica /", left + 140, 26, { width: width - 160 })
     .moveDown(0.1)
     .text("Odontograma", { continued: false });

  /* Tarjetas */
  const titleBottom = doc.y;               // fin real del título
  let cardY = Math.max(108, titleBottom + 20); // antes: 68. Ahora más abajo
  const cardH = 82;
  const gap = 16;
  const cardW = Math.round((width - gap) * 0.58);
  const card2W = (width - gap) - cardW;

  // Paciente
  doc.roundedRect(left, cardY, cardW, cardH, 12).strokeColor(VIOLET).lineWidth(1).stroke();
  const L1 = left + 12;
  const label = (lab, y) => doc.font("Helvetica-Bold").fontSize(11).fillColor("#000").text(`${lab}:`, L1, y);
  const value = (val, y) => doc.font("Helvetica").fontSize(11).text(val || "—", L1 + 100, y, { width: cardW - 122 });
  label("Paciente",   cardY + 12); value(patient.fullName, cardY + 10);
  label("Documento",  cardY + 30); value(patient.document,  cardY + 28);
  label("Teléfono",   cardY + 48); value(patient.phone,     cardY + 46);
  label("Email",      cardY + 66); value(patient.email,     cardY + 64);

  // Fecha + Edad
  const rX = left + cardW + gap;
  doc.roundedRect(rX, cardY, card2W, cardH, 12).fillAndStroke(LIGHT_BG, VIOLET);
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(12).text("Fecha de reporte", rX + 12, cardY + 12);
  doc.fillColor("#000").font("Helvetica").fontSize(12).text(fmtDate(new Date()), rX + 12, cardY + 30);
  doc.font("Helvetica-Bold").text("Edad:", rX + 12, cardY + 52);
  const dob = patient.birthDate || patient.birthdate || patient.dob || patient.dateOfBirth;
  doc.font("Helvetica").text(ageFrom(dob), rX + 60, cardY + 52);

  /* Odontograma */
  let y = cardY + cardH + 32;                 // margen superior
  doc.moveTo(left, y).lineTo(right, y).strokeColor(SLATE_200).lineWidth(1).stroke();
  y += 14;
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", left, y);
  y += 16;

    // Adulto vs Niño (FDI)
  const dent = String(patient.dentition || "ADULT").toUpperCase();
  const rows =
    dent === "CHILD"
      ? [
          // TOP infantil
          ["55","54","53","52","51","61","62","63","64","65"],
          // BOTTOM infantil
          ["85","84","83","82","81","71","72","73","74","75"],
        ]
      : [
          // TOP adulto
          ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"],
          // BOTTOM adulto
          ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"],
        ];

 // Tamaños y espaciados (un poco más compacto para centrar mejor)
  const stepX = 28;                 // separación horizontal
  const stepY = 40;                 // separación vertical
  const boxSize = { W: 22, H: 18 }; // tamaño de cada “diente”
  const midGap = 8;                 // gap al pasar la línea media

  // Ancho de fila (considera el gap central)
  const rowPixelWidth = (nums) =>
    nums.length * boxSize.W + (nums.length - 1) * (stepX - boxSize.W) + midGap;

  const widest = Math.max(...rows.map(rowPixelWidth));
  const startX = left + Math.max(0, (width - widest) / 2);

  // Dibujo centrado con gap en la mitad (entre 51|61 o 11|21)
  rows.forEach((nums, r) => {
    const rowY = y + r * stepY;
    let x = startX;
    const midIndex = Math.floor((nums.length - 1) / 2); // 7 en adulto, 4 en niño
    nums.forEach((n, i) => {
      drawToothBox(doc, x, rowY, n, fillMap[n] || {}, boxSize);
      x += stepX;
      if (i === midIndex) x += midGap; // pequeño espacio en la línea media
    });
  });

  y += rows.length * stepY + 14; // margen inferior del bloque
  doc.moveTo(left, y).lineTo(right, y).strokeColor(SLATE_200).lineWidth(1).stroke();
  y += 12;

  /* Datos clínicos */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Datos clínicos", left, y);
  y = doc.y + 4;
  const epsVal = patient.insurer || patient.eps || patient.EPS || null;
  const antecedentes =
    patient.medicalHistory ?? patient.medicalBackground ?? patient.background ??
    patient.antecedentes ?? patient.history ?? null;

  const colW = Math.floor(width / 2) - 8;
  const col2X = left + colW + 16;
  const drawLine = (lab, val, x0, y0) => {
    doc.font("Helvetica-Bold").fillColor("#6b7280").fontSize(11).text(`${lab}:`, x0, y0, { continued: true });
    doc.font("Helvetica").fillColor("#000").text(` ${val || "—"}`);
  };
  drawLine("EPS", epsVal, left, y);
  drawLine("Alergias", patient.allergies, left, y + 18);
  drawLine("Antecedentes", antecedentes, left, y + 36);

  const lastC = patient.consultations?.[0] || null;
  doc.font("Helvetica-Bold").fillColor("#6b7280").fontSize(11).text("Última consulta:", col2X, y);
  doc.font("Helvetica").fillColor("#000").text(lastC ? fmtDate(lastC.date) : "—", col2X + 110, y);
  doc.y = y + 56;

  /* Procedimientos por diente */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14)
     .text("Procedimientos por diente (según facturación)", left, doc.y);
  doc.moveDown(0.4);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  const entries = [...procsByTooth.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  if (entries.length === 0) doc.text("—", left, doc.y);
  else {
    for (const [t, set] of entries) doc.text(`${t}: ${[...set].join(", ")}`, left, doc.y, { width });
  }
  doc.moveDown(0.8);

  /* Citas */
  doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Citas", left, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica").fillColor("#000").fontSize(11);
  if (!patient.appointments?.length) doc.text("—", left, doc.y);
  else {
    for (const a of patient.appointments) {
      const status = a.status ? ` · ${a.status}` : "";
      doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${status}`, left, doc.y, { width });
    }
  }

  doc.end();
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.document || patient.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
