"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDeleteButton({
  onDelete,               // () => Promise<void>
  label = "Eliminar",
  confirmingLabel = "Eliminando...",
  confirmText = "¿Seguro que deseas eliminar? Esta acción no se puede deshacer.",
  className = "text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      await onDelete?.();
      // Fuerza revalidar la página actual (agenda, historias o facturación)
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? confirmingLabel : label}
    </button>
  );
}
