export type AuditView = {
  entityType: string;
  action: string;
  entityLabel: string;
  entityId?: string;
  /** Candidate gender, when known — lets candidate entries render the correct grammatical form. */
  gender?: "male" | "female" | null;
  /** Extra parties for "contact" entries, so the sentence can link every candidate involved. */
  contact?: {
    /** intro message: sent to the entity candidate ABOUT this candidate. */
    about?: { id: string; name: string };
    /** member pitch: sent to the entity member to match `source` with `target`. */
    source?: { id: string; name: string };
    target?: { id: string; name: string };
  };
};

/** A sentence split so the entity name (`label`) can be rendered as a link. */
export type AuditParts = { before: string; label: string; after: string };

/** A renderable sentence fragment; `href` (when set) makes it a link. */
export type AuditSegment = { text: string; href?: string };

const candidateHref = (id: string) => `/app/candidates/${id}`;

/**
 * The activity sentence as ordered segments, so entries can link more than one
 * entity (e.g. a "contact" entry links every candidate involved). Non-contact
 * entries reuse describeAudit + auditHref (a single optional link).
 */
export function describeAuditSegments(e: AuditView): AuditSegment[] {
  if (e.action === "contact") {
    // Intro: "נשלחה הודעה ל<A> בנוגע ל<B>" — A is the recipient, B the suggested match.
    if (e.entityType === "candidate" && e.entityId && e.contact?.about) {
      return [
        { text: "נשלחה הודעה ל" },
        { text: e.entityLabel, href: candidateHref(e.entityId) },
        { text: " בנוגע ל" },
        { text: e.contact.about.name, href: candidateHref(e.contact.about.id) },
      ];
    }
    // Member pitch: "נשלחה הודעה ל<C> להצעת שידוך בין <A> ל<B>".
    if (e.entityType === "membership" && e.contact?.source && e.contact?.target) {
      return [
        { text: `נשלחה הודעה ל${e.entityLabel} להצעת שידוך בין ` },
        { text: e.contact.source.name, href: candidateHref(e.contact.source.id) },
        { text: " ל" },
        { text: e.contact.target.name, href: candidateHref(e.contact.target.id) },
      ];
    }
  }
  // Default: single-label sentence with an optional link on the label.
  const p = describeAudit(e);
  const href = e.entityId
    ? auditHref({ entityType: e.entityType, entityId: e.entityId, action: e.action })
    : null;
  return [{ text: p.before }, { text: p.label, ...(href ? { href } : {}) }, { text: p.after }];
}

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
  return describeAuditSegments(e)
    .map((s) => s.text)
    .join("");
}

/** Link target for the entity name, or null when it shouldn't link (deletes, members, community). */
export function auditHref(e: { entityType: string; entityId: string; action: string }): string | null {
  if (e.action === "delete") return null;
  if (e.entityType === "candidate") return `/app/candidates/${e.entityId}`;
  if (e.entityType === "suggestion") return `/app/matches#${e.entityId}`;
  return null;
}
