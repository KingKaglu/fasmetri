// Validation rules for visitor reviews, kept free of any server import.
//
// The form is a client component and the API route runs on the server, but both
// need the same limits. Putting them here rather than in lib/reviews.ts matters:
// that module imports prisma, and importing it from the browser drags the `pg`
// driver into the client bundle ("Module not found: Can't resolve 'fs'").
export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 1500;
export const REVIEW_NAME_MAX = 40;
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

/** Rows one hashed IP may add in a day. Two lets someone fix a typo by reposting. */
export const REVIEWS_PER_IP_PER_DAY = 2;
// Native-app traffic carries an install id, so it is limited per device instead.
// The IP cap still applies on top, only looser: Georgian mobile carriers NAT
// thousands of phones behind one address, and a shared cap of 2 would let the
// first app user of the day silence everyone else on that cell. A spammer who
// rotates install ids therefore still runs into this number.
export const REVIEWS_PER_DEVICE_PER_DAY = 2;
export const REVIEWS_PER_SHARED_IP_PER_DAY = 12;
export const DEVICE_ID_HEADER = "x-fasmetri-device";
export const DEVICE_ID_MAX = 64;

/** Newest reviews rendered on /reviews. Beyond this the page stops growing. */
export const REVIEWS_PAGE_SIZE = 60;

// Anything that looks like a link or a contact handle. Deliberately broad: a
// genuine review of a price-comparison site never needs to include a URL, and
// comment spam exists to place links — refusing them removes most of the
// incentive without asking a real visitor for anything.
const LINK_PATTERN =
  /(https?:\/\/|www\.|t\.me\/|wa\.me\/|@[a-z0-9_]{3,}|\b[a-z0-9-]+\.(com|net|org|ru|ge|info|xyz|top|shop|online|site)\b)/i;

export function containsLink(value: string) {
  return LINK_PATTERN.test(value);
}

/** Collapse whitespace so "same" spam posted twice is recognisably the same. */
export function normalizeReviewBody(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Reject the walls of repeated characters and single-word posts that get past a
 * length check ("aaaaaaaaaaaa", "ok ok ok ok ok").
 */
export function looksLikeNoise(body: string) {
  const trimmed = body.trim();
  if (/(.)\1{9,}/.test(trimmed)) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;
  const distinct = new Set(words.map((word) => word.toLowerCase()));
  // "ok ok ok ok ok" — many words, almost no vocabulary.
  return words.length >= 6 && distinct.size <= 2;
}
