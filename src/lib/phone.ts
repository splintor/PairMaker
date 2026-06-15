/** `tel:` href — keeps digits and a leading +, drops spaces/dashes/parens. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * wa.me link — needs digits only, in international form (no +, no leading 0).
 * Israeli local numbers (leading 0, or bare 9-digit mobile) get the 972 prefix,
 * matching the app's Israeli audience.
 */
export function whatsappNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `972${d.slice(1)}`;
  else if (!d.startsWith("972") && d.length <= 9) d = `972${d}`;
  return d;
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${whatsappNumber(phone)}`;
}
