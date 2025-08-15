import { PrismaClient } from "@prisma/client";
import EditPatientForm from "@/components/EditPatientForm";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function PatientPage({ params: { id } }) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { appointments: { orderBy: { date: "desc" } } },
  });

  if (!patient) {
    return <div className="p-4">Paciente no encontrado.</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Historia clínica</h1>
        <p className="text-sm text-gray-500">{patient.fullName}</p>
      </div>

      <EditPatientForm patient={patient} />

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Odontograma</div>
        <div className="text-sm text-gray-500">
          Próximamente: aquí irá el odontograma interactivo (SVG clickeable).
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Citas</div>
        {patient.appointments.length === 0 ? (
          <div className="text-sm text-gray-500">Sin citas registradas.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {patient.appointments.map((a) => (
              <li key={a.id}>
                {new Date(a.date).toLocaleString()} — {a.reason || "—"}{" "}
                {a.status && `· ${a.status}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
