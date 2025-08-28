// src/app/admin/invoices/[id]/page.jsx


import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(v){ return new Intl.NumberFormat("es-CO").format(Number(v||0)); }

export default async function InvoiceDetailPage({ params }) {
  const id = params?.id;
  if (!id) return <div className="p-4">ID inválido</div>;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { patient: true, items: { include: { procedure: true } } },
  });
  if (!inv) return <div className="p-4">Factura no encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Factura {inv.folio || inv.id}</h1>
          <div className="text-sm text-gray-600">
            {new Date(inv.date).toLocaleString()}
          </div>
          <div className="mt-2 text-sm">
            <div className="font-medium">{inv.patient?.fullName}</div>
            <div className="text-gray-600">
              {inv.patient?.document || "—"} {inv.patient?.phone ? `· ${inv.patient.phone}` : ""}
            </div>
          </div>
        </div>

        {/* Acciones y QR */}
        <div className="flex flex-col items-center gap-3 text-right">
          <a
            href={`/api/admin/invoices/${inv.id}/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-block rounded-lg bg-violet-600 text-white px-4 py-2 hover:opacity-90"
          >
            Ver / Descargar PDF
          </a>

          <img
            src={`/api/admin/invoices/${inv.id}/qr`}
            alt="QR de la factura"
            className="w-32 h-32 border rounded"
          />
          {/* Si algún navegador te cachea el QR, usa esta variante: */}
          {/* <img
            src={`/api/admin/invoices/${inv.id}/qr?v=${new Date(inv.updatedAt || inv.date).getTime()}`}
            alt="QR de la factura"
            className="w-32 h-32 border rounded"
          /> */}
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="p-2">Código</th>
              <th className="p-2">Procedimiento</th>
              <th className="p-2">Diente</th>
              <th className="p-2">Cant.</th>
              <th className="p-2">P. unitario</th>
              <th className="p-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.procedureCode}</td>
                <td className="p-2">{it.procedure?.name || "—"}</td>
                <td className="p-2">{it.tooth || "—"}</td>
                <td className="p-2">{it.quantity}</td>
                <td className="p-2">$ {money(it.unitPrice)}</td>
                <td className="p-2">$ {money(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end text-lg font-semibold">
        Total: $ {money(inv.total)}
      </div>
    </div>
  );
}
