"use client";

import { RotateCw } from "lucide-react";
import { ErrorState } from "@/components/public-ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell py-16">
      <ErrorState action={<button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0f172a] px-5 text-sm font-bold text-white hover:bg-black"><RotateCw className="size-4" /> ხელახლა ცდა</button>} />
    </section>
  );
}
