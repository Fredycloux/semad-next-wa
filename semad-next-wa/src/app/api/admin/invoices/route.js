// src/app/api/admin/invoices/route.js
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// helpers
function intOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  return Number(v);
}

// Folio tipo FAC-2025-000123 (contador por año)
async function nextFolio() {
  return await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const key = `invoice-${year}`;

    const c = await tx.counter.upsert({
      where: { name: key },
      update: { value: { increment: 1 } },
      create: { name: key, value: 1 },
    });

    const num = String(c.value).padStart(6, "0");
    return `FAC-${year}-${num}`;
  });
}

// Listado para “recientes”
export async function GET() {
  const items = await prisma.invoice.findMany({
    orderBy: { date: "desc" },
    include: {
      patient: { select: { fullName: true, document: true } },
      items: true,
    },
  });
  return Response.json({ ok: true, items });
}

// Crear factura con: validación, precios, total y folio
export async function POST(req) {
  try {
    const body = await req.json();
    const { patientId, items } = body || {};

    if (!patientId) {
      return Response.json({ ok: false, error: "patientId requerido" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ ok: false, error: "Debes agregar al menos un ítem" }, { status: 400 });
    }

    // Pre-carga de procedimientos para validar y tomar precio
    const codes = items.map((i) => String(i.procedureCode));
    const procs = await prisma.procedure.findMany({ where: { code: { in: codes } } });
    const map = new Map(procs.map((p) => [p.code, p]));

    // Normalización + subtotales
    let total = 0;
    const toCreate = items.map((it) => {
      const proc = map.get(String(it.procedureCode));
      if (!proc) throw new Error(`Procedimiento inexistente: ${it.procedureCode}`);

      const quantity = Number(it.quantity ?? 1) || 1;
      let unitPrice = intOrNull(it.unitPrice);

      if (unitPrice == null) {
        if (proc.variable) {
          unitPrice = intOrNull(proc.minPrice);
          if (unitPrice == null) {
            throw new Error(`Precio requerido para ${proc.name}`);
          }
        } else {
          unitPrice = intOrNull(proc.price) ?? 0;
        }
      }

      const subtotal = quantity * unitPrice;
      total += subtotal;

      return {
        quantity,
        tooth: it.tooth || null,
        procedureCode: proc.code,
        unitPrice,
        subtotal,
      };
    });

    // Folio consecutivo
    const folio = await nextFolio();

    // Crear factura + items
    const invoice = await prisma.invoice.create({
      data: {
        folio,
        patientId: String(patientId),
        total,
        // importante: usar create (no createMany) para poder incluir/retornar
        items: { create: toCreate },
      },
      include: {
        patient: true,
        items: { include: { procedure: true } },
      },
    });

    return Response.json({ ok: true, invoice });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
