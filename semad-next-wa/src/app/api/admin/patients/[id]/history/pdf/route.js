import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ageFrom(dob) {
  if (!dob) return "—";
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return `${y} años`;
}

function drawTag(doc, x, y, w, h, label, value) {
  const radius = 10;
  doc.save()
    .lineJoin("round")
    .lineWidth(1)
    .strokeColor("#7C3AED") // violeta
    .roundedRect(x, y, w, h, radius)
    .stroke();
  doc.fill("#7C3AED").font("Helvetica-Bold").fontSize(11).text(label, x + 14, y + 10);
  doc.fill("#111").font("Helvetica").fontSize(12).text(value ?? "—", x + 14, y + 30);
  doc.restore();
}

// Odontograma “compacto”: 32 dientes adultos (4×8). Si hay registro en ese diente, lo rellenamos con su color.
function drawOdontogram(doc, x, y, entries, title = "Odontograma") {
  const violet = "#7C3AED";
  const toothW = 36, toothH = 28, gap = 12;
  const cols = 8;

  doc.fill(violet).font("Helvetica-Bold").fontSize(13).text(title, x, y);
  y += 12;

  const map = new Map(); // tooth -> color
  (entries || []).forEach(e => {
    const key = String(e.tooth);
    if (!map.has(key)) map.set(key, e.color || "#E5E7EB");
  });

  // fila superior (18..11 | 21..28) → representamos como 11..18 para lectura izquierda->derecha
  const topRow = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
  const bottomRow = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

  let cx = x, cy = y + 16;
  const paintRow = (row) => {
    cx = x;
    for (let i=0;i<row.length;i++){
      const t = row[i];
      const color = map.get(String(t));
      // caja
      doc.save()
         .lineWidth(1)
         .strokeColor(violet)
         .roundedRect(cx, cy, toothW, toothH, 6)
         .stroke();
      if (color){
        doc.fillOpacity(0.25).fill(color).roundedRect(cx, cy, toothW, toothH, 6).fill();
        doc.fillOpacity(1);
      }
      // numerito
      doc.fill("#6B7280").font("Helvetica").fontSize(8)
         .text(String(t), cx + toothW/2 - 6, cy + toothH + 2, { width: 12, align: "center" });

      cx += toothW + gap;
      if ((i+1) % cols === 0) { cx = x; cy += toothH + 22; }
      // línea divisoria en el medio (entre cuadrantes)
      if ((i+1) % cols === 8 && i+1 !== row.length) {
        // separador visual
        doc.moveTo(x + (toothW+gap)*8 - gap/2, cy - toothH - 22 + 4)
           .lineTo(x + (toothW+gap)*8 - gap/2, cy - 4)
           .lineWidth(0.5).strokeColor("#E5E7EB").stroke();
      }
    }
  };

  paintRow(topRow);
  cy += 8;
  // línea horizontal separadora
  doc.moveTo(x, cy).lineTo(x + (toothW+gap)*16 - gap, cy).lineWidth(0.6).strokeColor("#E5E7EB").stroke();
  cy += 12;
  paintRow(bottomRow);

  return cy + toothH; // y final
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });

  // 1) Datos
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      odontogram: true,
      consultations: { orderBy: { date: "desc" }, include: { procedures: { include: { procedure: true } } } },
      appointments: { orderBy: { date: "desc" } },
    },
  });
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // Procedimientos por diente (a partir de facturas)
  const invs = await prisma.invoice.findMany({
    where: { patientId: id },
    include: { items: true },
    orderBy: { date: "desc" },
  });
  const perTooth = new Map(); // tooth -> Set(names)
  for (const inv of invs) {
    for (const it of inv.items) {
      const tooth = it.tooth?.trim();
      if (tooth) {
        const set = perTooth.get(tooth) || new Set();
        set.add(it.name || it.procedureCode);
        perTooth.set(tooth, set);
      }
    }
  }

  // 2) PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const violet = "#7C3AED";
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const usable = right - left;

  // Título
  doc.fill(violet).font("Helvetica-Bold").fontSize(20)
     .text("Reporte de Historia Clínica / Odontograma", left, 60);

  // Caja de datos paciente
  const boxY = 95;
  drawTag(
    doc, left, boxY, usable * 0.62, 70,
    "Paciente:",
    `${patient.fullName || "—"}\nDocumento: ${patient.document || "—"}    Teléfono: ${patient.phone || "—"}    Edad: ${ageFrom(patient.birthdate)}`
  );

  drawTag(
    doc, left + usable * 0.66, boxY, usable * 0.34, 70,
    "Fecha de reporte",
    new Date().toLocaleString("es-CO")
  );

  // Sección odontograma
  let y = drawOdontogram(doc, left, boxY + 100, patient.odontogram || []);

  // Línea
  y += 14;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.6).strokeColor("#E5E7EB").stroke();
  y += 16;

  // Datos clínicos (Alergias, Antecedentes, EPS, Email)
  doc.fill(violet).font("Helvetica-Bold").fontSize(13).text("Datos clínicos", left, y);
  y += 10;
  doc.fill("#111").font("Helvetica").fontSize(11)
     .text(`EPS: ${patient.eps || "—"}`, left, y)
     .text(`Email: ${patient.email || "—"}`, left + usable/2, y);
  y += 16;
  doc.font("Helvetica-Bold").text("Alergias:", left, y);
  doc.font("Helvetica").text(patient.allergies || "—", left + 70, y, { width: usable - 90 });
  y += 18;
  doc.font("Helvetica-Bold").text("Antecedentes:", left, y);
  doc.font("Helvetica").text(patient.background || "—", left + 95, y, { width: usable - 120 });
  y += 24;

  // Última consulta (si existe)
  const last = patient.consultations[0];
  if (last) {
    doc.fill(violet).font("Helvetica-Bold").fontSize(13).text("Última consulta", left, y);
    y += 10;
    doc.fill("#111").font("Helvetica").fontSize(11)
       .text(new Date(last.date).toLocaleString("es-CO"), left, y);
    y += 16;

    const vitals = [
      last.temperature ? `Temp: ${last.temperature}°C` : null,
      last.pulse ? `Pulso: ${last.pulse} lpm` : null,
      last.respRate ? `Resp: ${last.respRate} rpm` : null,
      last.systolicBP && last.diastolicBP ? `TA: ${last.systolicBP}/${last.diastolicBP}` : null
    ].filter(Boolean).join(" · ");
    if (vitals) { doc.text(vitals, left, y); y += 16; }

    if (last.diagnosis) {
      doc.font("Helvetica-Bold").text("Diagnóstico:", left, y);
      doc.font("Helvetica").text(last.diagnosis, left + 85, y, { width: usable - 100 });
      y += 16;
    }
    if (last.treatment) {
      doc.font("Helvetica-Bold").text("Plan / Tratamiento:", left, y);
      doc.font("Helvetica").text(last.treatment, left + 120, y, { width: usable - 140 });
      y += 16;
    }
    if (last.prescription) {
      doc.font("Helvetica-Bold").text("Fórmula:", left, y);
      doc.font("Helvetica").text(last.prescription, left + 60, y, { width: usable - 80 });
      y += 8;
    }
    y += 8;
  }

  // Procedimientos por diente (desde facturación)
  if (perTooth.size) {
    y += 10;
    doc.fill(violet).font("Helvetica-Bold").fontSize(13).text("Procedimientos por diente (según facturación)", left, y);
    y += 14;
    doc.fill("#111").font("Helvetica").fontSize(11);
    const sortedKeys = Array.from(perTooth.keys()).sort((a,b)=>Number(a)-Number(b));
    for (const t of sortedKeys) {
      const line = `${t}: ${Array.from(perTooth.get(t)).join(", ")}`;
      doc.text(line, left, y, { width: usable });
      y += 14;
      if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    }
  }

  // Consultas previas (solo cabecera + 5 últimas)
  if (patient.consultations.length > 1) {
    y += 10;
    doc.fill(violet).font("Helvetica-Bold").fontSize(13).text("Consultas previas", left, y);
    y += 12;
    doc.fill("#111").font("Helvetica").fontSize(11);
    for (const c of patient.consultations.slice(1, 6)) {
      const line = `${new Date(c.date).toLocaleString("es-CO")} — ${c.diagnosis || "—"}`;
      doc.text(line, left, y, { width: usable });
      y += 14;
      if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    }
  }

  // Citas (últimas 6)
  if (patient.appointments.length) {
    y += 10;
    if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    doc.fill(violet).font("Helvetica-Bold").fontSize(13).text("Citas", left, y);
    y += 12;
    doc.fill("#111").font("Helvetica").fontSize(11);
    for (const a of patient.appointments.slice(0, 6)) {
      const line = `${new Date(a.date).toLocaleString("es-CO")} — ${a.reason || "—"}${a.status ? ` · ${a.status}` : ""}`;
      doc.text(line, left, y, { width: usable });
      y += 14;
      if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    }
  }

  doc.end();
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historia-${patient.document || patient.id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
