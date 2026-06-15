import { ageLabel, firstName } from "@/lib/candidate-display";

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
 * Natural-language WhatsApp intro greeting the `recipient` by first name and
 * inviting them to contact `intro`, e.g.:
 *   "היי דני,
 *    אתה מוזמן ליצור קשר עם אליס, בת 27, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567."
 * The invitation is gender-matched to the recipient; age/possessive to `intro`.
 * Missing descriptor pieces (age/occupation/city) are dropped cleanly.
 */
export function buildIntroMessage(recipient: { name: string; gender: Gender }, intro: IntroParty): string {
  const invite = recipient.gender === "female" ? "את מוזמנת" : "אתה מוזמן";

  const occCity =
    intro.occupation && intro.city
      ? `${intro.occupation} מ${intro.city}`
      : intro.occupation || (intro.city ? `מ${intro.city}` : "");
  const descriptor = [ageLabel(intro.gender, intro.age), occCity].filter(Boolean).join(", ");
  const possessive = intro.gender === "female" ? "שלה" : "שלו";

  let s = `היי ${firstName(recipient.name)},\n${invite} ליצור קשר עם ${intro.name}`;
  if (descriptor) s += `, ${descriptor}`;
  s += `. מספר הטלפון ${possessive} הוא ${intro.phone}.`;
  return s;
}

/**
 * WhatsApp pitch to the member who added `theirCandidate` (greeted by first name),
 * proposing a match with the sender's `myCandidate` (linked). `*…*` is WhatsApp
 * bold; the blank line is a real newline that survives wa.me's text= param.
 */
export function buildMemberPitchMessage(args: {
  creatorName: string;
  theirCandidate: string;
  myCandidate: string;
  myCandidateUrl: string;
}): string {
  return `היי ${firstName(args.creatorName)},\nחשבתי לשדך את *${args.theirCandidate}* עם *${args.myCandidate}* - ${args.myCandidateUrl}\n\nמה דעתך?`;
}
