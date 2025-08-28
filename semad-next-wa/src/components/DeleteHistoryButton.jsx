"use client";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default function DeleteHistoryButton({ id }) {
  return (
    <ConfirmDeleteButton
      label="Eliminar"
      confirmingLabel="Eliminando..."
      confirmText="¿Eliminar esta historia/nota clínica? Esta acción no se puede deshacer."
      onDelete={async () => {
        const res = await fetch(`/api/admin/histories/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "No se pudo eliminar la historia");
      }}
      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
    />
  );
}
