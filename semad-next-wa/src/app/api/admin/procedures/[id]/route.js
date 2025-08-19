// src/app/api/admin/procedures/[id]/route.js
import { prisma } from "@/lib/prisma";

// actualizar un procedimiento
export async function PUT(req, { params }) {
  const body = await req.json();
  const { name, code, active, price, variable, minPrice, maxPrice, unit } = body || {};

  const data = {
    name,
    code,
    active: active ?? true,
    price: price ?? null,
    variable: Boolean(variable),
    minPrice: minPrice ?? null,
    maxPrice: maxPrice ?? null,
    unit: unit ?? null,
  };

  const proc = await prisma.procedure.update({
    where: { id: Number(params.id) },
    data,
  });

  return Response.json({ ok: true, item: proc });
}
