"use client";

export default function DentistRow({ dentist }) {
  async function toggleActive() {
    const res = await fetch(`/api/admin/dentists/${dentist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !dentist.active }),
    });
    if (res.ok) location.reload();
    else alert("No se pudo actualizar");
  }

  async function remove() {
    if (!confirm("¿Eliminar este odontólogo?")) return;
    const res = await fetch(`/api/admin/dentists/${dentist.id}`, { method: "DELETE" });
    if (res.ok) location.reload();
    else alert("No se pudo eliminar");
  }

  return (
    <div className="p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">{dentist.name}</div>
        <div className="text-xs text-gray-500">{dentist.active ? "Activo" : "Inactivo"}</div>
      </div>

      <div className="flex gap-3">
        <button onClick={toggleActive} className="text-sm text-violet-700 hover:underline">
          {dentist.active ? "Inactivar" : "Activar"}
        </button>
        <button onClick={remove} className="text-sm text-rose-700 hover:underline">
          Eliminar
        </button>
      </div>
    </div>
  );
}
