import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (n)=> new Intl.NumberFormat("es-CO").format(Number(n||0));

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")) : null;
  const to   = searchParams.get("to")   ? new Date(searchParams.get("to"))   : null;
  const fmt  = (searchParams.get("format") || "json").toLowerCase();

  // 1) items base
  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
    select: { id:true, sku:true, name:true, stock:true, minStock:true }
  });

  // 2) costos y movimientos dentro del rango
  const [ins, outs] = await Promise.all([
    prisma.inventoryMovement.groupBy({
      by: ["itemId"],
      where: {
        type: "IN",
        ...(from||to ? { date: { gte: from||undefined, lte: to||undefined } } : {})
      },
      _sum: { qty:true, unitCost:true }, // ojo: unitCost no se suma para valorar, solo dejamos acá
    }),
    prisma.inventoryMovement.groupBy({
      by: ["itemId"],
      where: {
        type: "OUT",
        ...(from||to ? { date: { gte: from||undefined, lte: to||undefined } } : {})
      },
      _sum: { qty:true },
    }),
  ]);

  // 3) último costo conocido (para valorar stock)
  //    (latest IN por item)
  const lastInPerItem = Object.fromEntries(
    await Promise.all(items.map(async (it)=>{
      const last = await prisma.inventoryMovement.findFirst({
        where: { itemId: it.id, type: "IN", unitCost: { not: null } },
        orderBy: { date: "desc" },
        select: { unitCost:true }
      });
      return [it.id, last?.unitCost ?? 0];
    }))
  );

  // 4) armar filas
  const inMap  = Object.fromEntries(ins.map(x=>[x.itemId, x._sum.qty || 0]));
  const outMap = Object.fromEntries(outs.map(x=>[x.itemId, x._sum.qty || 0]));

  const rows = items.map(it=>{
    const lastCost = lastInPerItem[it.id] || 0;
    const value = (it.stock||0) * (lastCost||0);
    return {
      sku: it.sku,
      name: it.name,
      stock: it.stock || 0,
      minStock: it.minStock || 0,
      lastUnitCost: lastCost,
      value,
      movedIn: inMap[it.id] || 0,
      movedOut: outMap[it.id] || 0,
      low: (it.minStock ?? 0) > 0 && (it.stock||0) <= (it.minStock||0),
    };
  });

  // 5) KPIs
  const kpis = {
    skuCount: rows.length,
    totalUnits: rows.reduce((s,r)=>s+r.stock,0),
    totalValue: rows.reduce((s,r)=>s+r.value,0),
    lowStockCount: rows.filter(r=>r.low).length,
  };

  if (fmt === "csv") {
    const header = "SKU,Nombre,Stock,Mínimo,Último costo,Valor,Ingresos,Salidas\n";
    const lines = rows.map(r=>
      [r.sku, r.name, r.stock, r.minStock, r.lastUnitCost, r.value, r.movedIn, r.movedOut]
        .map(v=> `"${String(v??"").replaceAll('"','""')}"`).join(",")
    ).join("\n");
    const csv = header + lines;
    return new Response(csv, {
      headers:{
        "Content-Type":"text/csv; charset=utf-8",
        "Content-Disposition":"attachment; filename=inventario.csv",
        "Cache-Control":"no-store",
      }
    });
  }

  return Response.json({ ok:true, kpis, rows });
}
