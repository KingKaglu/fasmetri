"use client";

import { RotateCw } from "lucide-react";
import { ErrorState } from "@/components/public-ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell py-16">
      <ErrorState action={<button onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"><RotateCw className="size-4" /> ხელახლა ცდა</button>} />
    </section>
  );
}
