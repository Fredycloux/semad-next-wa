// src/app/api/admin/histories/[id]/route.js


export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";

export async function DELETE(_req, { params }) {
  try {
    await prisma.history.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /histories/:id", e);
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
