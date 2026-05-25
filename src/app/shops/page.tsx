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
export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const shops = await listPublicShops();
  const ordered = [...shops].sort((left, right) => {
    const activeLeft = Number(left.enabled && !left.needsConfiguration && Boolean(left.lastScrapedAt));
    const activeRight = Number(right.enabled && !right.needsConfiguration && Boolean(right.lastScrapedAt));
    return activeRight - activeLeft || (right.productCount ?? 0) - (left.productCount ?? 0);
  });
  const activeShops = ordered.filter((shop) => (shop.productCount ?? 0) > 0);
  const comingSoonShops = ordered.filter((shop) => (shop.productCount ?? 0) === 0 && shop.enabled);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-7 max-w-2xl">
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#0054d2]"><Store className="size-4" /> ქართული მაღაზიები</p>
        <h1 className="text-3xl font-black sm:text-4xl">მაღაზიები</h1>
        <p className="mt-2 leading-7 text-[#64748b]">აქტიური მაღაზიები პირველ რიგში ჩანს, ხოლო ახალი მაღაზიები ფასმეტრში ეტაპობრივად ემატება.</p>
      </div>
      {activeShops.length ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{activeShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div> : (
        <EmptyState icon="store" title="მაღაზიები დროებით მიუწვდომელია" description="დაბრუნდი ცოტა მოგვიანებით, როცა მაღაზიების შეთავაზებები განახლდება." />
      )}
      {comingSoonShops.length ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black">მალე დაემატება</h2>
          <p className="mt-2 max-w-2xl leading-7 text-[#64748b]">ამ მაღაზიების შეთავაზებები დამატებისთანავე გამოჩნდება შედარებაში.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{comingSoonShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div>
        </section>
      ) : null}
    </section>
  );
}
