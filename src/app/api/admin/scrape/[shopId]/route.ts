import { isAdminRequest } from "@/lib/admin-auth";
import { SYNC_MODULES, dispatchWorkflow, githubConfigured } from "@/lib/admin-sync-status";
import { prisma } from "@/lib/prisma";

// "Run scrape" for a shop = dispatch its GitHub Actions sync workflow(s).
// The old generic HTML scraper is gone; per-store staged syncs replaced it.
export async function POST(_: Request, context: { params: Promise<{ shopId: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
  if (!githubConfigured()) {
    return Response.json({ error: "GITHUB_TOKEN is not configured — cannot dispatch sync workflows." }, { status: 500 });
  }

  const { shopId } = await context.params;
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true, name: true } });
  if (!shop) return Response.json({ error: "Shop not found." }, { status: 404 });

  const workflows = [...new Set(SYNC_MODULES.filter((m) => m.shopSlug === shop.slug).map((m) => m.workflowFile))];
  if (!workflows.length) {
    return Response.json({ error: `No sync workflow is configured for ${shop.name}.` }, { status: 400 });
  }

  const dispatched: string[] = [];
  const failed: string[] = [];
  for (const workflow of workflows) {
    try {
      await dispatchWorkflow(workflow, { mode: "prices" });
      dispatched.push(workflow);
    } catch {
      failed.push(workflow);
    }
  }

  if (!dispatched.length) {
    return Response.json({ error: `Workflow dispatch failed for ${failed.join(", ")}.` }, { status: 502 });
  }
  return Response.json({ ok: true, dispatched, failed });
}
