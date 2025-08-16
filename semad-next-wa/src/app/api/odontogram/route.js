// src/app/api/odontogram/route.js
import { prisma } from "@/lib/prisma";
import { ToothSurface } from "@prisma/client";

// Sinónimos -> enum de Prisma
const SURF_MAP = {
  O: "OCCLUSAL",
  I: "INCISAL",
  M: "MESIAL",
  D: "DISTAL",
  V: "BUCCAL",   // <-- FALTABA: V (vestibular) => BUCCAL
  B: "BUCCAL",
  L: "LINGUAL",
  P: "LINGUAL",  // algunos usan P (palatino) para lingual
};

function normalizeSurface(s) {
  const k = String(s || "").toUpperCase();
  const mapped = SURF_MAP[k] || k;
  if (!Object.values(ToothSurface).includes(mapped)) {
    throw new Error(`Superficie inválida: ${s}`);
  }
  return mapped;
}

// Color por defecto si no envían color (por etiqueta)
const DEFAULT_COLORS = {
  Caries: "#111827",
  "Obturación": "#f59e0b",
  Endodoncia: "#0ea5e9",
  Corona: "#8b5cf6",
  Fractura: "#ef4444",
  "Pérdida": "#16a34a",   // verde visible
  Otro: "#6b7280",
};

export async function POST(req) {
  // Siempre intentamos leer JSON de forma segura
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
    const finalColor = color || DEFAULT_COLORS[label] || "#6b7280";

    if (on) {
      const entry = await prisma.odontogramEntry.upsert({
        where: { patientId_tooth_surface: { patientId, tooth, surface: s } },
        update: { label, color: finalColor },
        create: { patientId, tooth, surface: s, label, color: finalColor },
      });
      return Response.json({ ok: true, entry });
    } else {
      await prisma.odontogramEntry.delete({
        where: { patientId_tooth_surface: { patientId, tooth, surface: s } },
      });
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
