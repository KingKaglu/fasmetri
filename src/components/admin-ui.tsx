import { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";

type AdminTone = "neutral" | "good" | "warn" | "danger" | "info";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <section className="shell py-4 sm:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <AdminNav />
        <div className="grid min-w-0 flex-1 content-start gap-5">{children}</div>
      </div>
    </section>
  );
}

export function AdminLoginShell({ children }: { children: ReactNode }) {
  return (
    <section className="shell grid min-h-[70vh] place-items-center py-8">
      {children}
    </section>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-[1.15rem] border border-[#c8d7bd] bg-[#151713] p-4 text-white shadow-[0_22px_54px_rgba(18,19,15,0.14)] sm:rounded-[1.4rem] sm:p-5">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_75%_30%,rgba(187,244,81,0.34),transparent_36%),linear-gradient(135deg,transparent,rgba(255,255,255,0.07))]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p> : null}
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm font-bold leading-6 text-white/64">{description}</p> : null}
        </div>
        {children ? <div className="relative z-10">{children}</div> : null}
      </div>
    </header>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: AdminTone;
}) {
  return (
    <article className="rounded-[1.1rem] border border-[#c8d7bd] bg-white/92 p-4 shadow-[0_12px_30px_rgba(18,19,15,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-black tabular-nums sm:text-3xl ${toneClass(tone)}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">{detail}</p> : null}
    </article>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  className = "",
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-[1.15rem] border border-[#c8d7bd] bg-white/92 shadow-[0_12px_30px_rgba(18,19,15,0.07)] ${className}`}>
      {(title || description || actions) ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dbe5d3] bg-[#f8fbf4] px-4 py-3">
          <div>
            {title ? <h2 className="text-base font-black text-[var(--brand)]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm font-bold leading-5 text-[var(--muted)]">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminStatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${pillClass(tone)}`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[#c8d7bd] bg-[#f8fbf4] p-6 text-center">
      <p className="text-base font-black text-[var(--brand)]">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function AdminCodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="max-h-52 overflow-auto rounded-xl border border-[#263024] bg-[#151713] p-3 text-xs font-bold leading-5 text-[#dff8bd]">
      {children}
    </pre>
  );
}

export function AdminKeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#dbe5d3] bg-[#f8fbf4] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <div className="mt-1 break-words text-sm font-black text-[var(--brand)]">{value}</div>
    </div>
  );
}

function toneClass(tone: AdminTone) {
  if (tone === "good") return "text-[#1c8b43]";
  if (tone === "warn") return "text-[#a45a12]";
  if (tone === "danger") return "text-[#d9412f]";
  if (tone === "info") return "text-[#087d8f]";
  return "text-[var(--brand)]";
}

function pillClass(tone: AdminTone) {
  if (tone === "good") return "border-[#bfeecf] bg-[var(--savings-soft)] text-[var(--savings)]";
  if (tone === "warn") return "border-[#ffdca6] bg-[var(--warn-soft)] text-[var(--warn)]";
  if (tone === "danger") return "border-[#f3bbb3] bg-[#fff1ef] text-[var(--danger)]";
  if (tone === "info") return "border-[#b8edf2] bg-[var(--aqua-soft)] text-[#087d8f]";
  return "border-[#c8d7bd] bg-[#eef4e7] text-[var(--muted-strong)]";
}
