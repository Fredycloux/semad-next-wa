// src/app/api/seed/route.js
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import bcrypt from 'bcryptjs';

export async function GET(req) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    // Usuarios demo
    const users = [
      { username: 'admin',       password: 'clouxGT29@',       role: 'ADMIN',       name: 'Administrador' },
      { username: 'odontologo',  password: '123456',  role: 'ODONTOLOGO',  name: 'Odontólogo' },
      { username: 'recepcion',   password: '123456',   role: 'RECEPCION',   name: 'Recepción' },
      { username: '1048271895',  password: 'Yemi2025',  role: 'ODONTOLOGO',  name: 'Odontólogo' },
      { username: '72100134',  password: 'Alde2025',  role: 'ODONTOLOGO',  name: 'Odontólogo' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { username: u.username },
        update: { passwordHash: hash, role: u.role, name: u.name },
        create: { username: u.username, passwordHash: hash, role: u.role, name: u.name },
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
