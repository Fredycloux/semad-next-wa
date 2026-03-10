// src/app/api/admin/patients/[id]/route.js
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function parseDOB(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    // admite "YYYY-MM-DD" o ISO
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }
  return null;
}

const VALID_SEX = new Set(["MALE", "FEMALE", "OTHER"]);

async function updatePatient(req, { params }) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body = await req.json();

    // Validación de formato
    if (body.email && !EMAIL_RE.test(body.email)) {
      return Response.json(
        { ok: false, error: "El correo electrónico no tiene un formato válido" },
        { status: 400 }
      );
    }
    if (body.phone && !PHONE_RE.test(body.phone)) {
      return Response.json(
        { ok: false, error: "El teléfono no tiene un formato válido" },
        { status: 400 }
      );
    }

    // Construcción "parcial": solo campos presentes en el body
    const upd = {};

    // campos de texto básicos (permitimos null vaciando el input)
    for (const k of [
      "fullName",
      "document",
      "phone",
      "email",
      "insurer",
      "allergies",
      "history",
    ]) {
      if (k in body) upd[k] = body[k] === "" ? null : body[k];
    }

    // fecha de nacimiento
    if ("dateOfBirth" in body) {
      upd.dateOfBirth = parseDOB(body.dateOfBirth);
    }

    // sexo
    if ("sex" in body) {
      const s = String(body.sex || "").toUpperCase();
      upd.sex = VALID_SEX.has(s) ? s : null;
    }

    // embarazo: si sexo es FEMALE (ya sea en el body o lo existente), guardamos booleano; si no, null
    if ("pregnant" in body || "sex" in body) {
      // si en esta misma actualización ya definimos sexo, usamos ese valor;
      // si no, leeremos el sexo actual del paciente para decidir.
      let effectiveSex = upd.sex;
      if (effectiveSex === undefined) {
        const current = await prisma.patient.findUnique({
          where: { id: params.id },
          select: { sex: true },
        });
        effectiveSex = current?.sex ?? null;
      }
      upd.pregnant = effectiveSex === "FEMALE" ? Boolean(body.pregnant) : null;
    }

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: upd,
    });

    return Response.json({ ok: true, patient });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// Soportamos PUT y PATCH (ambos hacen update parcial)
export async function PUT(req, ctx) {
  return updatePatient(req, ctx);
}

export async function PATCH(req, ctx) {
  return updatePatient(req, ctx);
}
