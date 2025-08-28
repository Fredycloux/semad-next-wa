// src/components/ConfirmDeleteButton.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDeleteButton({
  url,                    // opcional: endpoint DELETE (ej: "/api/admin/invoices/123")
  onDelete,               // opcional: función async personalizada
  label = "Eliminar",
  confirmingLabel = "Eliminando…",
  confirmText = "¿Seguro que deseas eliminar? Esta acción no se puede deshacer.",
  afterDeleteHref = "",   // si se pasa, hace replace() a esa ruta; si no, refresh()
  className = "text-sm text-red-600 hover:underline",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (loading) return;
    if (!window.confirm(confirmText)) return;

    setLoading(true);
    try {
      if (onDelete) {
        await onDelete();
      } else if (url) {
        const r = await fetch(url, { method: "DELETE" });
        let ok = r.ok;
        try {
          const j = await r.json();
          if (j?.ok === false) ok = false;
        } catch {
          /* ignore non-JSON */
        }
        if (!ok) throw new Error("No se pudo eliminar. Revisa el endpoint DELETE.");
      } else {
        throw new Error("ConfirmDeleteButton necesita 'url' u 'onDelete'.");
      }

      if (afterDeleteHref) {
        router.replace(afterDeleteHref);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert(e.message || "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} disabled={loading} onClick={handle}>
      {loading ? confirmingLabel : label}
    </button>
  );
}
