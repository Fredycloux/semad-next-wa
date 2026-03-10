// src/app/admin/invoices/page.jsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation"; // 👈
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

function fmt(n) {
  return new Intl.NumberFormat("es-CO").format(Number(n||0));
}

export default function InvoicesPage() {
  const router = useRouter(); 
  const [patientQ, setPatientQ] = useState("");
  const [patientOpts, setPatientOpts] = useState([]);
  const [patient, setPatient] = useState(null);

  const [procedures, setProcedures] = useState([]);
  const [lines, setLines] = useState([]); // {procedureCode,name,quantity,tooth,unitPrice,variable,hint}
  const [saving, setSaving] = useState(false);

  const [recent, setRecent] = useState([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const INVOICE_LIMIT = 10;

  async function loadInvoices(page = 1, append = false) {
    const j = await fetch(`/api/admin/invoices?page=${page}&limit=${INVOICE_LIMIT}`)
      .then((r) => r.json());
    const items = j.items || [];
    setRecent((prev) => append ? [...prev, ...items] : items);
    setInvoiceTotal(j.pagination?.total || 0);
  }

  // carga procedimientos y facturas recientes
  useEffect(() => {
    fetch("/api/admin/procedures")
      .then((r) => r.json())
      .then((j) => {
        const arr = (j.items || []).filter((p) => p.active !== false);
        setProcedures(arr);
      });
    loadInvoices(1);
  }, []);

  // buscar paciente
  useEffect(() => {
    const t = setTimeout(() => {
      const q = patientQ.trim();
      if (!q) {
        setPatientOpts([]);
        return;
      }
      fetch(`/api/admin/patients/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => setPatientOpts(j.items || []));
    }, 300);
    return () => clearTimeout(t);
  }, [patientQ]);

  function addLine(proc) {
    setLines((ls) => {
      const existsIdx = ls.findIndex(
        (l) => l.procedureCode === proc.code && l.tooth === null
      );
      const variable = !!proc.variable;
      const unitPrice = variable ? proc.minPrice ?? 0 : proc.price ?? 0;
      const hint = variable
        ? proc.minPrice && proc.maxPrice
          ? `Rango $${fmt(proc.minPrice)}–$${fmt(proc.maxPrice)}`
          : proc.minPrice
          ? `Desde $${fmt(proc.minPrice)}`
          : "Variable"
        : proc.unit
        ? `$ ${fmt(proc.price)} (${proc.unit})`
        : `$ ${fmt(proc.price)}`;
      if (existsIdx >= 0) {
        const copy = [...ls];
        copy[existsIdx] = {
          ...copy[existsIdx],
          quantity: copy[existsIdx].quantity + 1,
        };
        return copy;
      }
      return ls.concat({
        procedureCode: proc.code,
        name: proc.name,
        quantity: 1,
        tooth: null,
        unitPrice: unitPrice || 0,
        variable,
        hint,
      });
    });
  }

  function updateLine(i, patch) {
    setLines((ls) => {
      const copy = [...ls];
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  }
  function removeLine(i) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  const total = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0),
        0
      ),
    [lines]
  );

  async function save() {
    if (!patient) { alert("Selecciona un paciente"); return; }
    if (lines.length === 0) { alert("Agrega al menos un ítem"); return; }

    setSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        items: lines.map((l) => ({
          procedureCode: l.procedureCode,
          quantity: Number(l.quantity || 1),
          tooth: l.tooth || null,
          unitPrice: Number(l.unitPrice || 0),
        })),
      };
      const r = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");

      // Redirige al detalle de la factura
      //location.href = `/admin/invoices/${j.invoice.id}`;
        router.push(`/admin/invoices/${j.invoice.id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Facturación</h1>

      {/* Selector de paciente */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Paciente</div>
        {!patient ? (
          <>
            <input
              value={patientQ}
              onChange={(e) => setPatientQ(e.target.value)}
              placeholder="Buscar por cédula o nombre…"
              className="w-full border rounded-lg px-3 py-2"
            />
            {patientOpts.length > 0 && (
              <ul className="rounded-lg border divide-y">
                {patientOpts.map((p) => (
                  <li
                    key={p.id}
                    className="p-2 hover:bg-violet-50 cursor-pointer"
                    onClick={() => {
                      setPatient(p);
                      setPatientOpts([]);
                    }}
                  >
                    <div className="font-medium">{p.fullName}</div>
                    <div className="text-xs text-gray-600">
                      {p.document || "—"} {p.phone ? `· ${p.phone}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <div className="font-medium">{patient.fullName}</div>
              <div className="text-xs text-gray-600">
                {patient.document || "—"} {patient.phone ? `· ${patient.phone}` : ""}
              </div>
            </div>
            <button
              onClick={() => setPatient(null)}
              className="text-sm text-violet-700 hover:underline"
            >
              Cambiar
            </button>
          </div>
        )}
      </section>

      {/* Agregar procedimientos */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Agregar ítems</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {procedures.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => addLine(p)}
              className="text-left rounded-lg border px-3 py-2 hover:bg-violet-50"
            >
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-gray-600">
                {p.code} ·{" "}
                {p.variable
                  ? p.minPrice && p.maxPrice
                    ? `Rango $ ${fmt(p.minPrice)} – $ ${fmt(p.maxPrice)}${p.unit ? ` (${p.unit})` : ""}`
                    : p.minPrice
                    ? `Desde $ ${fmt(p.minPrice)}${p.unit ? ` (${p.unit})` : ""}`
                    : "Variable"
                  : `$ ${fmt(p.price)}${p.unit ? ` (${p.unit})` : ""}`}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Ítems de la factura */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Detalle</div>
        {lines.length === 0 ? (
          <div className="text-sm text-gray-500">Sin ítems</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="p-2">Procedimiento</th>
                  <th className="p-2">Diente</th>
                  <th className="p-2">Cant.</th>
                  <th className="p-2">P. unitario</th>
                  <th className="p-2">Subtotal</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const subtotal =
                    Number(l.quantity || 0) * Number(l.unitPrice || 0);
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-gray-500">
                          {l.procedureCode} {l.hint ? `· ${l.hint}` : ""}
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          value={l.tooth || ""}
                          onChange={(e) =>
                            updateLine(i, { tooth: e.target.value })
                          }
                          placeholder="opcional"
                          className="border rounded px-2 py-1 w-24"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(i, {
                              quantity: Number(e.target.value || 1),
                            })
                          }
                          className="border rounded px-2 py-1 w-20"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) =>
                            updateLine(i, {
                              unitPrice: Number(e.target.value || 0),
                            })
                          }
                          className="border rounded px-2 py-1 w-32"
                        />
                      </td>
                      <td className="p-2 font-medium">$ {fmt(subtotal)}</td>
                      <td className="p-2">
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => removeLine(i)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 border-t pt-3">
          <div className="text-lg font-semibold">Total: $ {fmt(total)}</div>
          <button
            disabled={saving || lines.length === 0 || !patient}
            onClick={save}
            className="rounded-lg bg-violet-600 text-white px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar factura"}
          </button>
        </div>
      </section>

      {/* Recientes */}
      <section className="rounded-xl border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">
            Facturas recientes
            {invoiceTotal > 0 && (
              <span className="ml-2 text-xs text-gray-500 font-normal">({invoiceTotal} total)</span>
            )}
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="text-sm text-gray-500">Aún no hay facturas.</div>
        ) : (
          <>
            <ul className="text-sm divide-y">
              {recent.map((f) => (
                <li key={f.id} className="py-2 flex items-center justify-between">
                  <a
                    href={`/admin/invoices/${f.id}`}
                    className="group flex-1 min-w-0"
                    title="Abrir detalle"
                  >
                    <div className="font-medium group-hover:underline truncate">
                      {new Date(f.date).toLocaleString()}
                    </div>
                    <div className="text-gray-600 truncate">
                      {f.patient?.fullName || "—"}
                      {f.patient?.document ? ` · ${f.patient.document}` : ""}
                    </div>
                  </a>

                  <div className="flex items-center gap-3 pl-3">
                    <div className="font-semibold whitespace-nowrap">
                      $ {fmt(f.total || f.items?.reduce?.((s, it) => s + (it.subtotal || 0), 0))}
                    </div>
                    <a
                      href={`/admin/invoices/${f.id}`}
                      className="text-sm text-violet-700 hover:underline"
                    >
                      Ver
                    </a>

                    <ConfirmDeleteButton
                      label="Eliminar"
                      confirmingLabel="Eliminando..."
                      confirmText="¿Eliminar esta factura? Esta acción no se puede deshacer."
                      onDelete={async () => {
                        const res = await fetch(`/api/admin/invoices/${f.id}`, { method: "DELETE" });
                        let ok = res.ok;
                        try {
                          const j = await res.json();
                          if (j?.ok === false) ok = false;
                        } catch {/* ignore non-JSON */}
                        if (!ok) throw new Error("No se pudo eliminar");
                        setRecent(prev => prev.filter(x => x.id !== f.id));
                        setInvoiceTotal(prev => prev - 1);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {recent.length < invoiceTotal && (
              <button
                onClick={() => {
                  const next = invoicePage + 1;
                  setInvoicePage(next);
                  loadInvoices(next, true);
                }}
                className="w-full mt-2 py-2 text-sm text-violet-700 hover:underline border rounded-lg"
              >
                Ver más ({invoiceTotal - recent.length} restantes)
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
