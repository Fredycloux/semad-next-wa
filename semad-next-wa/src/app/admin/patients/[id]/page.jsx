import { PrismaClient } from "@prisma/client";
import EditPatientForm from "@/components/EditPatientForm";
import Odontogram from "@/components/Odontogram";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export default async function PatientPage({ params: { id } }) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { appointments: { orderBy: { date: "desc" } } },
  });
  if (!patient) return <div className="p-4">Paciente no encontrado.</div>;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Historia clínica</h1>
        <p className="text-sm text-gray-500">{patient.fullName}</p>
      </div>

      <EditPatientForm patient={patient} />

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Odontograma</div>
        <Odontogram
          patientId={patient.id}
          initialDentition={patient.dentition || "ADULT"}
        />
      </section>

      {/* ...resto de secciones (citas, etc.) */}
    </div>
  );
}
