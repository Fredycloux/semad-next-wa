// src/app/api/seed/route.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Usuarios demo
    const users = [
      { username: 'admin',       password: 'admin123',       role: 'ADMIN',       name: 'Administrador' },
      { username: 'odontologo',  password: 'odontologo123',  role: 'ODONTOLOGO',  name: 'Odontólogo' },
      { username: 'recepcion',   password: 'recepcion123',   role: 'RECEPCION',   name: 'Recepción' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { username: u.username },
        update: { passwordHash: hash, role: u.role, name: u.name },
        create: { username: u.username, passwordHash: hash, role: u.role, name: u.name },
      });
    }

    // Procedimientos base (COP)
    const procedures = [
      { code: 'OD001', name: 'Consulta inicial', price: 60000 },
      { code: 'OD010', name: 'Profilaxis',       price: 90000 },
      { code: 'OD020', name: 'Resina',           price: 180000 },
      { code: 'OD030', name: 'Endodoncia',       price: 750000 },
      { code: 'OD040', name: 'Extracción',       price: 220000 },
      { code: 'OD050', name: 'Corona',           price: 1200000 },
    ];
    for (const p of procedures) {
      await prisma.procedure.upsert({
        where: { code: p.code },
        update: { name: p.name, price: p.price },
        create: { code: p.code, name: p.name, price: p.price },
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
