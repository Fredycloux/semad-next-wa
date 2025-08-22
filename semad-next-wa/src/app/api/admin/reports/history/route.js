import { historyPdfResponse } from "@/lib/pdf/historyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const id = req.nextUrl.searchParams.get("patientId");
  if (!id) return new Response("Falta patientId", { status: 400 });
  return historyPdfResponse(req, id);
}
