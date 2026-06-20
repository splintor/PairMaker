export type AuditView = {
  entityType: string;
  action: string;
  entityLabel: string;
  /** Candidate gender, when known — lets candidate entries render the correct grammatical form. */
  gender?: "male" | "female" | null;
};

/** A sentence split so the entity name (`label`) can be rendered as a link. */
export type AuditParts = { before: string; label: string; after: string };

export function describeAudit(e: AuditView): AuditParts {
  const name = e.entityLabel;
  if (e.entityType === "candidate") {
    // A WhatsApp intro message was sent to this candidate.
    if (e.action === "contact") return { before: "נשלחה הודעת היכרות ל", label: name, after: "" };
    // [male, female, bi-gender fallback] for each action's verb.
    const verbs: Record<string, [string, string, string]> = {
      create: ["נוסף", "נוספה", "נוסף/ה"],
      update: ["עודכן", "עודכנה", "עודכן/ה"],
      deactivate: ["הושבת", "הושבתה", "הושבת/ה"],
      reactivate: ["הוחזר לפעילות", "הוחזרה לפעילות", "הוחזר/ה לפעילות"],
      delete: ["נמחק", "נמחקה", "נמחק/ה"],
    };
    const v = verbs[e.action];
    if (v) {
      const idx = e.gender === "male" ? 0 : e.gender === "female" ? 1 : 2;
      const noun = e.gender === "male" ? "מועמד" : e.gender === "female" ? "מועמדת" : "מועמד/ת";
      return { before: `${noun} "`, label: name, after: `" ${v[idx]}` };
    }
  }
  if (e.entityType === "suggestion") {
    const prefix: Record<string, string> = {
      create: "הוצע שידוך: ",
      update: "עודכן שידוך: ",
      delete: "נמחק שידוך: ",
    };
    if (prefix[e.action]) return { before: prefix[e.action], label: name, after: "" };
  }
  if (e.entityType === "membership") {
    // A WhatsApp message was sent to this member about a possible match.
    if (e.action === "contact") return { before: "נשלחה הודעה לשדכן/ית ", label: name, after: "" };
    const prefix: Record<string, string> = {
      create: "שדכן/ית נוסף/ה: ",
      update: "תפקיד עודכן: ",
      delete: "שדכן/ית הוסר/ה: ",
    };
    if (prefix[e.action]) return { before: prefix[e.action], label: name, after: "" };
  }
  if (e.entityType === "community") {
    if (e.action === "create") return { before: "קהילה נוצרה: ", label: name, after: "" };
    if (e.action === "update") return { before: "שם הקהילה עודכן ל-", label: name, after: "" };
  }
  if (e.entityType === "auth" && e.action === "login") {
    return { before: "התחברות למערכת: ", label: name, after: "" };
  }
  return { before: `${e.entityType} · ${e.action}: `, label: name, after: "" };
}

/** The full sentence as plain text (e.g. for non-linked contexts / tests). */
export function auditSentence(e: AuditView): string {
  const p = describeAudit(e);
  return `${p.before}${p.label}${p.after}`;
}

/** Link target for the entity name, or null when it shouldn't link (deletes, members, community). */
export function auditHref(e: { entityType: string; entityId: string; action: string }): string | null {
  if (e.action === "delete") return null;
  if (e.entityType === "candidate") return `/app/candidates/${e.entityId}`;
  if (e.entityType === "suggestion") return `/app/matches#${e.entityId}`;
  return null;
}
