"use client";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default function DeleteHistoryButton({ id }) {
  return (
    <ConfirmDeleteButton
      onDelete={async () => {
        const r = await fetch(`/api/admin/histories/${id}`, { method: "DELETE" });
        const j = await r.json();
        if (!j?.ok) throw new Error(j?.error || "No se pudo eliminar la historia");
      }}
      label="Eliminar"
      confirmingLabel="Eliminando…"
      confirmText="¿Eliminar esta nota/historia clínica? Esta acción no se puede deshacer."
      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
    />
  );
}
