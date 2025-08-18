// src/app/admin/patients/[id]/page.jsx
import { prisma } from "@/lib/prisma";
import EditPatientForm from "@/components/EditPatientForm";
import NewConsultationForm from "@/components/NewConsultationForm";
import Odontogram from "@/components/Odontogram";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }) {
  const { id } = params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { date: "desc" } },
      odontogram: true, // para precargar marcas del odontograma
      consultations: {
        orderBy: { date: "desc" },
        include: {
          procedures: { include: { procedure: true } }, // nombres de procedimientos
        },
      },
    },
  });

  if (!patient) return <div className="p-4">Paciente no encontrado.</div>;

  return (
    <div className="space-y-6 p-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-semibold">Historia clínica</h1>
        <p className="text-sm text-gray-500">
          {patient.fullName} · {patient.document || "—"} · {patient.phone || "—"}
        </p>
      </div>

      {/* Datos del paciente */}
      <EditPatientForm patient={patient} />

      {/* Odontograma */}
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

      {/* Nueva consulta (dejamos placeholder para no romper build; añadimos el componente en el siguiente bloque) */}
      <section className="rounded-xl border p-4">
        <div className="font-medium mb-3">Nueva consulta</div>
        <div className="text-sm text-gray-500">
          El formulario “Nueva consulta” se agrega en el siguiente paso.
        </div>
        {
          <NewConsultationForm patientId={patient.id} />
        }
      </section>

      {/* Consultas previas */}
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

                {/* Diagnóstico */}
                <div className="text-gray-700">
                  {c.diagnosis || "—"}
                </div>

                {/* Procedimientos realizados en esa consulta */}
                {c.procedures?.length > 0 && (
                  <div className="text-gray-600">
                    {c.procedures.map((cp) => cp.procedure.name).join(", ")}
                  </div>
                )}

                {/* Signos vitales si existen */}
                {(c.temperature || c.pulse || (c.systolicBP && c.diastolicBP) || c.respRate) && (
                  <div className="text-gray-500">
                    {c.temperature ? `Temp ${c.temperature}°C · ` : ""}
                    {c.pulse ? `Pulso ${c.pulse} lpm · ` : ""}
                    {c.systolicBP && c.diastolicBP ? `TA ${c.systolicBP}/${c.diastolicBP} · ` : ""}
                    {c.respRate ? `Resp ${c.respRate} rpm` : ""}
                  </div>
                )}

                {/* Textos largos si existen */}
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

      {/* Citas */}
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
