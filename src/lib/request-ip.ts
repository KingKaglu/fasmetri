import { createHash } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return stripIpPort(first);
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp ? stripIpPort(realIp.trim()) : null;
}

export function stripIpPort(value: string) {
  // "[::1]:3000" → "::1", "1.2.3.4:5678" → "1.2.3.4"; bare IPv6 stays intact.
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];
  const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) return ipv4WithPort[1];
  return value;
}

export function isPublicHttpHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host === "[::1]" || host === "::" || host === "0.0.0.0") return false;
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return !host.includes(":") || isPublicIpv6(host);

  const [a, b] = ipv4.slice(1).map(Number);
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return ipv4.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function isPublicIpv6(host: string) {
  // Already filtered loopback/link-local/unique-local above; treat the rest as public.
  return /^[0-9a-f:]+$/.test(host);
}
