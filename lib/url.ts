import { createHash } from "crypto";
import { lookup } from "dns/promises";
import net from "net";

const BLOCKED_HOSTNAMES = [
  /^localhost$/i,
  /^metadata\.google\.internal$/i,
  /^metadata$/i,
  /^instance-data$/i,
];

/** Hostnames that are literal addresses get checked here; DNS names get checked after resolution. */
function isPrivateAddress(addr: string): boolean {
  const v = net.isIP(addr);

  if (v === 4) {
    const p = addr.split(".").map(Number);
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 0) return true; // 0.0.0.0/8 — resolves to loopback on Linux
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (v === 6) {
    const a = addr.toLowerCase().replace(/^\[|\]$/g, "");

    // IPv4-mapped and IPv4-compatible forms — ::ffff:127.0.0.1 is loopback.
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    const mappedHex = a.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      return isPrivateAddress(
        `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`
      );
    }

    if (a === "::" || a === "::1") return true; // unspecified, loopback
    if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique-local
    if (a.startsWith("fe80")) return true; // link-local
    if (a.startsWith("ff")) return true; // multicast
    return false;
  }

  return false;
}

/**
 * Validates and normalizes a URL for safe server-side fetching.
 * Returns null if the URL is invalid, non-http(s), or targets a private host.
 *
 * This is the string-level check only. A hostname that resolves to a private
 * address still passes here — call assertPublicHost() before fetching.
 */
export function validateUrl(raw: string): string | null {
  let parsed: URL;
  try {
    const trimmed = raw.trim();
    const input = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // Credentials in the authority are a classic parser-confusion vector.
  if (parsed.username || parsed.password) return null;

  // Strip a trailing dot — "localhost." resolves the same as "localhost".
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  if (BLOCKED_HOSTNAMES.some((re) => re.test(host))) return null;

  // Bracketed IPv6 arrives as "[::1]"; strip for the address check.
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare) && isPrivateAddress(bare)) return null;

  parsed.hash = "";
  return parsed.toString();
}

/**
 * Resolves the hostname and rejects it if any resolved address is private.
 * Filtering the string is not enough — DNS decides where the packet goes.
 */
export async function assertPublicHost(safeUrl: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(safeUrl).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }

  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare)) return !isPrivateAddress(bare);

  try {
    const records = await lookup(bare, { all: true });
    if (records.length === 0) return false;
    return !records.some((r) => isPrivateAddress(r.address));
  } catch {
    return false;
  }
}

export const MAX_REDIRECTS = 3;
export const MAX_BODY_BYTES = 2_000_000; // 2 MB is far more than any homepage needs

/**
 * Fetches a page with every redirect hop re-validated, a body size cap, and a
 * content-type check. Throws on anything that is not a real HTML page.
 */
export async function fetchPageSafely(
  startUrl: string,
  timeoutMs = 8000
): Promise<string> {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await assertPublicHost(url))) {
      throw new Error("blocked_host");
    }

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GetWebPage-Audit/1.0; +https://getwebpage.co.uk)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    // Follow redirects ourselves so each hop goes through validation.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("bad_redirect");
      const next = validateUrl(new URL(location, url).toString());
      if (!next) throw new Error("blocked_host");
      url = next;
      continue;
    }

    if (!res.ok) throw new Error("bad_status");

    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
      throw new Error("not_html");
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) throw new Error("too_large");

    return await readCapped(res, MAX_BODY_BYTES);
  }

  throw new Error("too_many_redirects");
}

/** Reads a response body but stops once the cap is passed. */
async function readCapped(res: Response, limit: number): Promise<string> {
  if (!res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error("too_large");
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }

  chunks.push(decoder.decode());
  return chunks.join("");
}

/**
 * Deterministic cache key for a validated (normalized) URL.
 * Always call with the output of validateUrl, never with raw input.
 */
export function getCacheKey(safeUrl: string, lang = "en"): string {
  return "report:" + lang + ":" + createHash("sha256").update(safeUrl).digest("hex");
}
