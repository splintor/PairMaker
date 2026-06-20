/**
 * Normalize an Israeli phone number to its bare local form: "+972 52-537-4917"
 * and "050-657-5335" both become "0525374917"/"0506575335" (digits only, leading 0).
 * Non-Israeli numbers (e.g. a +1 prefix) and anything unrecognized are left as-is.
 */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // Other-country international numbers stay untouched (e.g. "+1 …").
  if (trimmed.startsWith("+") && !trimmed.startsWith("+972")) return trimmed;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // 00972… → 972…

  if (digits.startsWith("972")) return `0${digits.slice(3)}`; // Israeli international → local
  if (digits.startsWith("0")) return digits; // already local → just strip separators
  return trimmed; // nothing recognizable — leave it alone
}

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

export function whatsappHref(phone: string, text?: string): string {
  const base = `https://wa.me/${whatsappNumber(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
