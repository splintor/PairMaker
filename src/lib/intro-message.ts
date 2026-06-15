import { ageLabel } from "@/lib/candidate-display";

type Gender = "male" | "female";

export type IntroParty = {
  name: string;
  gender: Gender;
  age: number | null;
  occupation: string | null;
  city: string | null;
  phone: string;
};

/**
 * Natural-language WhatsApp intro inviting a `recipientGender` person to contact
 * `intro`, e.g.:
 *   "אתה מוזמן ליצור קשר עם אליס, בת 27, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567."
 * The invitation is gender-matched to the recipient; age/possessive to `intro`.
 * Missing descriptor pieces (age/occupation/city) are dropped cleanly.
 */
export function buildIntroMessage(recipientGender: Gender, intro: IntroParty): string {
  const invite = recipientGender === "female" ? "את מוזמנת" : "אתה מוזמן";

  const occCity =
    intro.occupation && intro.city
      ? `${intro.occupation} מ${intro.city}`
      : intro.occupation || (intro.city ? `מ${intro.city}` : "");
  const descriptor = [ageLabel(intro.gender, intro.age), occCity].filter(Boolean).join(", ");
  const possessive = intro.gender === "female" ? "שלה" : "שלו";

  let s = `${invite} ליצור קשר עם ${intro.name}`;
  if (descriptor) s += `, ${descriptor}`;
  s += `. מספר הטלפון ${possessive} הוא ${intro.phone}.`;
  return s;
}
