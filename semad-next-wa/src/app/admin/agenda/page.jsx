import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CancelAppointmentButton from "@/components/CancelAppointmentButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;                 // no ISR
export const fetchCache = "force-no-store";  // no cache del route fetch

export default async function AgendaPage() {
  const from = new Date();
  from.setDate(from.getDate() - 1);

  // Obtener citas próximas
  const appts = await prisma.appointment.findMany({
    where: { date: { gte: from }, status: { not: "Cancelada" } },
    include: { patient: true },
    orderBy: { date: "asc" },
  });

  // Contar solicitudes de cita pendientes
  const pendingCount = await prisma.appointmentRequest.count({
    where: { status: "Pendiente" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Agendamiento de citas</h1>
        <p className="text-sm text-gray-500">
          Lista de citas próximas (ordenadas por fecha/hora).
        </p>
        {pendingCount > 0 && (
          <p className="mt-1 text-sm text-red-600 font-semibold">
            ¡Tienes {pendingCount} solicitud
            {pendingCount === 1 ? "" : "es"} pendiente
            {pendingCount === 1 ? "" : "s"} por agendar!
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {appts.length === 0 ? (
          <p className="text-sm text-gray-500">No hay citas próximas.</p>
        ) : (
          appts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3"
            >
              <div className="min-w-[12rem]">
                <div className="font-medium">
                  {new Date(a.date).toLocaleDateString()}{" "}
                  {new Date(a.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs text-gray-600">
                  {a.dentist || "—"}
                </div>
              </div>

              <div className="flex-1">
                <div className="font-medium">
                  {a.patient?.fullName || "—"}
                </div>
                <div className="text-sm text-gray-600">
                  {a.reason || "—"} · {a.patient?.phone || "sin teléfono"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  className="text-sm text-violet-700 hover:underline"
                  href={`/admin/patients/${a.patientId}`}
                  prefetch={false}        // evita snapshot viejo al navegar
                >
                  Historia
                </Link>

                <CancelAppointmentButton id={a.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
