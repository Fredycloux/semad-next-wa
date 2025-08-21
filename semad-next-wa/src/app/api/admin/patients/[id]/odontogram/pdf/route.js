import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (n)=> new Intl.NumberFormat("es-CO").format(Number(n||0));

// dientes en 4 cuadrantes (clásico 11-18, 21-28, 31-38, 41-48)
const QUADS = [
  [11,12,13,14,15,16,17,18],
  [21,22,23,24,25,26,27,28],
  [31,32,33,34,35,36,37,38],
  [41,42,43,44,45,46,47,48],
];

export async function GET(_req, { params }){
  const patientId = params?.id;
  if (!patientId) return new Response("ID inválido", { status: 400 });

  const patient = await prisma.patient.findUnique({ where:{ id: patientId }});
  if (!patient) return new Response("Paciente no encontrado", { status: 404 });

  // Traemos ítems facturados por diente
  const invoices = await prisma.invoice.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    include: { items: { include: { procedure: true } } },
    take: 200, // límite razonable
  });

  // Mapear por diente (string) -> lista de nombres de proc
  const map = new Map();
  for (const inv of invoices) {
    for (const it of inv.items) {
      const tooth = (it.tooth || "").trim();
      if (!tooth) continue;
      const arr = map.get(tooth) || [];
      arr.push(it.procedure?.name || it.procedureCode);
      map.set(tooth, arr);
    }
  }

  // Logo (mismo patrón que factura)
  const origin = process.env.NEXT_PUBLIC_BASE_URL || "";
  let logoBuf = null;
  try {
    const url = origin ? new URL("/logo_semad.png", origin) : "/logo_semad.png";
    const r = await fetch(url);
    if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer());
  } catch {}

  // PDF
  const doc = new PDFDocument({ size:"A4", margin:40 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  // Header
  if (logoBuf) doc.image(logoBuf, left, 20, { width: 140 });
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#4f1fd8").text("Reporte de Historia Clínica / Odontograma", left, 25, { align:"right" });
  doc.moveDown(2);

  // Paciente
  doc.fillColor("#000").fontSize(12);
  doc.text(`Paciente: ${patient.fullName || "—"}`);
  doc.text(`Documento: ${patient.document || "—"}   ${patient.phone ? `·  ${patient.phone}` : ""}`);
  doc.moveDown(1);

  // Dibujo del odontograma (cuadrantes)
  const topY = doc.y + 10;
  const toothBox = { w: 30, h: 36, pad: 6 };
  const gapX = 12, gapY = 16;
  const startX = left;
  let y = topY;

  doc.font("Helvetica-Bold").fillColor("#4f1fd8").text("Odontograma", left, y);
  y += 8;

  doc.font("Helvetica").fillColor("#000");
  for (let q = 0; q < QUADS.length; q++){
    let x = startX;
    y += (q === 0 ? 12 : gapY);
    for (const n of QUADS[q]){
      const tooth = String(n);
      const filled = map.has(tooth);
      // marco
      doc.roundedRect(x, y, toothBox.w, toothBox.h, 4).strokeColor("#6b21a8").lineWidth(1).stroke();
      // relleno suave si hay tratamientos
      if (filled){
        doc.roundedRect(x+1, y+1, toothBox.w-2, toothBox.h-2, 4).fillOpacity(0.12).fill("#6b21a8").fillOpacity(1);
      }
      // número
      doc.fontSize(9).fillColor("#111").text(tooth, x, y+toothBox.h-10, { width: toothBox.w, align:"center" });
      x += toothBox.w + gapX;
    }
  }
  y += toothBox.h + 10;

  // Leyenda
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#ddd").stroke();
  y += 8;
  doc.font("Helvetica").fontSize(10).fillColor("#444")
     .text("Cuadros resaltados indican dientes con procedimientos registrados (según facturación).", left, y);

  // Tabla de procedimientos por diente (si los hay)
  if (map.size > 0){
    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fillColor("#4f1fd8").text("Procedimientos por diente");
    doc.moveDown(0.5);
    doc.font("Helvetica").fillColor("#000");
    for (const [tooth, procs] of [...map.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))){
      const line = `${tooth}: ${procs.slice(0,6).join(", ")}${procs.length>6?"…":""}`;
      doc.text(line);
    }
  } else {
    doc.moveDown(1);
    doc.text("Sin procedimientos asociados a dientes todavía.");
  }

  doc.end();
  return new Response(stream, {
    headers:{
      "Content-Type":"application/pdf",
      "Content-Disposition":`inline; filename="odontograma-${patient.fullName||patientId}.pdf"`,
      "Cache-Control":"no-store",
    }
  });
}
