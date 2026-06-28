import Link from "next/link";
import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";

type AdminTone = "neutral" | "good" | "warn" | "danger" | "info";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <section className="shell py-4 pb-24 sm:py-8 lg:pb-8">
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

export type AdminCrumb = { label: string; href?: string };

export function AdminBreadcrumbs({ items }: { items: AdminCrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
      {items.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <ChevronRight className="size-3 opacity-60" /> : null}
          {crumb.href ? (
            <Link href={crumb.href} className="transition hover:text-white">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-[var(--accent)]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: AdminCrumb[];
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-[1.15rem] border border-[#c8d7bd] bg-[#151713] p-4 text-white shadow-[0_22px_54px_rgba(18,19,15,0.14)] sm:rounded-[1.4rem] sm:p-5">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_75%_30%,rgba(187,244,81,0.34),transparent_36%),linear-gradient(135deg,transparent,rgba(255,255,255,0.07))]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {breadcrumbs?.length ? <AdminBreadcrumbs items={breadcrumbs} /> : null}
          {!breadcrumbs?.length && eyebrow ? (
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm font-bold leading-6 text-white/64">{description}</p> : null}
        </div>
        {children ? <div className="relative z-10 flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}

export type AdminTrend = {
  delta: number;
  label: string;
  // When a rising number is bad (e.g. unlinked offers), flip the coloring.
  downIsGood?: boolean;
};

export function AdminMetricCard({
  label,
  value,
  detail,
  tone = "neutral",
  trend,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: AdminTone;
  trend?: AdminTrend;
}) {
  return (
    <article className="rounded-[1.1rem] border border-[#c8d7bd] bg-white/92 p-4 shadow-[0_12px_30px_rgba(18,19,15,0.07)]">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <p className={`text-2xl font-black tabular-nums sm:text-3xl ${toneClass(tone)}`}>{value}</p>
        {trend ? <AdminTrendBadge trend={trend} /> : null}
      </div>
      {detail ? <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">{detail}</p> : null}
    </article>
  );
}

function AdminTrendBadge({ trend }: { trend: AdminTrend }) {
  const up = trend.delta > 0;
  const flat = trend.delta === 0;
  const good = flat ? null : trend.downIsGood ? !up : up;
  const color = flat ? "text-[var(--muted)]" : good ? "text-[#1c8b43]" : "text-[#d9412f]";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-black tabular-nums ${color}`} title={trend.label}>
      <Icon className="size-3.5" />
      {flat ? "0" : `${up ? "+" : ""}${trend.delta}`}
      <span className="font-bold text-[var(--muted)]"> {trend.label}</span>
    </span>
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

// Health indicator: colored dot + label, reads faster than a text badge.
export function AdminStatusDot({
  tone,
  label,
  pulse = false,
}: {
  tone: "good" | "warn" | "danger";
  label?: ReactNode;
  pulse?: boolean;
}) {
  const color = tone === "good" ? "bg-[#22c55e]" : tone === "warn" ? "bg-[#eab308]" : "bg-[#ef4444]";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--muted-strong)]">
      <span className="relative inline-flex size-2.5">
        {pulse ? <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${color}`} /> : null}
        <span className={`relative inline-flex size-2.5 rounded-full ${color}`} />
      </span>
      {label}
    </span>
  );
}

// Visual confidence meter: green >= 85, yellow 70-84, red below.
export function AdminConfidenceBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 85 ? "bg-[#22c55e]" : clamped >= 70 ? "bg-[#eab308]" : "bg-[#ef4444]";
  const text = clamped >= 85 ? "text-[#1c8b43]" : clamped >= 70 ? "text-[#a45a12]" : "text-[#d9412f]";
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7eede]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-black tabular-nums ${text}`}>{clamped}%</span>
    </div>
  );
}

// Quick action card: bigger touch target than a button, with icon + hint text.
export function AdminActionCard({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-[1.1rem] border border-[#c8d7bd] bg-white p-4 shadow-[0_10px_24px_rgba(18,19,15,0.06)] transition hover:-translate-y-0.5 hover:border-[#151713] hover:shadow-[0_16px_34px_rgba(18,19,15,0.12)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#151713] text-white">{icon}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-[var(--brand)]">{title}</span>
          {badge}
        </span>
        {description ? <span className="mt-0.5 block text-xs font-bold leading-5 text-[var(--muted)]">{description}</span> : null}
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 self-center text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" />
    </Link>
  );
}

// Deterministic letter avatar for shops (no logo assets needed).
const SHOP_AVATAR_COLORS = ["#1c8b43", "#087d8f", "#7c3aed", "#a45a12", "#d9412f", "#2563eb"];

export function AdminShopAvatar({ name, slug }: { name: string; slug: string }) {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  const color = SHOP_AVATAR_COLORS[hash % SHOP_AVATAR_COLORS.length];
  return (
    <span
      className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black uppercase text-white"
      style={{ backgroundColor: color }}
      title={name}
    >
      {name.slice(0, 1)}
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
  if (tone === "warn") return "border-[#d4d4d8] bg-[var(--warn-soft)] text-[var(--warn)]";
  if (tone === "danger") return "border-[#d4d4d8] bg-[#f4f4f5] text-[var(--danger)]";
  if (tone === "info") return "border-[#b8edf2] bg-[var(--aqua-soft)] text-[#087d8f]";
  return "border-[#c8d7bd] bg-[#eef4e7] text-[var(--muted-strong)]";
}
