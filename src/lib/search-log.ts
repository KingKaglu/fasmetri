// First-party search logging.
//
// Mirrors the ClickEvent guards in src/app/api/out/[offerId]/route.ts: bot UA
// filter, public-IP check, per-IP rate limit, then an (ip, query, category,
// hour) dedup so a refresh or a walk through the pager cannot inflate demand
// for one term. Every path is best-effort — a logging failure must never
// change what the visitor sees.
//
// Privacy: the raw IP is never stored, only sha256(ip), and only to power the
// dedup and rate limit. No user id, no session, no cookie.
import { clientIpFromHeaders, isPublicHttpHost, sha256 } from "@/lib/request-ip";
import { isLikelyBot } from "@/lib/bot-detect";
import { normalizeSearchText } from "@/lib/searchKeywords";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_MAX_PER_MINUTE = 60;
const DEDUP_RETENTION_HOURS = 24;
const MAX_QUERY_LENGTH = 120;

export type SearchSource = "search" | "suggest";

export type RecordSearchInput = {
  query: string;
  resultsCount: number;
  /** "suggest" rows are type-ahead prefixes that returned nothing. */
  source?: SearchSource;
  category?: string | null;
  shop?: string | null;
  page?: number | null;
  headers: Pick<Headers, "get">;
};

/**
 * Log one search. Never throws and never rejects — call it without awaiting
 * from a render path, or await it inside a try/catch-free block safely.
 */
export async function recordSearch(input: RecordSearchInput): Promise<void> {
  try {
    if (!prisma) return;

    const query = input.query.trim();
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) return;
    const normalized = normalizeSearchText(query);
    if (!normalized) return;

    const { headers } = input;
    if (isLikelyBot(headers.get("user-agent"))) return;

    const ip = clientIpFromHeaders(headers);
    // No resolvable public IP (local dev, internal probe) → still log the
    // query, just without a hash: the search term is the valuable part, and
    // dropping local traffic entirely would make dev look broken.
    const ipHash = ip && isPublicHttpHost(ip) ? sha256(ip) : null;

    if (ipHash && !(await passesGuards(ipHash, ip!, normalized, input.category ?? ""))) return;

    const page = input.page && input.page > 0 ? input.page : 1;
    await prisma.searchQuery.create({
      data: {
        query,
        normalized,
        resultsCount: input.resultsCount,
        hasResults: input.resultsCount > 0,
        source: input.source ?? "search",
        category: input.category ?? null,
        shop: input.shop ?? null,
        page,
        referrer: headers.get("referer"),
        ipHash,
      },
    });
  } catch {
    // Search logging is never allowed to break a search.
  }
}

async function passesGuards(ipHash: string, ip: string, normalized: string, category: string) {
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const recent = await prisma!.searchDedup.count({ where: { ipHash, createdAt: { gte: oneMinuteAgo } } });
  if (recent >= RATE_LIMIT_MAX_PER_MINUTE) return false;

  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const dedupKey = sha256(`${ip}|${normalized}|${category}|${hourBucket}`);
  try {
    await prisma!.searchDedup.create({ data: { dedupKey, ipHash } });
  } catch {
    // Unique violation: same IP already searched this term this hour.
    return false;
  }

  // Opportunistic pruning, so the guard table stays small without a cron.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - DEDUP_RETENTION_HOURS * 3_600_000);
    prisma!.searchDedup.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
  }

  return true;
}
