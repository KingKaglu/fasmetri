import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { MATCHER_WORKFLOW_FILE, dispatchWorkflow } from "@/lib/admin-sync-status";

const input = z.object({
  workflow: z.string().min(1),
  mode: z.enum(["prices", "full"]).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid trigger request." }, { status: 400 });

  try {
    // Sync workflows have a required "mode" input; the matcher workflow has none.
    const inputs = parsed.data.workflow === MATCHER_WORKFLOW_FILE ? undefined : { mode: parsed.data.mode ?? "prices" };
    await dispatchWorkflow(parsed.data.workflow, inputs);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Trigger failed." }, { status: 500 });
  }
}
