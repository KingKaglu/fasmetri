import Link from "next/link";

export function AdminNav() {
  const items = [
    ["/admin", "დაფა"],
    ["/admin/shops", "მაღაზიები"],
    ["/admin/products", "პროდუქტები"],
    ["/admin/categories/review", "კატეგორიის review"],
    ["/admin/matching/review", "Matching review"],
    ["/admin/variants/review", "Variant review"],
    ["/admin/catalog-coverage", "Catalog coverage"],
    ["/admin/scrapers", "სკრაპერები"],
  ];

  return <nav className="mb-5 flex flex-wrap gap-2">{items.map(([href, label]) => <Link key={href} href={href} className="rounded-md border bg-white px-3 py-2 font-bold hover:border-[#087d6b]">{label}</Link>)}</nav>;
}
