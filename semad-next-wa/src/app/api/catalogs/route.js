// src/app/api/catalogs/route.js
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET() {
  const dentists = await prisma.dentist.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  const procedures = await prisma.procedure.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  return Response.json({ dentists, procedures });
}
