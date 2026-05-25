import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "fasmetri_admin";

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "development-admin-session-secret";
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createAdminToken() {
  const expiry = Date.now() + 1000 * 60 * 60 * 8;
  return `${expiry}.${signature(String(expiry))}`;
}

export function validAdminToken(token?: string) {
  if (!token) return false;
  const [expiry, proof] = token.split(".");
  if (!expiry || !proof || Number(expiry) < Date.now()) return false;
  const expected = Buffer.from(signature(expiry));
  const actual = Buffer.from(proof);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function isAdminRequest() {
  return validAdminToken((await cookies()).get(cookieName)?.value);
}

export const adminCookie = {
  name: cookieName,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  },
};
