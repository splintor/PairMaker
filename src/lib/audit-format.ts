export type AuditView = { entityType: string; action: string; entityLabel: string };

/** A sentence split so the entity name (`label`) can be rendered as a link. */
export type AuditParts = { before: string; label: string; after: string };

export function describeAudit(e: AuditView): AuditParts {
  const name = e.entityLabel;
  if (e.entityType === "candidate") {
    const suffix: Record<string, string> = {
      create: '" נוסף/ה',
      update: '" עודכן/ה',
      deactivate: '" הושבת/ה',
      reactivate: '" הוחזר/ה לפעילות',
      delete: '" נמחק/ה',
    };
    if (suffix[e.action]) return { before: 'מועמד/ת "', label: name, after: suffix[e.action] };
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
    const prefix: Record<string, string> = {
      create: "חבר/ה נוסף/ה: ",
      update: "תפקיד עודכן: ",
      delete: "חבר/ה הוסר/ה: ",
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
