/** Gendered age phrase: "בן 30" for a male, "בת 27" for a female. null when no age. */
export function ageLabel(gender: "male" | "female", age: number | null): string | null {
  if (age == null) return null;
  return gender === "female" ? `בת ${age}` : `בן ${age}`;
}

export function displayAge(
  c: { birthdate: Date | null; ageManual: number | null },
  now: Date = new Date(),
): number | null {
  if (c.birthdate) {
    let age = now.getUTCFullYear() - c.birthdate.getUTCFullYear();
    const m = now.getUTCMonth() - c.birthdate.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < c.birthdate.getUTCDate())) age--;
    return age;
  }
  if (typeof c.ageManual === "number") return c.ageManual;
  return null;
}
