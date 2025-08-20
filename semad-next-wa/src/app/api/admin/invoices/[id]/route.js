// src/app/admin/invoices/[id]/page.jsx
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      items: { include: { procedure: true } },
    },
  });

  if (!inv) return <div className="p-6">Factura no encontrada.</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="flex items-start justify-between gap-4 print:mt-6">
        <div>
          <h1 className="text-xl font-semibold">SEMAD</h1>
          <div className="text-sm text-gray-600">NIT 000.000.000-0</div>
          <div className="text-sm text-gray-600">Calle 0 # 0-00 · Ciudad</div>
          <div className="text-sm text-gray-600">Tel: 000 000 0000</div>
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-sm">Folio</div>
          <div className="text-lg font-semibold">{inv.folio}</div>
          <div className="text-gray-500 text-sm">{new Date(inv.date).toLocaleString()}</div>
          <div className="mt-2">
            <img
              alt="QR"
              src={`/api/admin/invoices/${inv.id}/qr`}
              className="inline-block h-24 w-24"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="text-sm text-gray-500">Paciente</div>
        <div className="font-medium">{inv.patient.fullName}</div>
        <div className="text-sm text-gray-600">
          {inv.patient.document || "—"} · {inv.patient.phone || "—"}
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-gray-600">
            <th className="py-2 text-left">Código</th>
            <th className="py-2 text-left">Descripción</th>
            <th className="py-2 text-right">Cant.</th>
            <th className="py-2 text-right">Vlr. unitario</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it) => (
            <tr key={it.id} className="border-b last:border-0">
              <td className="py-2">{it.procedureCode}</td>
              <td className="py-2">
                {it.procedure?.name || "—"}
                {it.tooth ? ` · Pieza ${it.tooth}` : ""}
              </td>
              <td className="py-2 text-right">{it.quantity}</td>
              <td className="py-2 text-right">{money(it.unitPrice)}</td>
              <td className="py-2 text-right">{money(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="py-3 text-right font-semibold">Total</td>
            <td className="py-3 text-right font-semibold">{money(inv.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-6 flex gap-2 no-print">
        <button
          onClick={() => window.print()}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          Imprimir
        </button>
        <Link
          href={`/api/admin/invoices/${inv.id}/pdf`}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white"
        >
          Descargar PDF
        </Link>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
