const PRIVATE_IP_PREFIXES = ["127.", "10.", "192.168.", "::1", "::ffff:127.", "fc", "fd"];

function isPrivateOrLocal(ip: string): boolean {
  return !ip || PRIVATE_IP_PREFIXES.some((p) => ip.startsWith(p)) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

/**
 * Best-effort "City, Country" for an IP via ip-api.com's free tier (no key,
 * ~45 req/min limit — fine at this app's scale since a lookup only happens
 * once per new visit, not per ping). Returns null for local/private IPs
 * (always true in local dev) or if the lookup fails/is rate-limited —
 * callers should treat that as "location unknown", not an error.
 */
export async function lookupLocation(ip: string): Promise<string | null> {
  if (isPrivateOrLocal(ip)) return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`);
    const data = (await res.json()) as { status: string; country?: string; city?: string };
    if (data.status !== "success") return null;
    return [data.city, data.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}
