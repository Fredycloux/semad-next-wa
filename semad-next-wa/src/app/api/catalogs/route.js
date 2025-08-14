// src/app/api/catalogs/route.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// evita cacheo de rutas app (para que siempre traiga lo último)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Odontólogos activos
    const dentists = await prisma.dentist.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    // Procedimientos activos
    const procedures = await prisma.procedure.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    return Response.json({ dentists, procedures });
  } catch (e) {
    // Fallback seguro (vacío) si algo falla
    return Response.json({ dentists: [], procedures: [] }, { status: 200 });
  }
}
