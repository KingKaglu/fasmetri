`buildVariantKey-colour-rekey.patch` drops colour from the variant key for appliances, TVs and monitors in EVERY store (src/lib/variantMatching.ts); parked 2026-09-24, not applied.
Measured read-only against prod on 2026-09-24: it re-keys 753 public products, only 95 of which land on an existing key, so ~658 would get new products/slugs on the next re-match and leave the old colour-suffixed URLs orphaned.
Ship it only with a planned re-match of those categories plus a redirect/archive pass for the orphaned products (`git apply docs/pending/buildVariantKey-colour-rekey.patch`).
