// src/app/api/admin/patients/[id]/history/pdf/route.js
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ageFrom(birthdate) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (isNaN(d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

// grises lindos + morado de marca
const COLOR = {
  primary: "#7C3AED",
  primarySoft: "#EDE9FE",
  line: "#E5E7EB",
  textMuted: "#6B7280",
  text: "#111827",
};

const ADULT_TOP    = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const ADULT_BOTTOM = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];
const SURFACES = ["O", "M", "D", "B", "L"];

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  // --- Carga de datos ---
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      // marcas del odontograma guardadas desde tu componente
      odontogram: true,
      // últimas consultas para mostrar fecha
      consultations: { orderBy: { date: "desc" }, take: 1 },
      // facturas -> items -> procedimiento (para listarlo por NOMBRE)
      invoices: {
        orderBy: { date: "desc" },
        select: {
          items: { select: { tooth: true, procedure: { select: { name: true } } } },
        },
      },
      // citas
      appointments: { orderBy: { date: "desc" } },
    },
  });

  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // Mapas auxiliares
  const marks = new Map(
    (patient.odontogram ?? []).map(e => {
      const s = (e.surface || "O").toUpperCase();
      return [`${e.tooth}|${s}`, { ...e, surface: s }];
    })
  );

  const procsByTooth = new Map();
  for (const inv of patient.invoices ?? []) {
    for (const it of inv.items ?? []) {
      if (!it?.tooth || !it?.procedure?.name) continue;
      const arr = procsByTooth.get(it.tooth) ?? [];
      arr.push(it.procedure.name);
      procsByTooth.set(it.tooth, Array.from(new Set(arr))); // únicos
    }
  }

  const ultimaConsulta = patient.consultations?.[0]?.date ?? null;

  const antecedentes =
    patient.background ||
    patient.medicalBackground ||
    patient.history ||
    patient.antecedents ||
    "—";

  const edad = ageFrom(patient.birthdate);

  // --- PDF ---
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // logo
  try {
    const r = await fetch(new URL("/logo_semad.png", req.nextUrl.origin));
    if (r.ok) {
      const logoBuf = Buffer.from(await r.arrayBuffer());
      doc.image(logoBuf, left, 30, { width: 110 });
    }
  } catch {}

  // título
  doc
    .fillColor(COLOR.primary)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("Reporte de Historia Clínica / Odontograma", left + 130, 36, {
      width: width - 130,
    })
    .moveDown(0.6);

  // tarjetas cabecera
  const cardH = 70;
  const gap = 16;
  const cardW = (width - gap) / 2;

  // Paciente
  doc
    .roundedRect(left, 90, cardW, cardH, 12)
    .strokeColor(COLOR.primary)
    .lineWidth(1)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fillColor(COLOR.text)
    .fontSize(11)
    .text("Paciente:", left + 12, 100);
  doc
    .font("Helvetica")
    .text(patient.fullName || "—", left + 90, 100, { width: cardW - 100 });

  doc.font("Helvetica-Bold").text("Documento:", left + 12, 118);
  doc.font("Helvetica").text(patient.document || "—", left + 90, 118);

  doc.font("Helvetica-Bold").text("Teléfono:", left + 12, 136);
  doc.font("Helvetica").text(patient.phone || "—", left + 90, 136);

  // añadimos el email en la misma ficha
  doc.font("Helvetica-Bold").text("Email:", left + 12, 154);
  doc
    .font("Helvetica")
    .text(patient.email || "—", left + 90, 154, { width: cardW - 100 });

  // Fecha reporte + Edad
  const cardX2 = left + cardW + gap;
  doc
    .roundedRect(cardX2, 90, cardW, cardH, 12)
    .fillOpacity(1)
    .fill(COLOR.primarySoft)
    .fillOpacity(1)
    .strokeColor(COLOR.primary)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(COLOR.primary)
    .font("Helvetica-Bold")
    .text("Fecha de reporte", cardX2 + 12, 104);
  doc
    .fillColor(COLOR.text)
    .font("Helvetica")
    .text(new Date().toLocaleString("es-CO"), { width: cardW - 24, align: "left" })
    .moveDown(0.2);

  doc
    .fillColor(COLOR.primary)
    .font("Helvetica-Bold")
    .text("Edad:", cardX2 + 12, 136);
  doc
    .fillColor(COLOR.text)
    .font("Helvetica")
    .text(edad != null ? `${edad} años` : "—", cardX2 + 60, 136);

  // separador
  let y = 90 + cardH + 22;
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .strokeColor(COLOR.line)
    .lineWidth(1)
    .stroke();

  y += 12;

  // --- Odontograma ---
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLOR.text)
    .text("Odontograma", left, y);
  y += 12;

  // tamaño automático para 16 columnas
  const cols = 16;
  const innerW = width;
  const tileGap = 6;
  const tileSize = Math.floor((innerW - (cols - 1) * tileGap) / cols); // ~22–26 px
  const rowH = tileSize + 16; // deja espacio para número FDI
  const startX = left;

  const drawTooth = (tooth, x, yy) => {
    const pad = 2;
    const w = tileSize;
    const h = tileSize;
    const center = Math.round(w * 0.38);
    const side = Math.round((w - center - pad * 2) / 2);
    const cx = x + (w - center) / 2;
    const cy = yy + (h - center) / 2;

    const fill = (surf) => {
      const e = marks.get(`${tooth}|${surf}`);
      return e ? `${(e.color || COLOR.primary)}22` : "#fff";
    };
    const stroke = (surf) => {
      const e = marks.get(`${tooth}|${surf}`);
      return e ? (e.color || COLOR.primary) : COLOR.line;
    };

    // marco
    doc.roundedRect(x + 0.5, yy + 0.5, w - 1, h - 1, 6).strokeColor(COLOR.line).stroke();

    // B y L
    doc.rect(x + pad, yy + pad, w - pad * 2, side).fillAndStroke(fill("B"), stroke("B"));
    doc
      .rect(x + pad, yy + h - pad - side, w - pad * 2, side)
      .fillAndStroke(fill("L"), stroke("L"));

    // M y D
    doc.rect(x + pad, cy, side, center).fillAndStroke(fill("M"), stroke("M"));
    doc.rect(x + w - pad - side, cy, side, center).fillAndStroke(fill("D"), stroke("D"));

    // O
    doc
      .roundedRect(cx, cy, center, center, 4)
      .fillAndStroke(fill("O"), stroke("O"));

    // número FDI centrado abajo
    doc
      .fillColor(COLOR.textMuted)
      .font("Helvetica")
      .fontSize(8)
      .text(tooth, x, yy + h + 3, { width: w, align: "center" });
  };

  const drawRow = (teeth, yRow) => {
    for (let i = 0; i < teeth.length; i++) {
      const x = startX + i * (tileSize + tileGap);
      drawTooth(teeth[i], x, yRow);
    }
  };

  y += 6;
  drawRow(ADULT_TOP, y);
  y += rowH + 10;
  drawRow(ADULT_BOTTOM, y);
  y += rowH + 10;

  // --- Datos clínicos ---
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLOR.primary)
    .text("Datos clínicos", left, y);
  y += 8;

  const colW2 = (width - 20) / 2;
  const col2X = left + colW2 + 20;
  const line = (label, value, xx, yy) => {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text(label, xx, yy);
    doc.font("Helvetica").fillColor(COLOR.text).text(value ?? "—", xx + 90, yy, {
      width: colW2 - 90,
    });
  };

  line("EPS:", patient.insurer || "—", left, y);
  line("Alergias:", patient.allergies || "—", left, y + 18);
  line("Antecedentes:", antecedentes || "—", left, y + 36);

  line("Email:", patient.email || "—", col2X, y);
  line(
    "Última consulta:",
    ultimaConsulta ? new Date(ultimaConsulta).toLocaleString("es-CO") : "—",
    col2X,
    y + 18
  );

  y += 36 + 28;

  // --- Procedimientos por diente ---
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .strokeColor(COLOR.line)
    .lineWidth(1)
    .stroke();
  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLOR.primary)
    .text("Procedimientos por diente (según facturación)", left, y);
  y += 14;

  doc.font("Helvetica").fillColor(COLOR.text);
  if (procsByTooth.size === 0) {
    doc.text("—", left, y);
  } else {
    const keys = Array.from(procsByTooth.keys()).sort((a, b) => Number(a) - Number(b));
    for (const k of keys) {
      const list = procsByTooth.get(k).join(", ");
      doc.text(`${k}: ${list}`, left, y, { width, continued: false });
      y += 14;
    }
  }

  y += 8;

  // --- Citas ---
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .strokeColor(COLOR.line)
    .lineWidth(1)
    .stroke();
  y += 10;

  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR.primary).text("Citas", left, y);
  y += 14;

  const citas = patient.appointments ?? [];
  if (citas.length === 0) {
    doc.font("Helvetica").fillColor(COLOR.text).text("—", left, y);
  } else {
    for (const ap of citas) {
      const lineTxt = `${new Date(ap.date).toLocaleString("es-CO")} — ${ap.reason || "—"}${
        ap.status ? ` · ${ap.status}` : ""
      }`;
      doc.font("Helvetica").fillColor(COLOR.text).text(lineTxt, left, y, { width });
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
