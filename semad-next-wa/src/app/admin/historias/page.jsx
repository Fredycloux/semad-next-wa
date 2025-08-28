// src/app/admin/historias/page.jsx
import HistoriasClient from "./HistoriasClient";

export const dynamic = "force-dynamic";

export default function HistoriasPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  return <HistoriasClient q={q} />;
}
