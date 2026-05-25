import { isAdminRequest } from "@/lib/admin-auth";
import { listScrapeRuns } from "@/lib/catalog";

export async function GET() {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  return Response.json({ runs: await listScrapeRuns() });
}
