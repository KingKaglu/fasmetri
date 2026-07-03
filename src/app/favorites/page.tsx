import { Metadata } from "next";
import { Heart } from "lucide-react";
import { FavoritesList } from "@/components/favorites-list";

export const metadata: Metadata = {
  title: "ფავორიტები",
  description: "შენახული პროდუქტები — შენი ფავორიტების სია ფასმეტრზე.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/favorites" },
};

export default function FavoritesPage() {
  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <p className="eyebrow inline-flex items-center gap-1.5">
          <Heart className="size-3.5" /> შენახული
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">ფავორიტები</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
          გულით მონიშნული პროდუქტები ერთ სიაში — ინახება ამ ბრაუზერში, რეგისტრაციის გარეშე.
        </p>
      </div>
      <FavoritesList />
    </section>
  );
}
