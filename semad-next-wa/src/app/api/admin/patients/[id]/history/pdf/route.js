import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------- helpers / estilos --------------------------- */
const VIOLET = "#6d28d9";
const LIGHT_BG = "#eef2ff";
const SLATE_200 = "#E5E7EB";
const SLATE_300 = "#CBD5E1";

const fmtDate = (d) => {
  try { return new Date(d).toLocaleString("es-CO"); } catch { return "—"; }
};

const ageFrom = (birth) => {
  const b = birth ? new Date(birth) : null;
  if (!b || Number.isNaN(+b)) return "—";
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return `${a} años`;
};

// normaliza superficies a las claves de tu UI
const normSurf = (s = "") => {
  s = String(s).toUpperCase();
  if (["B","V","VESTIBULAR","TOP","T"].includes(s)) return "B";
  if (["L","P","PALATINO","LINGUAL","BOT","BOTTOM"].includes(s)) return "L";
  if (["M","MESIAL","LEFT","IZQ"].includes(s)) return "M";
  if (["D","DISTAL","RIGHT","DER"].includes(s)) return "D";
  return "O";
};

// diente estilo UI (B/L/M/D/O) + número FDI debajo
function drawToothBox(doc, x, y, tooth, fills = {}, { W = 26, H = 22 } = {}) {
  const R = 6;
  doc.save().roundedRect(x, y, W, H, R).lineWidth(1).strokeColor(SLATE_200).stroke();

  const pad = 3;
  const cx = x + W / 2;
  const cy = y + H / 2;
  const w = W - pad * 2;
  const h = H - pad * 2;
  const sw = w * 0.34;
  const sh = h * 0.34;

  // helper
  const paint = (fx, fy, fw, fh, key) => {
    // **IMPORTANTE**: usamos SOLO el color guardado para que coincida con la UI
    const color = fills[key] || null;
    const stroke = color || SLATE_300;
    doc.save();
    doc.strokeColor(stroke).fillColor(color || "#fff").fillOpacity(color ? 0.18 : 1.0);
    doc.roundedRect(fx, fy, fw, fh, key === "O" ? 4 : 2).fillAndStroke();
    doc.restore();
  };

  // B (arriba)
  paint(x + pad, y + pad, w, sh, "B");
  // L (abajo)
  paint(x + pad, y + H - pad - sh, w, sh, "L");
  // M (izquierda)
  paint(x + pad, cy - sh / 2, sw, sh, "M");
  // D (derecha)
  paint(x + W - pad - sw, cy - sh / 2, sw, sh, "D");
  // O (centro)
  paint(cx - sw / 2, cy - sh / 2, sw, sh, "O");

  // número FDI debajo
  doc.fillColor("#6b7280").font("Helvetica").fontSize(8)
     .text(String(tooth), x, y + H + 2, { width: W, align: "center" });
  doc.restore();
}

/* --------------------------------- GET ---------------------------------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return new Response("ID inválido", { status: 400 });

    // datos principales
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        odontogram: true,
        consultations: { orderBy: { date: "desc" }, take: 1 },
        appointments: { orderBy: { date: "desc" }, take: 5 },
      }
    });
    if (!patient) return new Response("Paciente no encontrado", { status: 404 });

    // nombres de procedimientos por diente (desde facturas)
    const invoices = await prisma.invoice.findMany({
      where: { patientId: id },
      include: { items: { include: { procedure: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
    const procsByTooth = new Map(); // tooth -> Set(names)
    for (const inv of invoices) {
      for (const it of inv.items) {
        if (!it.tooth) continue;
        const t = String(it.tooth);
        if (!procsByTooth.has(t)) procsByTooth.set(t, new Set());
        procsByTooth.get(t).add(it.procedure?.name || it.name || it.procedureCode);
      }
    }

    // mapa de superficies: { [tooth]: {B|L|M|D|O: "#hex"} }
    const fillMap = {};
    for (const e of patient.odontogram || []) {
      const t = String(e.tooth);
      const s = normSurf(e.surface);
      if (!fillMap[t]) fillMap[t] = {};
      if (e.color) fillMap[t][s] = e.color; // usamos el color de la UI
    }

    // ---------- PDF ----------
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
        doc.image(buf, left, 28, { width: 120 }); // Bajado 10px
      }
    } catch {}

    // Título
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(22)
       .text("Reporte de Historia Clínica / Odontograma", left + 140, 34); // Bajado 10px

    // Odontograma
    let y = 108; // Bajado 40px
    doc.moveTo(left, y).lineTo(right, y).strokeColor(SLATE_200).lineWidth(1).stroke();
    y += 10;
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(14).text("Odontograma", left, y);
    y += 8;

    // FDI adulto (orden visual UI)
    const rows = [
      ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"],
      ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"],
    ];
    const stepX = 34;              // separación horizontal
    const stepY = 52;              // separación vertical
    const boxSize = { W: 26, H: 22 };

    // centrar 16 columnas
    const rowWidth = 16 * boxSize.W + 15 * (stepX - boxSize.W);
    const startX = left + Math.max(0, (width - rowWidth) / 2);

    rows.forEach((nums, r) => {
      const rowY = y + r * stepY;
      let x = startX;
      nums.forEach((n, i) => {
        drawToothBox(doc, x, rowY, n, fillMap[n] || {}, boxSize);
        x += stepX;
        if (i === 7) x += 10; // pequeño gap central
      });
    });

    y += rows.length * stepY + 8;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(SLATE_200).lineWidth(1).stroke();
    y += 10;

    // Datos clínicos
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", left, y);
    y = doc.y + 4;

    const epsVal = patient.insurer || patient.eps || patient.EPS || null;
    const antecedentes =
      patient.medicalHistory ??
      patient.medicalBackground ??
      patient.background ??
      patient.antecedentes ??
      patient.history ??
      null;

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

    // Procedimientos por diente (nombres)
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13)
       .text("Procedimientos por diente (según facturación)", left, doc.y);
    doc.moveDown(0.4);
    doc.font("Helvetica").fillColor("#000").fontSize(11);
    const entries = [...procsByTooth.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    if (entries.length === 0) {
      doc.text("—", left, doc.y);
    } else {
      for (const [t, set] of entries) {
        doc.text(`${t}: ${[...set].join(", ")}`, left, doc.y, { width });
      }
    }
    doc.moveDown(0.8);

    // Citas
    doc.fillColor(VIOLET).font("Helvetica-Bold").fontSize(13).text("Citas", left, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor("#000").fontSize(11);
    if (!patient.appointments?.length) {
      doc.text("—", left, doc.y);
    } else {
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
  } catch (e) {
    return new Response(`Error: ${e.message || e}`, { status: 500 });
  }
}
