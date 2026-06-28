import "./load-env";
import { prisma } from "../src/lib/prisma";

async function reportCategory(shopId: string, slug: string) {
  if (!prisma) return;
  const cat = await prisma.category.findFirst({ where: { slug } });
  const whereBase: any = { shopId };
  if (cat) whereBase.product = { categoryId: cat.id };

  const [total, active, inStock, oos, unknownAvail, latest] = await Promise.all([
    prisma.productOffer.count({ where: whereBase }),
    prisma.productOffer.count({ where: { ...whereBase, isActive: true } }),
    prisma.productOffer.count({ where: { ...whereBase, isActive: true, availability: "IN_STOCK" } }),
    prisma.productOffer.count({ where: { ...whereBase, isActive: true, availability: "OUT_OF_STOCK" } }),
    prisma.productOffer.count({ where: { ...whereBase, isActive: true, availability: "UNKNOWN" } }),
    prisma.productOffer.findFirst({ where: whereBase, orderBy: { lastSeenAt: "desc" }, select: { lastSeenAt: true } }),
  ]);

  console.log(`\n=== zoommer / ${slug} ===`);
  console.log("ProductOffer total      :", total);
  console.log("  active                :", active);
  console.log("  active IN_STOCK       :", inStock);
  console.log("  active OUT_OF_STOCK   :", oos);
  console.log("  active UNKNOWN avail  :", unknownAvail);
  console.log("latest lastSeenAt       :", latest?.lastSeenAt?.toISOString() ?? "n/a");
}

async function main() {
  if (!prisma) { console.log("no DATABASE_URL — prisma client not initialized"); return; }
  const shop = await prisma.shop.findFirst({ where: { slug: "zoommer" } });
  if (!shop) { console.log("no zoommer shop row"); return; }
  console.log("shop:", shop.slug, shop.id);
  for (const slug of ["mobiles", "laptops"]) await reportCategory(shop.id, slug);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
