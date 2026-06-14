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

/** Display label for a candidate's creator: name, else email, else em-dash. */
export function creatorLabel(
  createdBy: { name: string | null; email: string | null } | null | undefined,
): string {
  return createdBy?.name ?? createdBy?.email ?? "—";
}
