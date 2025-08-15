import { PrismaClient } from "@prisma/client";
import AddDentist from "@/components/AddDentist";
import DentistRow from "@/components/DentistRow";

export const metadata = { title: "Odontólogos | SEMAD" };

const prisma = new PrismaClient();

export default async function DentistsPage() {
  const dentists = await prisma.dentist.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Odontólogos</h1>
        <p className="text-sm text-gray-500">Gestión del personal odontológico.</p>
      </div>

      <AddDentist />

      <div className="rounded-xl border bg-white/70 backdrop-blur divide-y">
        {dentists.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No hay odontólogos registrados.</div>
        ) : (
          dentists.map((d) => <DentistRow key={d.id} dentist={d} />)
        )}
      </div>
    </div>
  );
}
