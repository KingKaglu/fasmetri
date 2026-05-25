export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export type ShopView = {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  logoUrl?: string | null;
  enabled: boolean;
  reliabilityLabel?: string | null;
  needsConfiguration: boolean;
  lastScrapedAt?: string | null;
  productCount?: number;
  dealCount?: number;
};

export type CategoryView = {
  id: string;
  slug: string;
  nameKa: string;
  nameEn?: string | null;
  productCount?: number;
  dealCount?: number;
};

export type HistoryPoint = {
  capturedAt: string;
  price: number;
};

export type OfferView = {
  id: string;
  shop: ShopView;
  url: string;
  title: string;
  canonicalKey?: string | null;
  productIdentity?: unknown;
  matchStatus?: string | null;
  matchConfidence?: number | null;
  verificationStatus?: string | null;
  currentPrice: number;
  oldPrice?: number | null;
  discountPercent: number;
  currency: string;
  availability: Availability;
  imageUrl?: string | null;
  lastSeenAt: string;
  history?: HistoryPoint[];
};

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  canonicalKey?: string | null;
  productIdentity?: unknown;
  imageUrl?: string | null;
  category?: CategoryView | null;
  manualCategoryId?: string | null;
  categoryLocked?: boolean;
  categoryConfidence?: number | null;
  categoryNeedsReview?: boolean;
  categorySuggestedSlug?: string | null;
  categoryReason?: string | null;
  categoryMatchedRules?: unknown;
  categorySourceSignals?: unknown;
  matchingLocked?: boolean;
  isPublic?: boolean;
  needsReview?: boolean;
  archivedAt?: string | null;
  reviewedAt?: string | null;
  crossStoreCheckedAt?: string | null;
  checkedShopsCount?: number;
  totalEnabledShopsCount?: number;
  missingOfferDiscoveryStatus?: string | null;
  offers: OfferView[];
  offerCount?: number;
  popularityScore: number;
  updatedAt: string;
};

export type ScrapeRunView = {
  id: string;
  shopName?: string | null;
  shopSlug?: string | null;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  pagesVisited: number;
  offersSeen: number;
  errorLog?: unknown;
};
