import { FasmetriCategorySlug, PUBLIC_CATEGORY_TAXONOMY } from "@/config/categoryMapping";
import { ProductCategoryDecision, ProductCategoryInput, categorizeProduct } from "@/lib/categorizeProduct";

export type CategoryValidationResult = ProductCategoryDecision & {
  currentSlug: FasmetriCategorySlug | null;
  currentName: string | null;
  isMismatch: boolean;
  isImprovement: boolean;
};

export type CategoryValidationInput = ProductCategoryInput & {
  currentCategorySlug?: FasmetriCategorySlug | null;
  categoryLocked?: boolean;
};

export function validateProductCategory(product: CategoryValidationInput): CategoryValidationResult {
  const decision = categorizeProduct(product);
  const current = product.currentCategorySlug ?? null;
  const isMismatch =
    Boolean(current) &&
    current !== decision.publicCategorySlug &&
    !decision.needsReview &&
    !product.categoryLocked;
  const isImprovement = !current && !decision.needsReview;
  return {
    ...decision,
    currentSlug: current,
    currentName: current ? (PUBLIC_CATEGORY_TAXONOMY[current]?.nameKa ?? null) : null,
    isMismatch,
    isImprovement,
  };
}

export function validateCategoryAssignment(product: CategoryValidationInput): CategoryValidationResult {
  return validateProductCategory(product);
}
