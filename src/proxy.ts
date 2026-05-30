import { NextResponse, type NextRequest } from "next/server";

// Fasmetri public MVP is limited to phones + laptops. This proxy (Next.js 16's
// replacement for the deprecated `middleware` convention) runs before the route
// renders, so removed category URLs get a real redirect status (308) instead of
// a streamed "soft 404" (HTTP 200) caused by the global app/loading.tsx boundary.
//
// The public slugs + their URL aliases are inlined here (no heavy imports) to
// keep this edge-safe. It mirrors PUBLIC_CATEGORY_SLUGS and the public entries
// of CATEGORY_ALIASES; canonicalisation of aliases (e.g. `phones` -> `mobiles`)
// is still handled by the category page itself.
const PUBLIC_CATEGORY_ROUTE_SLUGS = new Set([
  // phones
  "mobiles", "mobile", "phone", "phones", "smartphone", "smartphones", "mobilurebi",
  // laptops
  "laptops", "laptop", "leptopebi",
]);

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/categories\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const slug = decodeURIComponent(match[1]).toLowerCase();
  if (PUBLIC_CATEGORY_ROUTE_SLUGS.has(slug)) return NextResponse.next();

  // Removed (non-MVP) category — send the visitor to the live category list.
  const url = request.nextUrl.clone();
  url.pathname = "/categories";
  url.search = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/categories/:slug*",
};
