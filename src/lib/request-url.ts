/**
 * Build the request origin (scheme + host) from forwarded headers. Used to make
 * absolute links (e.g. a candidate URL shared in a WhatsApp message) on the
 * server. Falls back to https when the proto header is absent (Vercel sets it).
 */
export function originFromHeaders(h: Headers): string {
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}`;
}
