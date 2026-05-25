import "./load-env";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";
import { explainMatchDecision } from "../src/lib/productMatching";
import { markPossibleOfferMatch } from "../src/lib/crossStoreMatching";
import { extractProductIdentity, mergeProductIdentities, readProductIdentity } from "../src/lib/productIdentity";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");

async function main() {
  const options = parseBatchOptions("rematch-products", { limit: 100 });
  const id = checkpointId("rematch-products", options);
  const productId = process.argv.slice(2).find((arg) => arg.startsWith("--productId="))?.split("=").slice(1).join("=");
  const where: Prisma.ProductWhereInput = productId
    ? { id: productId, matchingLocked: false }
    : {
        id: options.cursor ? { gt: options.cursor } : undefined,
        offers: { some: options.shop ? { shop: { slug: options.shop } } : {} },
        matchingLocked: false,
        OR: options.q
          ? [
              { name: { contains: options.q, mode: "insensitive" } },
              { normalizedName: { contains: options.q.toLocaleLowerCase(), mode: "insensitive" } },
              { offers: { some: { title: { contains: options.q, mode: "insensitive" } } } },
            ]
          : undefined,
      };
  if (options.category) where.category = { slug: options.category };

  const products = await prisma!.product.findMany({
    where,
    include: { category: true, offers: true },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });
  let split = 0;
  let possible = 0;
  let skipped = 0;
  let failed = 0;

  if (options.dryRun) {
    console.log(`Dry run: checking ${products.length} products without splitting offers or creating review candidates.`);
  }

  for (const product of products) {
    let identity = readProductIdentity(product.productIdentity) ?? extractProductIdentity({
      title: product.name,
      brand: product.brand,
      model: product.model,
      categorySlug: product.category?.slug,
    });
    for (const offer of product.offers) {
      try {
        const decision = explainMatchDecision(
          identity,
          extractProductIdentity({ title: offer.title, categorySlug: product.category?.slug }),
        );
        if (decision.status === "CONFIRMED") {
          identity = mergeProductIdentities(identity, decision.right);
          if (!options.dryRun) {
            await prisma!.productOffer.update({
              where: { id: offer.id },
              data: {
                canonicalKey: decision.right.canonicalKey,
                productIdentity: jsonValue(decision.right),
                matchStatus: "CONFIRMED",
                matchConfidence: decision.confidence,
                verificationStatus: "CONFIRMED",
              },
            });
          }
          continue;
        }
        if (product.offers.length < 2) {
          skipped += 1;
          continue;
        }
        split += 1;
        if (decision.status === "POSSIBLE") possible += 1;
        if (options.dryRun) continue;

        const separate = await prisma!.product.create({
          data: {
            name: offer.title,
            normalizedName: normalizeProductName(offer.title),
            slug: `${slugifyProduct(offer.title)}-${randomUUID().slice(0, 6)}`,
            canonicalKey: decision.right.canonicalKey,
            productIdentity: jsonValue(decision.right),
            imageUrl: offer.imageUrl,
            categoryId: product.categoryId,
            categoryConfidence: product.categoryConfidence,
            categoryNeedsReview: product.categoryNeedsReview,
            categorySuggestedSlug: product.categorySuggestedSlug,
            categoryReason: "strict rematch split an unconfirmed offer from a public comparison.",
          },
        });
        await prisma!.productOffer.update({
          where: { id: offer.id },
          data: {
            productId: separate.id,
            canonicalKey: decision.right.canonicalKey,
            productIdentity: jsonValue(decision.right),
            matchStatus: "CONFIRMED",
            matchConfidence: 100,
            verificationStatus: "CONFIRMED",
          },
        });
        if (decision.status === "POSSIBLE") {
          await markPossibleOfferMatch(product.id, offer.id, decision.confidence, decision);
        }
      } catch (error) {
        failed += 1;
        console.error(`Failed to rematch offer ${offer.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (!options.dryRun) {
      await prisma!.product.update({
        where: { id: product.id },
        data: { canonicalKey: identity.canonicalKey, productIdentity: jsonValue(identity), missingOfferDiscoveryStatus: "PENDING" },
      });
    }
  }

  const progress = {
    checkpointId: id,
    cursor: products.at(-1)?.id ?? options.cursor,
    created: options.dryRun ? 0 : split - failed,
    updated: options.dryRun ? 0 : products.length + split - failed,
    skipped,
    failed,
    processed: products.length,
    nextOffset: options.offset + products.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("rematch-products", progress);
  console.log(`${options.dryRun ? "Would split" : "Split"} ${split} unconfirmed offers. ${options.dryRun ? "Would queue" : "Queued"} ${possible} possible matches for admin review. Run discover-missing-offers as a separate batch after identities are rebuilt.`);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
