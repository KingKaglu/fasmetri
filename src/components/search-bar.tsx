import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form
      action="/search"
      className="flex w-full overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_18px_45px_rgba(18,19,15,0.16)] ring-1 ring-black/5"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 px-3 min-[380px]:gap-3 min-[380px]:px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--brand)]">
          <Search className="size-4" />
        </span>
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="მოძებნე iPhone, MacBook, Galaxy..."
          className={`${large ? "h-14 text-base" : "h-12 text-sm"} w-full bg-transparent font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]`}
        />
      </label>
      <button
        type="submit"
        className={`${large ? "h-14 px-4 text-sm min-[380px]:px-7" : "h-12 px-3 text-sm min-[380px]:px-5"} shrink-0 bg-[var(--accent)] font-black text-[var(--accent-ink)] hover:bg-[#d7ff73]`}
      >
        ძებნა
      </button>
    </form>
  );
}
