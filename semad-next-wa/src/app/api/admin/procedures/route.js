import { prisma } from "@/lib/prisma";

// genera un código único si no llega en el body
async function generateCodeFromName(name) {
  const base = (name || "PROC")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "PRC";

  // Busca un hueco libre COR001, COR002, ...
  for (let n = 1; n <= 999; n++) {
    const candidate = `${base}${String(n).padStart(3, "0")}`;
    const exists = await prisma.procedure.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;
  }
  // fallback (muy improbable)
  return `${base}${Date.now().toString().slice(-5)}`;
}

export async function GET() {
  const items = await prisma.procedure.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, active: true,
      price: true, variable: true, minPrice: true, maxPrice: true, unit: true,
      createdAt: true, updatedAt: true,
    },
  });
  return Response.json({ ok: true, items });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, code, price, variable, minPrice, maxPrice, unit, active } = body || {};

    if (!name?.trim()) {
      return Response.json({ ok: false, error: "Nombre requerido" }, { status: 400 });
    }

    // si el esquema exige code, lo generamos si no llegó
    const finalCode = code?.trim() || await generateCodeFromName(name);

    const item = await prisma.procedure.create({
      data: {
        name: name.trim(),
        code: finalCode,
        active: typeof active === "boolean" ? active : true,
        variable: Boolean(variable),
        price: body?.price === 0 || body?.price ? Number(price) : null,
        minPrice: body?.minPrice === 0 || body?.minPrice ? Number(minPrice) : null,
        maxPrice: body?.maxPrice === 0 || body?.maxPrice ? Number(maxPrice) : null,
        unit: unit?.trim() || null,
      },
    });

    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return Response.json({ ok: false, error: "id requerido" }, { status: 400 });

    const body = await req.json();
    const { name, code, price, variable, minPrice, maxPrice, unit, active } = body || {};

    const data = {
      name: typeof name === "string" ? name.trim() : undefined,
      code: typeof code === "string" ? code.trim() : undefined,
      active: typeof active === "boolean" ? active : undefined,
      variable: typeof variable === "boolean" ? variable : undefined,
      price:
        body?.price === null ? null :
        body?.price === undefined ? undefined : Number(price),
      minPrice:
        body?.minPrice === null ? null :
        body?.minPrice === undefined ? undefined : Number(minPrice),
      maxPrice:
        body?.maxPrice === null ? null :
        body?.maxPrice === undefined ? undefined : Number(maxPrice),
      unit: typeof unit === "string" ? (unit.trim() || null) : undefined,
    };

    const item = await prisma.procedure.update({ where: { id }, data });
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return Response.json({ ok: false, error: "id requerido" }, { status: 400 });
    await prisma.procedure.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
