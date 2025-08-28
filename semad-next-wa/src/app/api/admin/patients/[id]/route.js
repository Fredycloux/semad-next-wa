// src/app/api/admin/patients/[id]/route.js
import { prisma } from "@/lib/prisma";

function parseDOB(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }
  return null;
}

const VALID_SEX = new Set(["MALE", "FEMALE", "OTHER"]);

async function updatePatient(req, { params }) {
  try {
    const body = await req.json();

    const upd = {};
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

    if ("dateOfBirth" in body) {
      upd.dateOfBirth = parseDOB(body.dateOfBirth);
    }

    if ("sex" in body) {
      const s = String(body.sex || "").toUpperCase();
      upd.sex = VALID_SEX.has(s) ? s : null;
    }

    if ("pregnant" in body || "sex" in body) {
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

// PUT / PATCH = actualización parcial
export async function PUT(req, ctx) {
  return updatePatient(req, ctx);
}
export async function PATCH(req, ctx) {
  return updatePatient(req, ctx);
}

/**
 * DELETE: elimina la historia clínica (paciente) y todos sus registros
 * relacionados que no tengan cascada en la BD:
 * - Items de facturas
 * - Facturas
 * - Citas
 * (Si tienes otras tablas de historia/consultas/notas, añádelas)
 */
export async function DELETE(_req, { params }) {
  const patientId = params?.id;
  if (!patientId) {
    return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Obtener facturas del paciente
      const invoices = await tx.invoice.findMany({
        where: { patientId },
        select: { id: true },
      });
      const invoiceIds = invoices.map((i) => i.id);

      if (invoiceIds.length > 0) {
        // 2) Borrar items de factura
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        // 3) Borrar facturas
        await tx.invoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      // 4) Borrar citas del paciente (próximas y pasadas)
      await tx.appointment.deleteMany({ where: { patientId } });

      // 5) (Opcional) Borrar otras tablas de historia si existen:
      // await tx.clinicalNote.deleteMany({ where: { patientId } });
      // await tx.treatment.deleteMany({ where: { patientId } });
      // await tx.file.deleteMany({ where: { patientId } });

      // 6) Finalmente, borrar el paciente
      await tx.patient.delete({ where: { id: patientId } });
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/patients/[id] failed:", e);
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
