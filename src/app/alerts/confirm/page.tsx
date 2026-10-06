import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { previewVerificationToken } from "@/server/alerts/verification";

// Double opt-in landing page. GET only READS the token (mail scanners and link
// previews prefetch links); the visitor's button press POSTs to
// /api/alerts/verify, which consumes it and redirects back here with ?status=.

export const metadata: Metadata = {
  title: "ელფოსტის დადასტურება",
  robots: { index: false, follow: false },
};

// Each token is different and single-use: never cache this page.
export const dynamic = "force-dynamic";

type Params = Promise<{ token?: string | string[]; status?: string | string[] }>;

const RESULT: Record<string, { ok: boolean; title: string; body: string }> = {
  ok: {
    ok: true,
    title: "ელფოსტა დადასტურებულია",
    body: "ფასის შეტყობინებები და მოთხოვნები ამ მისამართზე ახლა ჩართულია. ფასის დაკლებისას მოგწერთ.",
  },
  "ok-browser": {
    ok: true,
    title: "დადასტურებულია",
    body: "ელფოსტა და ამ ბრაუზერის შეტყობინებები ჩართულია. ფასის დაკლებისას აქაც მიიღებ შეტყობინებას.",
  },
  "ok-app": {
    ok: true,
    title: "დადასტურებულია",
    body: "ელფოსტა და ფასმეტრის აპის შეტყობინებები ჩართულია.",
  },
  used: {
    ok: false,
    title: "ბმული უკვე გამოყენებულია",
    body: "ეს ბმული ერთჯერადია და უკვე დადასტურდა. თუ შეტყობინებები მაინც არ მოდის, დააყენე შეტყობინება თავიდან და ახალი ბმული მოგივა.",
  },
  expired: {
    ok: false,
    title: "ბმულს ვადა გაუვიდა",
    body: "დადასტურების ბმული 24 საათი მოქმედებს. დააყენე შეტყობინება თავიდან და ახალ ბმულს გამოგიგზავნით.",
  },
  invalid: {
    ok: false,
    title: "ბმული არასწორია",
    body: "ბმული ვერ ვიცანით. შეამოწმე, რომ წერილიდან სრულად დააკოპირე, ან დააყენე შეტყობინება თავიდან.",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const status = first(params.status);
  const token = first(params.token);

  if (status && RESULT[status]) return <Result {...RESULT[status]} />;

  const preview = await previewVerificationToken(token);
  if (preview.state !== "valid") return <Result {...RESULT[preview.state]} />;

  const what =
    preview.device === "browser"
      ? "ფასის შეტყობინებები ელფოსტაზე და ბრაუზერის push-შეტყობინებები"
      : preview.device === "app"
        ? "ფასის შეტყობინებები ელფოსტაზე და ფასმეტრის აპში"
        : "ფასის შეტყობინებები და მოთხოვნები ელფოსტაზე";

  return (
    <section className="shell py-10 sm:py-14">
      <div className="mx-auto max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-sm">
        <MailCheck className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="font-display mt-3 text-2xl font-bold text-ink">დაადასტურე ელფოსტა</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          მისამართი <strong className="text-ink">{preview.maskedEmail}</strong> — {what}.
        </p>
        <form method="post" action="/api/alerts/verify" className="mt-5">
          <input type="hidden" name="token" value={token} />
          <button className="h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
            დადასტურება
          </button>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted">თუ ეს შენ არ მოგითხოვია, უბრალოდ დახურე გვერდი — არაფერი ჩაირთვება.</p>
      </div>
    </section>
  );
}

function Result({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <section className="shell py-10 sm:py-14">
      <div className="mx-auto max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-sm">
        <Icon className={`mx-auto size-10 ${ok ? "text-savings" : "text-danger"}`} aria-hidden />
        <h1 className="font-display mt-3 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{body}</p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-soft">
          მთავარ გვერდზე
        </Link>
      </div>
    </section>
  );
}
