"use client";
import { useRouter } from "next/navigation";

export default function CancelAppointmentButton({ id }) {
  const router = useRouter();

  async function cancel() {
    if (!confirm("¿Cancelar esta cita?")) return;
    await fetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
    router.refresh(); // <- sin pasar funciones del server
  }

  return (
    <button
      onClick={cancel}
      className="text-sm text-red-600 hover:underline"
    >
      Cancelar
    </button>
  );
}
