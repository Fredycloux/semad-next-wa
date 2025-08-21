// src/app/admin/patients/[id]/page.jsx
import { prisma } from "@/lib/prisma";
import EditPatientForm from "@/components/EditPatientForm";
import NewConsultationForm from "@/components/NewConsultationForm";
import Odontogram from "@/components/Odontogram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PatientPage({ params }) {
  const id = params?.id;
  if (!id || typeof id !== "string") {
    return <div className="p-4">ID de paciente inválido.</div>;
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { date: "desc" } },
      odontogram: true,
      consultations: {
        orderBy: { date: "desc" },
        include: { procedures: { include: { procedure: true } } },
      },
    },
  });

  if (!patient) return <div className="p-4">Paciente no encontrado.</div>;

  return (
    <div className="space-y-6 p-4">

      {/* Header + botón PDF */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Historia clínica</h1>
          <p className="text-sm text-gray-500">
            {patient.fullName} · {patient.document || "—"} · {patient.phone || "—"}
          </p>
        </div>
        <div className="mt-1">
          <a
            href={`/api/admin/patients/${patient.id}/history/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-700"
          >
            Descargar Historia / Odontograma (PDF)
          </a>
        </div>
      </div>

      <EditPatientForm patient={patient} />

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Odontograma</div>
        <Odontogram
          patientId={patient.id}
          initialDentition={patient.dentition || "ADULT"}
          entries={(patient.odontogram || []).map((o) => ({
            tooth: o.tooth,
            surface: o.surface,
            label: o.label,
            color: o.color,
          }))}
        />
      </section>

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-3">Nueva consulta</div>
        {/* NO pasar funciones desde el server */}
        <NewConsultationForm patientId={patient.id} />
      </section>

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Consultas previas</div>
        {patient.consultations.length === 0 ? (
          <div className="text-sm text-gray-500">Sin registros.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {patient.consultations.map((c) => (
              <li key={c.id} className="rounded-lg border px-3 py-2">
                <div className="font-medium">
                  {new Date(c.date).toLocaleString()}
                </div>

                <div className="text-gray-700">{c.diagnosis || "—"}</div>

                {c.procedures?.length > 0 && (
                  <div className="text-gray-600">
                    {c.procedures.map((cp) => cp.procedure.name).join(", ")}
                  </div>
                )}

                {(c.temperature || c.pulse || (c.systolicBP && c.diastolicBP) || c.respRate) && (
                  <div className="text-gray-500">
                    {c.temperature ? `Temp ${c.temperature}°C · ` : ""}
                    {c.pulse ? `Pulso ${c.pulse} lpm · ` : ""}
                    {c.systolicBP && c.diastolicBP ? `TA ${c.systolicBP}/${c.diastolicBP} · ` : ""}
                    {c.respRate ? `Resp ${c.respRate} rpm` : ""}
                  </div>
                )}

                {(c.anamnesis || c.evolution || c.prescription) && (
                  <div className="mt-1 space-y-1 text-gray-600">
                    {c.anamnesis && <div><span className="font-medium">Anamnesis:</span> {c.anamnesis}</div>}
                    {c.evolution && <div><span className="font-medium">Evolución:</span> {c.evolution}</div>}
                    {c.prescription && <div><span className="font-medium">Fórmula:</span> {c.prescription}</div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <div className="font-medium mb-2">Citas</div>
        {patient.appointments.length === 0 ? (
          <div className="text-sm text-gray-500">Sin citas registradas.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {patient.appointments.map((a) => (
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
