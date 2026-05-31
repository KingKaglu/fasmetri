import "./load-env";
import { createHash } from "node:crypto";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";
import { readProductIdentity } from "../src/lib/productIdentity";
import { extractVariantIdentity } from "../src/lib/variantMatching";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

async function main() {
  const options = parseBatchOptions("match-offers-to-variants", { limit: 200 });
  const id = checkpointId("match-offers-to-variants", options);
  const rawOffers = await db.rawOffer.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      shop: options.shop ? { slug: options.shop } : undefined,
      categorySlug: options.category,
      originalTitle: options.q ? { contains: options.q, mode: "insensitive" } : undefined,
      status: { in: ["NORMALIZED", "ATTACHED"] },
      rawPrice: { not: null },
      categoryNeedsReview: false,
    },
    include: { shop: { select: { id: true, slug: true, name: true } } },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of rawOffers) {
    try {
      const identity = extractVariantIdentity(
        readProductIdentity(raw.productIdentity) ?? {
          title: raw.originalTitle,
          description: raw.description ?? undefined,
          brand: raw.brand ?? undefined,
          model: raw.model ?? undefined,
          categorySlug: raw.categorySlug ?? undefined,
          breadcrumbs: toStringArray(raw.breadcrumbs ?? raw.sourceBreadcrumbs),
        },
      );

      if (!identity.canonicalParentKey || !identity.canonicalVariantKey || !raw.rawPrice || !raw.categorySlug) {
        skipped += 1;
        if (!options.dryRun) await markReview(raw.id, "Missing parent/variant key, category, or price.");
        continue;
      }

      const category = await db.category.findUnique({ where: { slug: raw.categorySlug }, select: { id: true } });
      if (!category) {
        skipped += 1;
        if (!options.dryRun) await markReview(raw.id, `Unknown normalized category: ${raw.categorySlug}.`);
        continue;
      }

      if (options.dryRun) {
        console.log(`[dry-run] ${raw.shop.slug}: ${raw.originalTitle}`);
        console.log(`  parent=${identity.canonicalParentKey}`);
        console.log(`  variant=${identity.canonicalVariantKey}`);
        updated += 1;
        continue;
      }

      const parent = await db.parentProduct.upsert({
        where: { canonicalParentKey: identity.canonicalParentKey },
        update: {
          brand: identity.brand,
          model: identity.model,
          productLine: identity.model,
          baseSpecsJson: jsonValue(parentSpecs(identity)),
          categoryId: category.id,
          primaryImage: raw.originalImageUrl ?? undefined,
          needsReview: false,
          isPublic: true,
        },
        create: {
          brand: identity.brand,
          model: identity.model,
          productLine: identity.model,
          baseSpecsJson: jsonValue(parentSpecs(identity)),
          categoryId: category.id,
          canonicalParentKey: identity.canonicalParentKey,
          title: parentTitle(identity, raw.originalTitle),
          slug: stableSlug(parentTitle(identity, raw.originalTitle), identity.canonicalParentKey),
          primaryImage: raw.originalImageUrl,
          needsReview: false,
          isPublic: true,
        },
      });

      const variant = await db.productVariant.upsert({
        where: { canonicalVariantKey: identity.canonicalVariantKey },
        update: {
          parentProductId: parent.id,
          variantTitle: raw.originalTitle,
          color: identity.color,
          storage: identity.storage,
          ram: identity.ram,
          cpu: identity.cpu,
          gpu: identity.gpu,
          size: identity.screenSize,
          capacity: identity.capacity,
          sku: identity.sku ?? identity.modelCode,
          specsJson: jsonValue(identity),
          primaryImage: raw.originalImageUrl ?? undefined,
          needsReview: false,
          isPublic: true,
        },
        create: {
          parentProductId: parent.id,
          variantTitle: raw.originalTitle,
          canonicalVariantKey: identity.canonicalVariantKey,
          color: identity.color,
          storage: identity.storage,
          ram: identity.ram,
          cpu: identity.cpu,
          gpu: identity.gpu,
          size: identity.screenSize,
          capacity: identity.capacity,
          sku: identity.sku ?? identity.modelCode,
          specsJson: jsonValue(identity),
          primaryImage: raw.originalImageUrl,
          needsReview: false,
          isPublic: true,
        },
      });

      const product = await findOrCreateLegacyVariantProduct(raw, identity, category.id);
      const existing = await db.productOffer.findUnique({ where: { shopId_url: { shopId: raw.shopId, url: raw.originalUrl } } });
      const price = Number(raw.rawPrice);
      const oldPrice = raw.rawOldPrice == null ? undefined : Number(raw.rawOldPrice);
      const changed = existing ? Number(existing.currentPrice) !== price : true;

      const offer = await db.productOffer.upsert({
        where: { shopId_url: { shopId: raw.shopId, url: raw.originalUrl } },
        update: {
          productId: product.id,
          parentProductId: parent.id,
          variantId: variant.id,
          rawOfferId: raw.id,
          externalId: raw.externalId,
          title: raw.originalTitle,
          canonicalKey: identity.canonicalVariantKey,
          productIdentity: jsonValue(identity),
          matchStatus: "CONFIRMED",
          matchConfidence: 100,
          verificationStatus: "CONFIRMED",
          currentPrice: price,
          oldPrice,
          discountPercent: raw.rawDiscount ?? discountPercent(price, oldPrice),
          availability: raw.availability as OfferAvailability,
          imageUrl: raw.originalImageUrl,
          lastSeenAt: raw.scrapedAt,
          lastPriceChangedAt: changed ? new Date() : existing?.lastPriceChangedAt,
        },
        create: {
          shopId: raw.shopId,
          productId: product.id,
          parentProductId: parent.id,
          variantId: variant.id,
          rawOfferId: raw.id,
          externalId: raw.externalId,
          url: raw.originalUrl,
          title: raw.originalTitle,
          canonicalKey: identity.canonicalVariantKey,
          productIdentity: jsonValue(identity),
          matchStatus: "CONFIRMED",
          matchConfidence: 100,
          verificationStatus: "CONFIRMED",
          currentPrice: price,
          oldPrice,
          discountPercent: raw.rawDiscount ?? discountPercent(price, oldPrice),
          availability: raw.availability as OfferAvailability,
          imageUrl: raw.originalImageUrl,
          lastPriceChangedAt: new Date(),
        },
      });

      if (changed) {
        await db.priceHistory.create({ data: { offerId: offer.id, price, oldPrice } });
      }

      await db.rawOffer.update({
        where: { id: raw.id },
        data: {
          productId: product.id,
          parentProductId: parent.id,
          variantId: variant.id,
          canonicalKey: identity.canonicalVariantKey,
          productIdentity: jsonValue(identity),
          status: "ATTACHED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    } catch (error) {
      failed += 1;
      if (!options.dryRun) await markReview(raw.id, error instanceof Error ? error.message : "Unknown variant matching error");
    }
  }

  const progress = {
    checkpointId: id,
    cursor: rawOffers.at(-1)?.id ?? options.cursor,
    created: options.dryRun ? 0 : created,
    updated: options.dryRun ? 0 : updated,
    skipped,
    failed,
    processed: rawOffers.length,
    nextOffset: options.offset + rawOffers.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("match-offers-to-variants", progress);
  console.log(`${options.dryRun ? "Would attach" : "Attached"} ${created + updated} raw offers to exact ProductVariant rows.`);
}

type RawOfferForVariant = Prisma.RawOfferGetPayload<{ include: { shop: { select: { id: true; slug: true; name: true } } } }>;

async function findOrCreateLegacyVariantProduct(raw: RawOfferForVariant, identity: ReturnType<typeof extractVariantIdentity>, categoryId: string) {
  if (!identity.canonicalVariantKey) throw new Error("Variant identity is missing a canonical key.");
  const existing = await db.product.findFirst({ where: { canonicalKey: identity.canonicalVariantKey } });
  const data = {
    name: raw.originalTitle,
    normalizedName: normalizeProductName(raw.originalTitle),
    canonicalKey: identity.canonicalVariantKey,
    productIdentity: jsonValue(identity),
    brand: identity.brand ?? raw.brand,
    model: identity.model ?? raw.model,
    imageUrl: raw.originalImageUrl,
    categoryId,
    categoryConfidence: raw.categoryConfidence ?? 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: raw.categorySlug,
    categoryReason: "Clean variant pipeline attached this exact purchasable variant.",
    isPublic: true,
    needsReview: false,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;

  if (existing) {
    return db.product.update({ where: { id: existing.id }, data });
  }

  const baseSlug = stableSlug(raw.originalTitle, identity.canonicalVariantKey);
  try {
    return await db.product.create({
      data: { ...data, slug: baseSlug } as Prisma.ProductUncheckedCreateInput,
    });
  } catch (error) {
    // Two distinct variants (different canonical keys) can slugify to the same
    // string, which would drop one on the unique(slug) constraint. Disambiguate
    // with a short hash of the unique canonical variant key so both survive.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const suffix = createHash("sha1").update(identity.canonicalVariantKey).digest("hex").slice(0, 6);
      return db.product.create({
        data: { ...data, slug: `${baseSlug}-${suffix}` } as Prisma.ProductUncheckedCreateInput,
      });
    }
    throw error;
  }
}

async function markReview(rawOfferId: string, message: string) {
  await db.rawOffer.update({
    where: { id: rawOfferId },
    data: { status: "NEEDS_REVIEW", errorMessage: message, processedAt: new Date() },
  });
}

function parentTitle(identity: ReturnType<typeof extractVariantIdentity>, fallback: string) {
  const parts = [identity.brand, identity.model?.replaceAll("_", " "), identity.ram, identity.storage, identity.capacity, identity.screenSize]
    .filter(Boolean)
    .join(" ");
  return parts || fallback;
}

function parentSpecs(identity: ReturnType<typeof extractVariantIdentity>) {
  return {
    productType: identity.productType,
    brand: identity.brand,
    model: identity.model,
    ram: identity.ram,
    storage: identity.storage,
    cpu: identity.cpu,
    gpu: identity.gpu,
    screenSize: identity.screenSize,
    capacity: identity.capacity,
    productForm: identity.productForm,
  };
}

function stableSlug(title: string, key: string) {
  return `${slugifyProduct(title)}-${shortHash(key)}`;
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function discountPercent(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
