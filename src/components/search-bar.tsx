import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form
      action="/search"
      className="flex w-full overflow-hidden rounded-md border border-[#0f172a] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 px-3.5">
        <Search className="size-4 shrink-0 text-[#64748b]" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="მოძებნე iPhone 17, MacBook, Galaxy S26..."
          className={`${large ? "h-12 text-[15px]" : "h-11 text-sm"} w-full bg-transparent font-medium text-[#0f172a] outline-none placeholder:text-[#94a3b8]`}
        />
      </label>
      <button
        type="submit"
        className={`${large ? "h-12 px-7 text-sm" : "h-11 px-5 text-sm"} shrink-0 bg-[#84cc16] font-black text-[#1a2e05] hover:bg-[#65a30d] hover:text-white`}
      >
        ძებნა
      </button>
    </form>
  );
}
