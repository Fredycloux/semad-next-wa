// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { ToothSurface } from "@prisma/client";
import { colorForLabel } from "@/lib/odontogram-config";

// Mapa para normalizar superficies (admite corto/largo y sinónimos)
const SURF_MAP = {
  O: "OCCLUSAL",
  I: "INCISAL",
  M: "MESIAL",
  D: "DISTAL",
  B: "BUCCAL",
  V: "BUCCAL",   // vestibular
  L: "LINGUAL",
  P: "LINGUAL",  // palatino/lingual
  OCCLUSAL: "OCCLUSAL",
  INCISAL: "INCISAL",
  MESIAL: "MESIAL",
  DISTAL: "DISTAL",
  BUCCAL: "BUCCAL",
  VESTIBULAR: "BUCCAL",
  LINGUAL: "LINGUAL",
  PALATAL: "LINGUAL",
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
  // Evita “Unexpected end of JSON input”
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

  try {
    // 👇 Normalizamos DENTRO del try para capturar errores y responder JSON.
    const s = normalizeSurface(surface);

    // Color por defecto a partir del diagnóstico si no viene en el payload
    const safeLabel = (label || "Otro").trim();
    const resolvedColor = color || colorForLabel(safeLabel);

    if (on) {
      // crea/actualiza por clave compuesta (patientId,tooth,surface)
      const entry = await prisma.odontogramEntry.upsert({
        where: {
          patientId_tooth_surface: {
            patientId: String(patientId),
            tooth: String(tooth),
            surface: s,
          },
        },
        update: { label: safeLabel, color: resolvedColor }, // updatedAt lo maneja @updatedAt
        create: {
          patientId: String(patientId),
          tooth: String(tooth),
          surface: s,
          label: safeLabel,
          color: resolvedColor,
        },
      });
      return Response.json({ ok: true, entry });
    } else {
      await prisma.odontogramEntry.delete({
        where: {
          patientId_tooth_surface: {
            patientId: String(patientId),
            tooth: String(tooth),
            surface: s,
          },
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
