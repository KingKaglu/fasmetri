import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminReviewModeration } from "@/components/admin-review-moderation";
import {
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatusPill,
} from "@/components/admin-ui";
import { ReviewStars } from "@/components/review-stars";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

type Row = {
  id: string;
  authorName: string | null;
  rating: number;
  body: string;
  hidden: boolean;
  reply: string | null;
  ipHash: string | null;
  createdAt: Date;
};

export default async function AdminFeedbackPage() {
  if (!(await isAdminRequest())) {
    return (
      <AdminLoginShell>
        <AdminLogin />
      </AdminLoginShell>
    );
  }

  let rows: Row[] = [];
  let error: string | null = null;

  if (!prisma) {
    error = "DATABASE_URL not configured.";
  } else {
    try {
      rows = await prisma.siteReview.findMany({
        select: { id: true, authorName: true, rating: true, body: true, hidden: true, reply: true, ipHash: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
    } catch {
      error =
        "SiteReview table is missing. Apply prisma/migrations/20260919100000_add_site_review/migration.sql.";
    }
  }

  const visible = rows.filter((row) => !row.hidden);
  const hidden = rows.filter((row) => row.hidden);
  const average = visible.length ? visible.reduce((sum, row) => sum + row.rating, 0) / visible.length : 0;
  const lowRated = visible.filter((row) => row.rating <= 2);

  // Two reviews from one hashed IP is within the rate limit; more than that on
  // one page means the limit was bypassed (or the IP is a shared NAT) and the
  // rows are worth a second look.
  const ipCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.ipHash) continue;
    ipCounts.set(row.ipHash, (ipCounts.get(row.ipHash) ?? 0) + 1);
  }
  const repeatIps = [...ipCounts.values()].filter((count) => count > 2).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="საიტი"
        title="მომხმარებლების შეფასებები"
        description="საჯარო გვერდი /reviews — რეგისტრაციის გარეშე. დამალვა შექცევადია, წაშლა — არა."
      >
        <Link
          href="/reviews"
          target="_blank"
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0a0a0a]"
        >
          <ExternalLink className="size-4" />
          საჯარო გვერდი
        </Link>
      </AdminPageHeader>

      {error ? (
        <AdminPanel title="მიუწვდომელია">
          <p className="px-4 py-5 text-sm font-bold text-[#d9412f]">{error}</p>
        </AdminPanel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="გამოქვეყნებული" value={visible.length} detail={`სულ ${rows.length}`} />
        <AdminMetricCard
          label="საშუალო ქულა"
          value={visible.length ? average.toFixed(1) : "—"}
          detail="მხოლოდ ხილული"
          tone={visible.length && average < 3 ? "danger" : "neutral"}
        />
        <AdminMetricCard
          label="1–2 ვარსკვლავი"
          value={lowRated.length}
          detail="წასაკითხი უპირველესად"
          tone={lowRated.length ? "warn" : "neutral"}
        />
        <AdminMetricCard
          label="დამალული"
          value={hidden.length}
          detail={repeatIps ? `${repeatIps} IP 2+ ჩანაწერით` : "ლიმიტი დაცულია"}
          tone={repeatIps ? "warn" : "neutral"}
        />
      </div>

      <AdminPanel
        title="ყველა შეფასება"
        description={`ბოლო ${MAX_ROWS} ჩანაწერი, ახლიდან ძველისკენ.`}
      >
        {rows.length ? (
          <ul className="divide-y divide-[#ededee]">
            {rows.map((row) => (
              <li key={row.id} className="grid gap-3 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewStars rating={row.rating} size="sm" label={`${row.rating}/5`} />
                  <span className="text-sm font-black text-[var(--brand)]">
                    {row.authorName?.trim() || "ანონიმური"}
                  </span>
                  <span className="text-xs font-bold text-[var(--muted)]">{formatRelativeTime(row.createdAt)}</span>
                  {row.hidden ? <AdminStatusPill tone="danger">დამალული</AdminStatusPill> : null}
                  {row.reply ? <AdminStatusPill tone="good">ნაპასუხები</AdminStatusPill> : null}
                </div>

                <p className="whitespace-pre-line text-sm leading-6 text-[var(--brand)]">{row.body}</p>

                {row.reply ? (
                  <p className="border-l-2 border-[#e4e4e7] pl-3 text-sm leading-6 text-[var(--muted)]">
                    <span className="font-black">პასუხი:</span> {row.reply}
                  </p>
                ) : null}

                <AdminReviewModeration id={row.id} hidden={row.hidden} reply={row.reply} />
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState
            title="ჯერ არაფერია"
            description="როგორც კი ვინმე დატოვებს კომენტარს /reviews გვერდზე, აქ გამოჩნდება."
          />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
