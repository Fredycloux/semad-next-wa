// src/app/api/admin/histories/[id]/route.js


import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const USE_INT_ID = false; // pon true si el id de History es Int

function coerceId(id) {
  if (!id) return id;
  return USE_INT_ID ? Number(id) : id;
}

export async function DELETE(_req, { params }) {
  try {
    const rawId = params?.id;
    if (!rawId) {
      return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
    }
    const id = coerceId(rawId);

    await prisma.history.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/histories/[id] failed:", e);
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

