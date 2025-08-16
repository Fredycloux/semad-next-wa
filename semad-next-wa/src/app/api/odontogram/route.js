// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { ToothSurface } from "@prisma/client";

const SURF_MAP = {
  O: "OCCLUSAL",
  I: "INCISAL",     // usa este si lo agregaste en el enum
  M: "MESIAL",
  D: "DISTAL",
  B: "BUCCAL",
  V: "BUCCAL",     // si usas V de vestibular, mapea a BUCCAL
  L: "LINGUAL",
  P: "LINGUAL",    // palatino -> lingual (ajusta si tienes PALATAL)
};

// helper para convertir "O" -> "OCCLUSAL" o aceptar ya el nombre largo
function normalizeSurface(s) {
  const t = String(s || "").toUpperCase();
  const candidate = SURF_MAP[t] || t;
  // valida contra el enum real
  if (!Object.values(ToothSurface).includes(candidate)) {
    throw new Error(`Superficie inválida: ${s}`);
  }
  return candidate;
}

export async function POST(req) {
  try {
    const { patientId, tooth, surface = "O", label, color, on = true } = await req.json();
    if (!patientId || !tooth) {
      return Response.json({ ok: false, error: "patientId y tooth son requeridos" }, { status: 400 });
    }

    const s = normalizeSurface(surface);

    if (on) {
      // guarda o actualiza la marca (un registro por diente+superficie)
      const entry = await prisma.odontogramEntry.upsert({
        where: {
          patientId_tooth_surface: { patientId, tooth, surface: s },
        },
        update: { label, color },
        create: { patientId, tooth, surface: s, label, color },
      });
      return Response.json({ ok: true, entry });
    } else {
      // elimina
      await prisma.odontogramEntry.delete({
        where: {
          patientId_tooth_surface: { patientId, tooth, surface: s },
        },
      });
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
