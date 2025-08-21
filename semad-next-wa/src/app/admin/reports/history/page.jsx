// Server Component muy pequeño
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import ReportHistoryClient from "./ReportHistoryClient"; // <- client component (ver abajo)

export default function Page() {
  return <ReportHistoryClient />;
}
