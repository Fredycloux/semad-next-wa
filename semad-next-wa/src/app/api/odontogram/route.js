// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { Surface } from "@prisma/client"; // <-- tu enum
import { colorForLabel } from "@/lib/odontogram-config";

// Normalización: acepta corto y sinónimos a tu enum {O,M,D,B,L}
const SURF_MAP = {
  O: "O",
  I: "O",          // incisales los tratamos como O
  M: "M",
  D: "D",
  B: "B",
  V: "B",          // vestibular -> B
  L: "L",
  P: "L",          // palatino -> L
};

function normalizeSurface(s) {
  const k = String(s || "").toUpperCase();
  const v = SURF_MAP[k] || k;
  if (!Object.values(Surface).includes(v)) {
    throw new Error(`Superficie inválida: ${s}`);
  }
  return v;
}

export async function POST(req) {
  // Evitar "Unexpected end of JSON input"
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Falta cuerpo JSON en la solicitud" },
      { status: 400 }
    );
  }

  const { patientId, tooth, surface = "O", label, color, on = true } = payload || {};

  if (!patientId || !tooth || !surface) {
    return Response.json(
      { ok: false, error: "patientId, tooth y surface son obligatorios" },
      { status: 400 }
    );
  }

  try {
    const s = normalizeSurface(surface);

    const safeLabel = (label || "Otro").trim();
    const resolvedColor = color || colorForLabel(safeLabel);

    if (on) {
      const entry = await prisma.odontogramEntry.upsert({
        where: {
          patientId_tooth_surface: {
            patientId: String(patientId),
            tooth: String(tooth),
            surface: s, // <--- enum Surface (O|M|D|B|L)
          },
        },
        update: { label: safeLabel, color: resolvedColor },
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
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
