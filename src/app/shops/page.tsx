import { Metadata } from "next";
import { Store } from "lucide-react";
import { listPublicShops } from "@/lib/catalog";
import { ShopCard } from "@/components/shop-card";
import { EmptyState } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "მაღაზიები",
  description: "ნახე ფასმეტრში შედარებისთვის ხელმისაწვდომი ქართული ონლაინ მაღაზიები.",
  alternates: { canonical: "/shops" },
};
export const revalidate = 600;

export default async function ShopsPage() {
  const shops = await listPublicShops();
  const ordered = [...shops].sort((left, right) => {
    const activeLeft = Number(left.enabled && !left.needsConfiguration && Boolean(left.lastScrapedAt));
    const activeRight = Number(right.enabled && !right.needsConfiguration && Boolean(right.lastScrapedAt));
    return activeRight - activeLeft || (right.productCount ?? 0) - (left.productCount ?? 0);
  });
  const activeShops = ordered.filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-6 border-b border-[#e2e8f0] pb-4">
        <p className="eyebrow inline-flex items-center gap-1.5 text-[#65a30d]"><Store className="size-3.5" /> ქართული მაღაზიები</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl">მაღაზიები</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">აქტიური მაღაზიები პირველ რიგში ჩანს, ხოლო ახალი მაღაზიები ფასმეტრში ეტაპობრივად ემატება.</p>
        <p className="mt-1.5 max-w-2xl text-xs font-bold leading-5 text-[#64748b]">
          ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
        </p>
      </div>
      {activeShops.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div> : (
        <EmptyState icon="store" title="მაღაზიები დროებით მიუწვდომელია" description="დაბრუნდი ცოტა მოგვიანებით, როცა მაღაზიების შეთავაზებები განახლდება." />
      )}
    </section>
  );
}
