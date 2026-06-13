export type AuditView = { entityType: string; action: string; entityLabel: string };

export function describeAudit(e: AuditView): string {
  const L = `"${e.entityLabel}"`;
  if (e.entityType === "candidate") {
    const m: Record<string, string> = {
      create: `מועמד/ת ${L} נוסף/ה`,
      update: `מועמד/ת ${L} עודכן/ה`,
      deactivate: `מועמד/ת ${L} הושבת/ה`,
      reactivate: `מועמד/ת ${L} הוחזר/ה לפעילות`,
      delete: `מועמד/ת ${L} נמחק/ה`,
    };
    if (m[e.action]) return m[e.action];
  }
  if (e.entityType === "suggestion") {
    const m: Record<string, string> = {
      create: `הוצע שידוך: ${e.entityLabel}`,
      update: `עודכן שידוך: ${e.entityLabel}`,
      delete: `נמחק שידוך: ${e.entityLabel}`,
    };
    if (m[e.action]) return m[e.action];
  }
  if (e.entityType === "membership") {
    const m: Record<string, string> = {
      create: `חבר/ה נוסף/ה: ${e.entityLabel}`,
      update: `תפקיד עודכן: ${e.entityLabel}`,
      delete: `חבר/ה הוסר/ה: ${e.entityLabel}`,
    };
    if (m[e.action]) return m[e.action];
  }
  if (e.entityType === "community") {
    if (e.action === "create") return `קהילה נוצרה: ${L}`;
    if (e.action === "update") return `שם הקהילה עודכן ל-${L}`;
  }
  return `${e.entityType} · ${e.action}: ${e.entityLabel}`;
}
