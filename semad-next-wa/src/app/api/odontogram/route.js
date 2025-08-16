// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { ToothSurface } from "@prisma/client";

const SURF_MAP = { O:"OCCLUSAL", I:"INCISAL", M:"MESIAL", D:"DISTAL", B:"BUCCAL", L:"LINGUAL", P:"LINGUAL" };
const norm = s => {
  const v = SURF_MAP[String(s||"").toUpperCase()] || String(s).toUpperCase();
  if (!Object.values(ToothSurface).includes(v)) throw new Error(`Superficie inválida: ${s}`);
  return v;
};

export async function POST(req) {
  const { patientId, tooth, surface="O", label, color, on=true } = await req.json();
  const s = norm(surface);

  if (on) {
    const entry = await prisma.odontogramEntry.upsert({
      where: { patientId_tooth_surface: { patientId, tooth, surface: s } },
      update: { label, color },
      create: { patientId, tooth, surface: s, label, color },
    });
    return Response.json({ ok: true, entry });
  } else {
    await prisma.odontogramEntry.delete({
      where: { patientId_tooth_surface: { patientId, tooth, surface: s } },
    });
    return Response.json({ ok: true });
  }
}
