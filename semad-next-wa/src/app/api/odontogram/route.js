// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { ToothSurface } from "@prisma/client";

// Normaliza superficies (permite O/I/M/D/B/L/P)
const SURF_MAP = {
  O: "OCCLUSAL",
  I: "INCISAL",
  M: "MESIAL",
  D: "DISTAL",
  B: "BUCCAL",
  L: "LINGUAL",
  P: "LINGUAL", // por si usas P en vez de L
};

function normalizeSurface(s) {
  const k = String(s || "").toUpperCase();
  const v = SURF_MAP[k] || k;
  if (!Object.values(ToothSurface).includes(v)) {
    throw new Error(`Superficie inválida: ${s}`);
  }
  return v;
}

export async function POST(req) {
  // <- evita "Unexpected end of JSON input"
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Falta cuerpo JSON en la solicitud" },
      { status: 400 }
    );
  }

  const {
    patientId,
    tooth,
    surface = "O",
    label,
    color,
    on = true,
  } = payload || {};

  if (!patientId || !tooth || !surface) {
    return Response.json(
      { ok: false, error: "patientId, tooth y surface son obligatorios" },
      { status: 400 }
    );
  }

  const s = normalizeSurface(surface);

  try {
    if (on) {
      // crea/actualiza por clave compuesta (patientId,tooth,surface)
      const entry = await prisma.odontogramEntry.upsert({
        where: {
          patientId_tooth_surface: { patientId, tooth, surface: s },
        },
        update: { label, color },
        create: { patientId, tooth, surface: s, label, color },
      });
      return Response.json({ ok: true, entry });
    } else {
      await prisma.odontogramEntry.delete({
        where: {
          patientId_tooth_surface: { patientId, tooth, surface: s },
        },
      });
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
