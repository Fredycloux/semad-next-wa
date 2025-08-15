import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CancelAppointmentButton from "@/components/CancelAppointmentButton";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const from = new Date();
  from.setDate(from.getDate() - 1);

  const appts = await prisma.appointment.findMany({
    where: { date: { gte: from }, status: { not: "Cancelada" } },
    include: { patient: true },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Agendamiento de citas</h1>
        <p className="text-sm text-gray-500">
          Lista de citas próximas (ordenadas por fecha/hora).
        </p>
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
                <div className="text-xs text-gray-600">{a.dentist || "—"}</div>
              </div>

              <div className="flex-1">
                <div className="font-medium">{a.patient?.fullName || "—"}</div>
                <div className="text-sm text-gray-600">
                  {a.reason || "—"} · {a.patient?.phone || "sin teléfono"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  className="text-sm text-violet-700 hover:underline"
                  href={`/admin/patients/${a.patientId}`}
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
