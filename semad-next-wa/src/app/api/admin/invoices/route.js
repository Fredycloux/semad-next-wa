import { prisma } from "@/lib/prisma";

function intOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  return Number(v);
}

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

    // precarga procedimientos para validar/preciar
    const codes = items.map(i => String(i.procedureCode));
    const procs = await prisma.procedure.findMany({ where: { code: { in: codes } } });
    const map = new Map(procs.map(p => [p.code, p]));

    // normaliza y calcula subtotales
    let total = 0;
    const toCreate = items.map((it) => {
      const proc = map.get(String(it.procedureCode));
      if (!proc) throw new Error(`Procedimiento inexistente: ${it.procedureCode}`);

      const quantity = Number(it.quantity ?? 1) || 1;
      let unitPrice = intOrNull(it.unitPrice);

      // si no vino unitPrice, usamos precio del procedimiento
      if (unitPrice == null) {
        if (proc.variable) {
          // para variables exigimos precio
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

    const invoice = await prisma.invoice.create({
      data: {
        patientId: String(patientId),
        total,
        items: { createMany: { data: toCreate } },
      },
      include: { items: true },
    });

    return Response.json({ ok: true, invoice });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
