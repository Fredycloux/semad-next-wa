"use client";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default function DeleteInvoiceButton({ id }) {
  return (
    <ConfirmDeleteButton
      label="Eliminar"
      confirmingLabel="Eliminando..."
      confirmText="¿Eliminar esta factura? Esta acción no se puede deshacer."
      onDelete={async () => {
        const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "No se pudo eliminar la factura");
      }}
      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
    />
  );
}
