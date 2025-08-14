import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DENTISTS = [
  "Yemina Alandete Garcia",
  "Aldemar Cifuentes",
];

const PROCEDURES = [
  "Consulta",
  "Profilaxis",
  "Resina",
  "Endodoncia unirradicular",
  "Endodoncia multirradicular",
  "Extracción unirradicular",
  "Extracción multirradicular",
  "Extracción de cordales",
  "Corona metal porcelana",
  "Corona zirconio",
  "Diseño en resina",
  "Diseño en cerómero",
  "Diseño en zirconio",
  "Prótesis total superior en acrílico",
  "Prótesis total en alto impacto",
  "Prótesis removible flexible",
  "Ackers flexible",
];

export async function GET() {
  try {
    for (const name of DENTISTS) {
      await prisma.dentist.upsert({
        where: { name },
        update: { active: true },
        create: { name },
      });
    }
    for (const name of PROCEDURES) {
      await prisma.procedure.upsert({
        where: { name },
        update: { active: true },
        create: { name },
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
