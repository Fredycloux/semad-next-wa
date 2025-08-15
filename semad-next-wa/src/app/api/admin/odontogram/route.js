import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { patientId, tooth, label, color } = await req.json();
    if (!patientId || !tooth || !label)
      return Response.json({ ok:false, error:"Datos incompletos" }, { status:400 });

    const entry = await prisma.odontogramEntry.create({
      data: { patientId, tooth, label, color },
    });

    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ ok:false, error:String(e.message || e) }, { status:500 });
  }
}
