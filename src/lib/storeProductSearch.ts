import { Prisma, RawOffer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DiscoveryIdentity } from "@/lib/offerDiscovery";
import { ProductIdentity } from "@/lib/productIdentity";

export type StoreCandidate = RawOffer & {
  productOffer?: {
    id: string;
    productId: string;
    title: string;
    url: string;
    productIdentity: Prisma.JsonValue | null;
    canonicalKey: string | null;
  } | null;
};

export function buildStoreSearchQueries(identity: ProductIdentity) {
  const model = pretty(identity.model);
  const color = pretty(identity.color);
  const storage = identity.storage;
  const ram = identity.ram;
  const slashMemory = ram && storage ? `${ram.replace(/gb$/, "")}/${storage}` : undefined;
  const ramStorage = ram && storage ? `${ram} ${storage}` : undefined;
  const queries = [
    identity.sku,
    identity.modelCode,
    [identity.brand, model, ramStorage, color].filter(Boolean).join(" "),
    [identity.brand, model, slashMemory, color].filter(Boolean).join(" "),
    [model, ramStorage, color].filter(Boolean).join(" "),
    [model, slashMemory, color].filter(Boolean).join(" "),
    [identity.brand, model, storage, color].filter(Boolean).join(" "),
    [model, storage, color].filter(Boolean).join(" "),
    ...modelAliasQueries(identity, model, ramStorage, slashMemory, color),
    identity.cleanTitle,
  ];
  return [...new Set(queries.map((query) => query?.trim()).filter((query): query is string => Boolean(query && query.length >= 3)))];
}

function modelAliasQueries(identity: ProductIdentity, model?: string, ramStorage?: string, slashMemory?: string, color?: string) {
  if (!model) return [];
  const queries: string[] = [];
  if (identity.brand === "xiaomi" && model.startsWith("redmi ")) {
    queries.push(["xiaomi", model, ramStorage, color].filter(Boolean).join(" "));
    queries.push(["xiaomi", model, slashMemory, color].filter(Boolean).join(" "));
    queries.push([model, ramStorage, color].filter(Boolean).join(" "));
    queries.push([model, slashMemory, color].filter(Boolean).join(" "));
    queries.push(["xiaomi", model.replace(/^redmi\s+/, ""), ramStorage, color].filter(Boolean).join(" "));
    queries.push(["xiaomi", model.replace(/^redmi\s+/, ""), slashMemory, color].filter(Boolean).join(" "));
  }
  if (identity.model?.startsWith("iphone_")) {
    queries.push(["apple", model, identity.storage, color].filter(Boolean).join(" "));
    queries.push([model, identity.storage, color, "esim"].filter(Boolean).join(" "));
  }
  return queries;
}

function pretty(value?: string) {
  return value?.replaceAll("_", " ");
}

export async function findStoreCandidates({
  identity,
  shopId,
  limit = 30,
}: {
  identity: DiscoveryIdentity | ProductIdentity;
  shopId?: string;
  limit?: number;
}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const productIdentity = "identity" in identity ? identity.identity : identity;
  const queries = buildStoreSearchQueries(productIdentity).slice(0, 5);
  const clauses: Prisma.RawOfferWhereInput[] = [];
  if (productIdentity.canonicalKey) clauses.push({ canonicalKey: productIdentity.canonicalKey });
  for (const query of queries) {
    clauses.push({
      OR: [
        { originalTitle: { contains: query, mode: "insensitive" } },
        { normalizedTitle: { contains: query.toLocaleLowerCase(), mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.RawOfferWhereInput = {
    shopId,
    rawPrice: { gt: 0 },
    OR: clauses,
  };
  if (!where.OR?.length) return [];

  return prisma.rawOffer.findMany({
    where,
    include: {
      productOffer: {
        select: {
          id: true,
          productId: true,
          title: true,
          url: true,
          productIdentity: true,
          canonicalKey: true,
        },
      },
    },
    orderBy: [{ canonicalKey: productIdentity.canonicalKey ? "asc" : "desc" }, { scrapedAt: "desc" }],
    take: limit,
  });
}
