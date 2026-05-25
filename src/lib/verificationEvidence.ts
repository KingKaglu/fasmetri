import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MatchDecision } from "@/lib/productMatching";

export async function recordOfferVerificationEvidence({
  offerId,
  shopId,
  originalTitle,
  originalUrl,
  decision,
}: {
  offerId: string;
  shopId: string;
  originalTitle: string;
  originalUrl: string;
  decision: MatchDecision;
}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  return prisma.offerVerificationEvidence.create({
    data: {
      productOfferId: offerId,
      sourceShopId: shopId,
      originalTitle,
      originalUrl,
      extractedIdentityJson: jsonValue(decision.right),
      matchedFieldsJson: jsonValue(decision.reasons),
      missingFieldsJson: jsonValue(decision.missingAttributes),
      mismatchFieldsJson: jsonValue(decision.hardMismatchReasons),
      confidence: decision.confidence,
    },
  });
}

export function verificationNotes(decision: MatchDecision) {
  const parts = [
    ...decision.reasons,
    ...decision.missingAttributes.map((value) => `Missing: ${value}`),
    ...decision.hardMismatchReasons.map((value) => `Mismatch: ${value}`),
  ];
  return parts.join(" | ").slice(0, 1800);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
