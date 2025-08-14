// src/app/api/seed-catalogs/route.js
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const dentists = [
      'Yemina Alandete Garcia',
      'Aldemar Cifuentes',
    ];

    const procedures = [
      { code: 'OD001',  name: 'Consulta',                               price: 20000 },
      { code: 'OD010',  name: 'Profilaxis',                             price: 800000 },
      { code: 'OD020',  name: 'Resina',                                 price: 50000 },
      { code: 'OD030U', name: 'Endodoncia unirradicular',               price: 150000 },
      { code: 'OD030M', name: 'Endodoncia multirradicular',             price: 400000 },
      { code: 'OD040U', name: 'Extracción unirradicular',               price: 80000 },
      { code: 'OD040M', name: 'Extracción multirradicular',             price: 150000 },
      { code: 'OD041',  name: 'Extracción de cordales',                 price: 250000 },
      { code: 'CR001',  name: 'Corona metal porcelana',                 price: 750000 },
      { code: 'CR002',  name: 'Corona zirconio',                        price: 1500000 },
      { code: 'DS001',  name: 'Diseño en resina',                       price: 100000 },
      { code: 'DS002',  name: 'Diseño en cerómero',                     price: 400000 },
      { code: 'DS003',  name: 'Diseño en zirconio',                     price: 1200000 },
      { code: 'PR001',  name: 'Protesis total superior en acrílico',    price: 600000 },
      { code: 'PR002',  name: 'Protesis total en alto impacto',         price: 900000 },
      { code: 'PR003',  name: 'Protesis removible flexible',            price: 900000 },
      { code: 'AK001',  name: 'Ackers flexible',                        price: 300000 },
    ];

    // Dentistas
    for (const name of dentists) {
      await prisma.dentist.upsert({
        where: { name },
        update: { active: true },
        create: { name },
      });
    }

    // Procedimientos
    for (const p of procedures) {
      await prisma.procedure.upsert({
        where: { code: p.code },
        update: { name: p.name, price: p.price, active: true },
        create: { code: p.code, name: p.name, price: p.price },
      });
    }

    return Response.json({ ok: true, dentists: dentists.length, procedures: procedures.length });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
