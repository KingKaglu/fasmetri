/**
 * "Can this laptop run it?" — game compatibility model.
 *
 * Rather than hand-tagging every laptop (the catalog holds 400+ and grows with
 * every sync), compatibility is DERIVED: store titles already carry the GPU,
 * RAM and panel refresh rate, e.g.
 *
 *   "HP Victus 15 84J98EA Intel Core i5 13420H RTX 2050 16GB RAM 512GB SSD 15.6" FHD IPS 144Hz"
 *
 * So we parse the GPU, map it to a pre-researched performance tier, and read
 * the expected settings/framerate for each game off that tier. New laptops are
 * covered automatically the moment they are scraped.
 *
 * IMPORTANT — the framerates here are RESEARCHED ESTIMATES for 1080p on laptop
 * silicon, not measurements taken on these exact machines. Laptop GPUs vary
 * widely by power limit (a 60W RTX 4060 is far slower than a 115W one), and
 * thermals differ per chassis. The UI presents them as guidance ranges and says
 * so; never present them as benchmarked results.
 */

export type GpuTier = 0 | 1 | 2 | 3 | 4 | 5;

export type GameTierExpectation = {
  /** Graphics preset the tier can hold at 1080p. */
  preset: string;
  /** Estimated average framerate range at that preset, 1080p. */
  fps: [number, number];
};

export type Game = {
  slug: string;
  name: string;
  /** Short Georgian pitch shown on the card. */
  tagline: string;
  genre: string;
  /** Lowest tier that can play the game at all in a reasonable state. */
  minimumTier: GpuTier;
  /** RAM (GB) below which the experience degrades regardless of GPU. */
  recommendedRamGb: number;
  /** Per-tier expectation; index is the GpuTier. */
  byTier: Record<GpuTier, GameTierExpectation | null>;
  /** True when the title has no supported macOS build. */
  windowsOnly: boolean;
};

/**
 * Laptop GPU performance tiers (1080p gaming).
 *
 * 0 integrated · 1 entry dGPU · 2 mainstream · 3 solid 1080p
 * 4 high refresh 1080p / entry 1440p · 5 enthusiast
 */
export const GPU_TIER_LABELS: Record<GpuTier, string> = {
  0: "ინტეგრირებული გრაფიკა",
  1: "საბაზისო ვიდეობარათი",
  2: "საშუალო კლასი",
  3: "დამაჯერებელი 1080p",
  4: "მაღალი კლასი",
  5: "ტოპ კლასი",
};

/**
 * Pre-researched GPU → tier map. Keys are normalized (lowercase, no spaces).
 * Ordered longest-key-first at lookup time so "rtx4060" never matches "rtx406".
 */
const GPU_TIERS: Array<{ match: RegExp; tier: GpuTier; label: string }> = [
  // Tier 5 — enthusiast
  { match: /rtx\s*(5090|5080|4090|4080|3080\s*ti|3080)/i, tier: 5, label: "RTX top" },
  // Tier 4 — high
  { match: /rtx\s*(5070|4070|3070\s*ti|3070|5060\s*ti|4060\s*ti)/i, tier: 4, label: "RTX high" },
  // Tier 3 — solid 1080p
  { match: /rtx\s*(5060|4060|3060)/i, tier: 3, label: "RTX mainstream" },
  { match: /rx\s*(7700|7800|6800|6700)/i, tier: 3, label: "Radeon mainstream" },
  // Tier 2 — mainstream entry
  { match: /rtx\s*(5050|4050|3050\s*ti|3050|2060)/i, tier: 2, label: "RTX entry" },
  { match: /rx\s*(7600|6600)/i, tier: 2, label: "Radeon entry" },
  { match: /arc\s*a(7|5)\d{2}/i, tier: 2, label: "Intel Arc" },
  // Tier 1 — entry discrete
  { match: /rtx\s*2050/i, tier: 1, label: "RTX 2050" },
  { match: /gtx\s*(1660|1650)/i, tier: 1, label: "GTX" },
  { match: /\bmx\s*\d{3}\b/i, tier: 1, label: "MX" },
  // Tier 0 — integrated. Deliberately last so a discrete GPU in the same title
  // always wins: "Core i7 ... Intel Graphics ... RTX 4060" must score as 4060.
  // Covers AMD's iGPU naming (Radeon 610M/660M/760M/780M), Intel Iris Xe — often
  // truncated to "Iris X" by the store feed — plain "Intel Graphics", and Vega.
  { match: /radeon\s*\d{3}m/i, tier: 0, label: "Radeon integrated" },
  { match: /iris\s*x[e]?/i, tier: 0, label: "Iris Xe" },
  { match: /uhd\s*graphics/i, tier: 0, label: "Intel UHD" },
  { match: /intel\s*graphics/i, tier: 0, label: "Intel Graphics" },
  { match: /radeon\s*graphics/i, tier: 0, label: "Radeon Graphics" },
  { match: /vega\s*\d/i, tier: 0, label: "Vega" },
  { match: /\bintegrated\b/i, tier: 0, label: "Integrated" },
];

/**
 * Apple Silicon is detected but deliberately not scored — see resolveGpu.
 *
 * Anchored on either the word "Apple" or an M-series suffix (Pro/Max/Ultra/
 * Chip). A bare /\bm[1-5]\b/ is NOT safe: laptop titles are full of "SSD NVMe
 * M2 2280", which would label half the catalog as MacBooks.
 */
const APPLE_SILICON = /\bapple\b[^,;]{0,40}?\bm[1-5]\b|\bm[1-5]\s*(?:pro|max|ultra|chip)\b/i;

export type ResolvedGpu =
  | { kind: "scored"; tier: GpuTier; name: string }
  | { kind: "apple"; name: string }
  | { kind: "unknown" };

/**
 * A scraped spec sheet, when the shop publishes one.
 *
 * PCShop already parses a WooCommerce `shop_attributes` table and the schema
 * carries `RawOffer.rawSpecsJson`, so where a real spec sheet exists it is a
 * far better signal than the title. Anything passed here wins over the title;
 * the title stays the fallback for the many listings that ship no spec table.
 */
export type ScrapedSpecs = {
  gpu?: string | null;
  ram?: string | null;
  display?: string | null;
};

/** Builds the string we pattern-match against: specs first, title as backup. */
function specSignal(title: string, specs?: ScrapedSpecs | null) {
  return [specs?.gpu, specs?.ram, specs?.display, title].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

/**
 * Pulls the GPU out of the spec sheet (preferred) or the store title, and maps
 * it to a tier.
 *
 * Apple Silicon returns `apple` rather than a tier: these games' macOS
 * availability differs per title and per year, and guessing a framerate for a
 * machine that may not even run the game would be worse than saying nothing.
 */
export function resolveGpu(title: string, specs?: ScrapedSpecs | null): ResolvedGpu {
  const haystack = specSignal(title, specs);
  for (const entry of GPU_TIERS) {
    const found = haystack.match(entry.match);
    if (found) {
      return { kind: "scored", tier: entry.tier, name: found[0].replace(/\s+/g, " ").toUpperCase() };
    }
  }
  if (APPLE_SILICON.test(haystack)) {
    return { kind: "apple", name: haystack.match(APPLE_SILICON)?.[0].toUpperCase() ?? "Apple Silicon" };
  }
  return { kind: "unknown" };
}

/** RAM in GB from the spec sheet or a title such as "16GB RAM". */
export function resolveRamGb(title: string, specs?: ScrapedSpecs | null): number | null {
  const haystack = specs?.ram ? `${specs.ram} ${title}` : title;
  const match = haystack.match(/(\d{1,3})\s*GB\s*RAM/i) ?? haystack.match(/\b(8|12|16|24|32|48|64)\s*GB\b/i);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value >= 4 && value <= 128 ? value : null;
}

/** Panel refresh rate, used to explain when FPS exceeds what the screen shows. */
export function resolveRefreshHz(title: string, specs?: ScrapedSpecs | null): number | null {
  const haystack = specs?.display ? `${specs.display} ${title}` : title;
  const match = haystack.match(/(\d{2,3})\s*Hz/i);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value >= 60 && value <= 480 ? value : null;
}

/**
 * The three titles we cover, chosen to span the difficulty range so a buyer can
 * place any laptop: an esports title almost anything runs, a popular mid-weight
 * title, and the heavy AAA benchmark.
 */
export const GAMES: Game[] = [
  {
    slug: "counter-strike-2",
    name: "Counter-Strike 2",
    tagline: "ესპორტული შუტერი — მაღალი FPS მთავარია",
    genre: "შუტერი / ესპორტი",
    minimumTier: 0,
    recommendedRamGb: 8,
    windowsOnly: true,
    byTier: {
      0: { preset: "დაბალი", fps: [45, 70] },
      1: { preset: "საშუალო", fps: [80, 120] },
      2: { preset: "მაღალი", fps: [140, 200] },
      3: { preset: "მაღალი", fps: [200, 280] },
      4: { preset: "ძალიან მაღალი", fps: [280, 360] },
      5: { preset: "მაქსიმალური", fps: [320, 400] },
    },
  },
  {
    slug: "fortnite",
    name: "Fortnite",
    tagline: "ბატლ-როიალი — კარგი ბალანსი ხარისხსა და FPS-ს შორის",
    genre: "ბატლ-როიალი",
    minimumTier: 0,
    recommendedRamGb: 8,
    windowsOnly: true,
    byTier: {
      0: { preset: "Performance რეჟიმი", fps: [40, 60] },
      1: { preset: "საშუალო", fps: [60, 90] },
      2: { preset: "მაღალი", fps: [90, 130] },
      3: { preset: "მაღალი / Epic", fps: [120, 165] },
      4: { preset: "Epic", fps: [150, 200] },
      5: { preset: "Epic + Ray Tracing", fps: [165, 240] },
    },
  },
  {
    slug: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    tagline: "მძიმე AAA — ნამდვილი ტესტი ვიდეობარათისთვის",
    genre: "RPG / ღია სამყარო",
    minimumTier: 1,
    recommendedRamGb: 16,
    windowsOnly: false,
    byTier: {
      0: null,
      1: { preset: "დაბალი + FSR", fps: [30, 45] },
      2: { preset: "საშუალო + DLSS", fps: [45, 65] },
      3: { preset: "მაღალი + DLSS", fps: [60, 85] },
      4: { preset: "ულტრა + DLSS", fps: [80, 110] },
      5: { preset: "ულტრა + Ray Tracing", fps: [90, 130] },
    },
  },
];

export type Verdict = "excellent" | "good" | "playable" | "marginal" | "unsupported" | "unknown";

export type GameFit = {
  verdict: Verdict;
  /** Georgian label for the verdict badge. */
  label: string;
  preset: string | null;
  fps: [number, number] | null;
  /** Caveats such as low RAM or a panel that cannot show the framerate. */
  notes: string[];
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  excellent: "შესანიშნავად გაუშვებს",
  good: "კარგად გაუშვებს",
  playable: "სათამაშოა",
  marginal: "ძლივს გაუშვებს",
  unsupported: "არ გაუშვებს",
  unknown: "ვერ განვსაზღვრეთ",
};

/**
 * Scores one laptop against one game.
 *
 * The verdict comes from the gap between the laptop's tier and the game's
 * minimum, then gets pulled down a step when RAM is under the game's
 * recommendation — an RTX 4060 paired with 8GB still stutters in Cyberpunk.
 */
export function evaluateGameFit(title: string, game: Game, specs?: ScrapedSpecs | null): GameFit {
  const gpu = resolveGpu(title, specs);
  const ramGb = resolveRamGb(title, specs);
  const refreshHz = resolveRefreshHz(title, specs);
  const notes: string[] = [];

  if (gpu.kind === "apple") {
    return {
      verdict: "unknown",
      label: VERDICT_LABELS.unknown,
      preset: null,
      fps: null,
      notes: ["Apple Silicon — macOS-ზე ამ თამაშების ხელმისაწვდომობა განსხვავდება; გადაამოწმე თამაშის გვერდზე"],
    };
  }
  if (gpu.kind === "unknown") {
    return { verdict: "unknown", label: VERDICT_LABELS.unknown, preset: null, fps: null, notes: [] };
  }

  const expectation = game.byTier[gpu.tier];
  if (!expectation || gpu.tier < game.minimumTier) {
    return {
      verdict: "unsupported",
      label: VERDICT_LABELS.unsupported,
      preset: null,
      fps: null,
      notes: [`${game.name} მოითხოვს დისკრეტულ ვიდეობარათს`],
    };
  }

  const headroom = gpu.tier - game.minimumTier;
  let verdict: Verdict = headroom >= 3 ? "excellent" : headroom >= 2 ? "good" : headroom >= 1 ? "playable" : "marginal";

  if (ramGb != null && ramGb < game.recommendedRamGb) {
    notes.push(`${ramGb}GB RAM — ${game.name}-ისთვის რეკომენდებულია ${game.recommendedRamGb}GB`);
    // One step down: RAM starvation shows up as stutter, not lower average FPS.
    verdict = verdict === "excellent" ? "good" : verdict === "good" ? "playable" : verdict === "playable" ? "marginal" : verdict;
  }

  if (refreshHz != null && expectation.fps[0] > refreshHz) {
    notes.push(`ეკრანი ${refreshHz}Hz — ამაზე მეტ კადრს ვერ აჩვენებს`);
  }

  return { verdict, label: VERDICT_LABELS[verdict], preset: expectation.preset, fps: expectation.fps, notes };
}

/** Ordering for grouping results, best first. */
export const VERDICT_ORDER: Verdict[] = ["excellent", "good", "playable", "marginal", "unsupported", "unknown"];

/**
 * Verdicts that count as "this laptop runs the game". `marginal` is included on
 * purpose: it means low settings and a modest framerate, not failure to launch,
 * and a buyer shopping at the bottom of the price range needs to see it.
 */
export const RUNNING_VERDICTS: Verdict[] = ["excellent", "good", "playable", "marginal"];

export function runsGame(verdict: Verdict): boolean {
  return RUNNING_VERDICTS.includes(verdict);
}

export function getGame(slug: string): Game | undefined {
  return GAMES.find((game) => game.slug === slug);
}
