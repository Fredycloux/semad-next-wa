import { PrismaClient } from "@prisma/client";
import EditPatientForm from "@/components/EditPatientForm";
import Link from "next/link";

export const metadata = { title: "Paciente | SEMAD" };
const prisma = new PrismaClient();

async function getData(id) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { date: "desc" }, take: 10 },
      invoices: { orderBy: { date: "desc" }, take: 10 },
      odontogram: true, // pronto lo pintamos
    },
  });
}

export default async function PatientPage({ params }) {
  const patient = await getData(params.id);
  if (!patient) return <p>Paciente no encontrado</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{patient.fullName}</h1>
        <p className="text-sm text-gray-500">
          Documento: {patient.document || "—"} · Tel: {patient.phone || "—"}
        </p>
      </div>

      <section className="rounded-xl border bg-white/70 backdrop-blur p-4">
        <h2 className="font-medium mb-3">Datos del paciente</h2>
        <EditPatientForm patient={patient} />
      </section>

      <section className="rounded-xl border bg-white/70 backdrop-blur p-4">
        <h2 className="font-medium mb-3">Citas (10 más recientes)</h2>
        <div className="grid gap-2">
          {patient.appointments.map(a => (
            <div key={a.id} className="text-sm text-gray-700 flex items-center justify-between">
              <div>
                {new Date(a.date).toLocaleString()} · {a.reason || "—"} · {a.dentist || "—"} · {a.status}
              </div>
              <Link className="text-violet-700 hover:underline" href="/admin/agenda">
                Ver agenda
              </Link>
            </div>
          ))}
          {patient.appointments.length === 0 && (
            <div className="text-sm text-gray-500">Sin citas.</div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white/70 backdrop-blur p-4">
        <h2 className="font-medium mb-2">Odontograma</h2>
        <p className="text-sm text-gray-500">
          Aquí añadiremos el odontograma interactivo (siguiente paso).
        </p>
      </section>

      <section className="rounded-xl border bg-white/70 backdrop-blur p-4">
        <h2 className="font-medium mb-2">Facturación</h2>
        <p className="text-sm text-gray-500">Resumen de facturas (pendiente de UI).</p>
      </section>
    </div>
  );
}
