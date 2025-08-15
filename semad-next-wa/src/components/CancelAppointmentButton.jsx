"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CancelAppointmentButton({ id }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      if (!confirm("¿Cancelar esta cita?")) return;

      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // vuelve a pedir los datos del Server Component
        router.refresh();
      } else {
        const { error } = await res.json().catch(() => ({}));
        alert(`No se pudo cancelar: ${error ?? "error desconocido"}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
    >
      {isPending ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
