// runtime + caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

// ---------- helpers ----------
const PURPLE = "#7c3aed";
const LIGHT_PURPLE = "#ede9fe";

function ageFrom(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "—";
  const now = new Date();
  let a = now.getFullYear() - dt.getFullYear();
  const m = now.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) a--;
  return `${a} años`;
}

function fmtDate(dt) {
  try { return new Date(dt).toLocaleString("es-CO"); } catch { return "—"; }
}

function textLabel(doc, label, value, x, y, w) {
  doc.font("Helvetica-Bold").fillColor("#111").fontSize(10).text(label, x, y);
  doc.font("Helvetica").fillColor("#1f2937").fontSize(10).text(value ?? "—", x + 68, y, { width: w - 68 });
}

function drawToothBox(doc, x, y, label, surfaces = {}) {
  const W = 28, H = 24, R = 6;
  // borde
  doc.save()
     .roundedRect(x, y, W, H, R).lineWidth(1).strokeColor(PURPLE).stroke();

  // mini-superficies (V,O,L,M,D) en cruz:
  const pad = 4;
  const cx = x + W/2, cy = y + H/2;
  const w = (W - pad*2), h = (H - pad*2);
  const sw = w * 0.34, sh = h * 0.34;

  const fills = {
    // Vestibular (arriba)
    V: [cx - sw/2, y + pad, sw, sh],
    // Oclusal (centro)
    O: [cx - sw/2, cy - sh/2, sw, sh],
    // Lingual/palatina (abajo)
    L: [cx - sw/2, y + H - pad - sh, sw, sh],
    // Mesial (izquierda)
    M: [x + pad, cy - sh/2, sw, sh],
    // Distal (derecha)
    D: [x + W - pad - sw, cy - sh/2, sw, sh],
  };

  Object.entries(surfaces).forEach(([s, color]) => {
    const rect = fills[s];
    if (!rect) return;
    doc.save()
      .fillColor(color || LIGHT_PURPLE)
      .roundedRect(rect[0], rect[1], rect[2], rect[3], 3)
      .fill()
      .restore();
  });

  // etiqueta (número FDI) bajo el diente
  doc.fillColor("#6b7280").font("Helvetica").fontSize(8)
     .text(String(label), x, y + H + 2, { width: W, align: "center" });

  doc.restore();
}

export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return new Response("ID inválido", { status: 400 });

    // Datos del paciente + odontograma + consultas + citas
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        odontogram: true,
        consultations: { orderBy: { date: "desc" }, take: 1 },
        appointments: { orderBy: { date: "desc" }, take: 5 },
      },
    });
    if (!patient) return new Response("Paciente no encontrado", { status: 404 });

    // Items de facturas para "procedimientos por diente" con NOMBRES
    const invoices = await prisma.invoice.findMany({
      where: { patientId: id },
      select: { items: { select: { tooth: true, procedure: { select: { name: true } } } } },
      orderBy: { date: "desc" },
      take: 200,
    });

    const byTooth = new Map(); // tooth -> Set(names)
    invoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!it.tooth) return;
        const t = String(it.tooth);
        if (!byTooth.has(t)) byTooth.set(t, new Set());
        if (it.procedure?.name) byTooth.get(t).add(it.procedure.name);
      });
    });

    // Odontograma: superficies por diente
    // Guardamos { tooth: {V: color, O: color, L: color, M: color, D: color} }
    const surfMap = {};
    (patient.odontogram || []).forEach(o => {
      const t = String(o.tooth);
      const s = (o.surface || "O").toUpperCase();
      if (!surfMap[t]) surfMap[t] = {};
      surfMap[t][s] = o.color || LIGHT_PURPLE;
    });

    // PDF
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const stream = new PassThrough();
    doc.pipe(stream);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // ---------- Título ----------
    doc.fillColor(PURPLE).font("Helvetica-Bold").fontSize(20)
       .text("Reporte de Historia Clínica / Odontograma", left, 28);

    // ---------- Cabecera (dos tarjetas) ----------
    const cardY = 64;
    const cardH = 64;
    const cardW = (width - 16) * 0.62;  // izquierda
    const card2W = (width - 16) * 0.38; // derecha

    // tarjeta paciente
    doc.roundedRect(left, cardY, cardW, cardH, 10).lineWidth(1).strokeColor(PURPLE).stroke();
    textLabel(doc, "Paciente:", patient.fullName || "—", left + 10, cardY + 10, cardW - 20);
    textLabel(doc, "Documento:", patient.document || "—", left + 10, cardY + 26, cardW - 20);
    textLabel(doc, "Teléfono:", patient.phone || "—", left + 10, cardY + 42, (cardW - 20) / 2);
    const dob = patient.birthDate || patient.birthdate || patient.dob || patient.dateOfBirth;
    textLabel(doc, "Edad:", ageFrom(dob), left + cardW/2, cardY + 42, (cardW/2) - 12);

    // tarjeta fecha (derecha)
    const rX = left + cardW + 16;
    doc.save()
       .roundedRect(rX, cardY, card2W, cardH, 10)
       .fillOpacity(1).fill(LIGHT_PURPLE)
       .fillOpacity(1).strokeColor(PURPLE).lineWidth(1).stroke()
       .restore();
    doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(11)
       .text("Fecha de reporte", rX + 12, cardY + 10);
    doc.font("Helvetica").fillColor("#111827").fontSize(11)
       .text(fmtDate(new Date()), rX + 12, cardY + 28);

    // email pequeño arriba a la derecha de la tarjeta 1
    doc.font("Helvetica").fillColor("#6b7280").fontSize(10)
       .text(patient.email || " ", left + cardW - 220, cardY + 10, { width: 210, align: "right" });

    // ---------- Odontograma ----------
    let y = cardY + cardH + 24;
    doc.moveTo(left, y - 10).lineTo(right, y - 10).lineWidth(0.6).strokeColor(LIGHT_PURPLE).stroke();
    doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(12).text("Odontograma", left, y - 4);
    y += 12;

    const gapX = 12, gapY = 20;
    const cols = 8;
    const cellW = 28, cellH = 24;
    const rowWidth = cols * cellW + (cols - 1) * gapX;
    const startX = left + Math.max(0, (width - rowWidth) / 2);

    // orden tipo UI (adulto): 11–18, 21–28, 41–48, 31–38
    const rows = [
      ["11","12","13","14","15","16","17","18"],
      ["21","22","23","24","25","26","27","28"],
      ["41","42","43","44","45","46","47","48"],
      ["31","32","33","34","35","36","37","38"],
    ];

    rows.forEach((nums, r) => {
      const rowY = y + r * (cellH + 16 + gapY);
      nums.forEach((n, c) => {
        const x = startX + c * (cellW + gapX);
        drawToothBox(doc, x, rowY, n, surfMap[n]);
      });
    });

    y += rows.length * (cellH + 16 + gapY) + 10;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.6).strokeColor(LIGHT_PURPLE).stroke();
    y += 12;

    // ---------- Datos clínicos ----------
    doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(12).text("Datos clínicos", left, y);
    y += 6;
    doc.font("Helvetica").fillColor("#111827").fontSize(10);
    const line = (label, value) => {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value || "—");
    };
    line("EPS", patient.eps);
    line("Alergias", patient.allergies);
    line("Antecedentes", patient.medicalHistory || patient.background || patient.antecedents);

    // última consulta (si existe)
    const lastC = patient.consultations?.[0];
    if (lastC) {
      y = doc.y + 8;
      doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(12).text("Última consulta", left, y);
      y = doc.y + 2;
      doc.font("Helvetica").fillColor("#111827").fontSize(10)
        .text(`${fmtDate(lastC.date)} · ${lastC.diagnosis || "—"}`);
      if (lastC.anamnesis) doc.text(`Anamnesis: ${lastC.anamnesis}`);
      if (lastC.evolution)  doc.text(`Evolución: ${lastC.evolution}`);
      if (lastC.prescription) doc.text(`Fórmula: ${lastC.prescription}`);
    }

    y = doc.y + 10;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.6).strokeColor(LIGHT_PURPLE).stroke();
    y += 12;

    // ---------- Procedimientos por diente (nombres) ----------
    doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(12)
       .text("Procedimientos por diente (según facturación)", left, y);
    y = doc.y + 4;
    doc.font("Helvetica").fillColor("#111827").fontSize(10);
    if (byTooth.size === 0) {
      doc.text("—");
    } else {
      // ordenar por número de diente
      [...byTooth.entries()]
        .sort((a,b) => Number(a[0]) - Number(b[0]))
        .forEach(([t, set]) => {
          const names = [...set].join(", ");
          doc.text(`${t}: ${names}`);
        });
    }

    y = doc.y + 10;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.6).strokeColor(LIGHT_PURPLE).stroke();
    y += 12;

    // ---------- Citas ----------
    doc.font("Helvetica-Bold").fillColor(PURPLE).fontSize(12).text("Citas", left, y);
    y = doc.y + 4;
    doc.font("Helvetica").fillColor("#111827").fontSize(10);
    if (!patient.appointments?.length) {
      doc.text("—");
    } else {
      patient.appointments.slice(0, 5).forEach(a => {
        doc.text(`${fmtDate(a.date)} — ${a.reason || "—"}${a.status ? ` · ${a.status}` : ""}`);
      });
    }

    doc.end();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="historia-${patient.document || patient.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(`Error: ${e.message || e}`, { status: 500 });
  }
}
