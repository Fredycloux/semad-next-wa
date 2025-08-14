import Image from "next/image";
// o import Logo from "@/components/Logo";

export default function AgendaPage() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* Header amigable con logo */}
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <Image src="/logo_semad.png" alt="SEMAD" width={32} height={32} />
          {/* o <Logo size={32} /> */}
          <div>
            <h1 className="text-lg font-semibold">Crear cita</h1>
            <p className="text-sm text-gray-500">
              Registra los datos del paciente y agenda su cita.
            </p>
          </div>
        </div>

        {/* Tu formulario (puedes dejar el tuyo y solo mejorar placeholders) */}
        <div className="px-6 py-5">
          <form action="/api/admin/create-appointment" method="POST" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Paciente (nombre completo)</label>
                <input name="patient" placeholder="María Fernanda Pérez" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" required />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Teléfono (con 57)</label>
                <input name="phone" placeholder="573001234567" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" pattern="^57\d{10}$" required />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Documento</label>
                <input name="document" placeholder="CC 1234567890" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Fecha</label>
                  <input type="date" name="date" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Hora</label>
                  <input type="time" name="time" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" required />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Odontólogo</label>
                <input name="doctor" placeholder="Dra. López" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Motivo</label>
                <input name="reason" placeholder="Control / Limpieza / Urgencia" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 font-semibold text-white hover:opacity-95"
              >
                Crear cita
              </button>
            </div>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            <strong>Recordatorio de WhatsApp:</strong> si configuraste el token y el cron,
            el paciente recibirá un mensaje automático el día anterior.
          </p>
        </div>
      </div>
    </div>
  );
}
