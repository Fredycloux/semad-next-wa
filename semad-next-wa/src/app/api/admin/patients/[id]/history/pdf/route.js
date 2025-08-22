import { historyPdfResponse } from "@/lib/pdf/historyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const id = params?.id;
  if (!id) return new Response("ID inválido", { status: 400 });
  return historyPdfResponse(req, id);
}
