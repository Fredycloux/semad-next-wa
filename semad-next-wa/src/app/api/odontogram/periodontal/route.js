import { prisma } from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { patientId, periodontalExam } = body;

        if (!patientId) {
            return Response.json({ ok: false, error: "patientId obligatorio" }, { status: 400 });
        }

        const updated = await prisma.patient.update({
            where: { id: String(patientId) },
            data: { periodontalExam: periodontalExam || null },
        });

        return Response.json({ ok: true, periodontalExam: updated.periodontalExam });
    } catch (error) {
        return Response.json({ ok: false, error: String(error.message || error) }, { status: 500 });
    }
}
