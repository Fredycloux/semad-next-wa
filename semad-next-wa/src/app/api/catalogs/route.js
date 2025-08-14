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


    // Si aún no seed-easte la DB, puedes devolver estáticos temporalmente:
    // const dentists = [{ name: "Yemina Alandete Garcia" }, { name: "Aldemar Cifuentes" }];
    // const procedures = [{ name: "Consulta inicial" }, { name: "Profilaxis" }, ...];

    return Response.json({ dentists, procedures });
  } catch (e) {
    return new Response(JSON.stringify({ dentists: [], procedures: [] }), { status: 200 });
  }
}
