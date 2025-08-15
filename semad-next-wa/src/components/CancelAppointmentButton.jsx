"use client";

export default function CancelAppointmentButton({ id, onDone }) {
  async function cancel() {
    if (!confirm("¿Cancelar esta cita?")) return;
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelada" }),
    });
    const json = await res.json();
    if (json.ok) onDone?.();
    else alert("No se pudo cancelar");
  }

  return (
    <button
      onClick={cancel}
      className="text-red-600 hover:text-red-700 text-sm"
      type="button"
    >
      Cancelar
    </button>
  );
}
