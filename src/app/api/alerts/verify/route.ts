import { confirmVerificationToken } from "@/server/alerts/verification";

// The confirmation link itself opens /alerts/confirm, a read-only page; the
// token is only consumed here, by the button on that page. Mail scanners and
// link previews issue GETs, so a GET that consumed the token would "confirm"
// addresses nobody looked at and leave the real owner with a dead link.

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const outcome = await confirmVerificationToken(form?.get("token"));
  const status = outcome.ok ? (outcome.device ? `ok-${outcome.device}` : "ok") : outcome.reason;
  return Response.redirect(new URL(`/alerts/confirm?status=${status}`, request.url), 303);
}
