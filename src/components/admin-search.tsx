"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

// Debounced search box: updates the `q` URL param 400ms after typing stops,
// so server components re-render with fresh results without a submit button.
export function AdminDebouncedSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValue(urlQuery), [urlQuery]);
  useEffect(() => setPending(false), [searchParams]);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    params.delete("page");
    const text = params.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  function onChange(next: string) {
    setValue(next);
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 400);
  }

  return (
    <span className="relative block min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#e4e4e7] bg-white pl-10 pr-10 text-sm font-bold text-[var(--brand)] outline-none focus:border-[#0a0a0a]"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-[var(--muted)]" />
        ) : value ? (
          <button
            type="button"
            aria-label="ძიების გასუფთავება"
            onClick={() => onChange("")}
            className="grid place-items-center rounded-full p-0.5 text-[var(--muted)] hover:text-[var(--brand)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </span>
    </span>
  );
}
