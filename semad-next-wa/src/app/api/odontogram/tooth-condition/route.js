import { prisma } from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { patientId, tooth, field, value } = body;

        if (!patientId || !tooth || !field) {
            return Response.json({ ok: false, error: "patientId, tooth, field y value obligatorios" }, { status: 400 });
        }

        // Permitimos los tres nuevos campos
        const allowedFields = ["vestibular", "lingual", "mobility"];
        if (!allowedFields.includes(field)) {
            return Response.json({ ok: false, error: "Campo inválido" }, { status: 400 });
        }

        const updated = await prisma.toothCondition.upsert({
            where: {
                patientId_tooth: {
                    patientId: String(patientId),
                    tooth: String(tooth),
                },
            },
            update: {
                [field]: value,
            },
            create: {
                patientId: String(patientId),
                tooth: String(tooth),
                [field]: value,
            },
        });

        return Response.json({ ok: true, toothCondition: updated });
    } catch (error) {
        return Response.json({ ok: false, error: String(error.message || error) }, { status: 500 });
    }
}
