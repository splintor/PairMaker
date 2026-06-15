/** Gendered age phrase: "בן 30" for a male, "בת 27" for a female. null when no age. */
export function ageLabel(gender: "male" | "female", age: number | null): string | null {
  if (age == null) return null;
  return gender === "female" ? `בת ${age}` : `בן ${age}`;
}

/** Gendered active/inactive label: "פעיל"/"לא פעיל" (male), "פעילה"/"לא פעילה" (female), "פעיל/ה" fallback. */
export function statusLabel(gender: "male" | "female" | null | undefined, active: boolean): string {
  const base = gender === "male" ? "פעיל" : gender === "female" ? "פעילה" : "פעיל/ה";
  return active ? base : `לא ${base}`;
}

export function displayAge(c: { birthdate: Date | null }, now: Date = new Date()): number | null {
  if (!c.birthdate) return null;
  let age = now.getUTCFullYear() - c.birthdate.getUTCFullYear();
  const m = now.getUTCMonth() - c.birthdate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < c.birthdate.getUTCDate())) age--;
  return age;
}

/** Inverse of displayAge: a birthdate at today's month/day, year shifted back by `age`. */
export function ageToBirthdate(age: number, now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate()));
}

/** "30 (שנת לידה: 1996)" — age with birth year, or null when no birthdate. */
export function ageWithBirthYear(c: { birthdate: Date | null }, now: Date = new Date()): string | null {
  const age = displayAge(c, now);
  if (age == null) return null;
  return `${age} (שנת לידה: ${c.birthdate!.getUTCFullYear()})`;
}

/** Gendered smoking word: מעשן (male) / מעשנת (female). */
export function smokingLabel(gender: "male" | "female" | null | undefined): string {
  return gender === "female" ? "מעשנת" : "מעשן";
}

/**
 * Gendered "requirements from the partner" label: a man states requirements from
 * בת הזוג, a woman from בן הזוג; slash form when gender is unknown.
 */
export function requirementsLabel(gender: "male" | "female" | null | undefined): string {
  if (gender === "male") return "דרישות מבת הזוג";
  if (gender === "female") return "דרישות מבן הזוג";
  return "דרישות מבן/בת הזוג";
}

const FAMILY_STATUS_WORDS: Record<string, { male: string; female: string; neutral: string }> = {
  single: { male: "רווק", female: "רווקה", neutral: "רווק/ה" },
  divorced: { male: "גרוש", female: "גרושה", neutral: "גרוש/ה" },
  widowed: { male: "אלמן", female: "אלמנה", neutral: "אלמן/ה" },
};

/** Gendered family-status word, e.g. רווק/רווקה/רווק-ה; the raw value if unknown. */
export function familyStatusLabel(value: string, gender: "male" | "female" | null | undefined): string {
  const w = FAMILY_STATUS_WORDS[value];
  if (!w) return value;
  return gender === "male" ? w.male : gender === "female" ? w.female : w.neutral;
}

/** Gendered "how is this person related to me?" field label. */
export function relationLabel(gender: "male" | "female" | null | undefined): string {
  if (gender === "male") return "איך הוא קשור אלי?";
  if (gender === "female") return "איך היא קשורה אלי?";
  return "איך הוא/היא קשור/ה אלי?";
}

/** "First name" = the name without its last word (the whole name when it's a single word). */
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? "");
}

/** Display label for a candidate's creator: name, else email, else em-dash. */
export function creatorLabel(
  createdBy: { name: string | null; email: string | null } | null | undefined,
): string {
  return createdBy?.name ?? createdBy?.email ?? "—";
}

/** Gendered "added by" verb phrase: "נוסף ע״י" (male) / "נוספה ע״י" (female). */
export function addedByLabel(gender: "male" | "female" | null | undefined): string {
  return gender === "female" ? "נוספה ע״י" : "נוסף ע״י";
}
