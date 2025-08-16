import { PrismaClient } from "@prisma/client";
import EditPatientForm from "@/components/EditPatientForm";
import Odontogram from "@/components/Odontogram";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export default async function PatientPage({ params: { id } }) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { date: "desc" } },
      odontogram: true,
    },
  });

  if (!patient) return <div className="p-4">Paciente no encontrado.</div>;

  const entries = (patient.odontogram || []).map(e => ({
    tooth: e.tooth,
    surface: e.surface,
    label: e.label,
    color: e.color,
  }));

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
          entries={entries}
        />
      </section>

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Citas</div>
        {patient.appointments.length === 0 ? (
          <div className="text-sm text-gray-500">Sin citas registradas.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {patient.appointments.map(a => (
              <li key={a.id}>
                {new Date(a.date).toLocaleString()} — {a.reason || "—"} {a.status && `· ${a.status}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
