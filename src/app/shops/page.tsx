import { Metadata } from "next";
import { Store } from "lucide-react";
import { getCatalogStats, listPublicShops } from "@/lib/catalog";
import { ShopCard } from "@/components/shop-card";
import { EmptyState } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "მაღაზიები",
  description: "ნახე ფასმეტრში შედარებისთვის ხელმისაწვდომი ქართული ონლაინ მაღაზიები.",
  alternates: { canonical: "/shops" },
};
export const revalidate = 600;

export default async function ShopsPage() {
  // Same shared source as the homepage and filters: only publicly active shops.
  const [activeShops, stats] = await Promise.all([listPublicShops(), getCatalogStats()]);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <p className="eyebrow inline-flex items-center gap-1.5"><Store className="size-3.5" /> ქართული მაღაზიები</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">მაღაზიები</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
          ამჟამად ფასმეტრი ადარებს {activeShops.length.toLocaleString()} აქტიურ მაღაზიას ({stats.products.toLocaleString()} პროდუქტი). ახალი მაღაზიები ეტაპობრივად ემატება.
        </p>
        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-gray-400">
          ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
        </p>
      </div>
      {activeShops.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div> : (
        <EmptyState icon="store" title="მაღაზიები დროებით მიუწვდომელია" description="დაბრუნდი ცოტა მოგვიანებით, როცა მაღაზიების შეთავაზებები განახლდება." />
      )}
    </section>
  );
}
