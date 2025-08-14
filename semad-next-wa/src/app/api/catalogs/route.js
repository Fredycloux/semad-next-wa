// /src/app/api/catalogs/route.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const dentists = await prisma.dentist.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const procedures = await prisma.procedure.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return Response.json({
      dentists: dentists.map(d => ({ id: d.id, name: d.name })),
      procedures: procedures.map(p => ({ id: p.id, name: p.name })),
    });
  } catch {
    // Devuelve arrays vacíos si algo falla para no romper el form
    return Response.json({ dentists: [], procedures: [] });
  }
}
