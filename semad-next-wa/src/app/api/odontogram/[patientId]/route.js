// src/app/api/odontogram/[patientId]/route.js
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { patientId: string } }
) {
  const entries = await prisma.odontogramEntry.findMany({
    where: { patientId: params.patientId },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ ok: true, entries });
}

