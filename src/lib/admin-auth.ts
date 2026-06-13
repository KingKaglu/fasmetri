import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "fasmetri_admin";

function secret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured) return configured;
  // No dedicated secret set: derive a non-public, deployment-specific signing
  // key from ADMIN_PASSWORD rather than a publicly-known constant. ADMIN_PASSWORD
  // is always present wherever admin auth is in use — the login route rejects
  // every attempt when it is unset — so this never hard-fails a working deploy
  // while closing the forgeable-cookie hole. Set ADMIN_SESSION_SECRET to decouple
  // session rotation from the password (changing the password logs admins out).
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    return createHmac("sha256", adminPassword)
      .update("fasmetri-admin-session-v1")
      .digest("hex");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be set in production. Refusing to sign admin sessions with the public dev fallback.",
    );
  }
  return "development-admin-session-secret";
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
