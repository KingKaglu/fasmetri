import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/search" className="grid w-full gap-2 rounded-[1.2rem] border border-[#d9e4f2] bg-white/95 p-1.5 shadow-[0_14px_36px_rgba(0,84,210,.1)] sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="flex min-w-0 items-center gap-2.5 rounded-[0.95rem] bg-[#f8fafc] px-3.5">
        <Search className="size-5 shrink-0 text-[#0054d2]" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="მოძებნე iPhone, ლეპტოპი, ტელევიზორი..."
          className={`${large ? "h-12 text-base" : "h-11 text-sm sm:text-base"} w-full bg-transparent font-semibold text-[#12203a] outline-none placeholder:text-[#64748b]`}
        />
      </label>
      <button className="h-11 min-w-24 rounded-[0.95rem] bg-[#ff6800] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(255,104,0,.2)] hover:bg-[#e85f00] sm:h-auto">
        პროდუქტის ძებნა
      </button>
    </form>
  );
}
