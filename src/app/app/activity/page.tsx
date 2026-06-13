import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { describeAudit } from "@/lib/audit-format";

const ENTITY_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "candidate", label: "מועמדים" },
  { value: "suggestion", label: "שידוכים" },
  { value: "membership", label: "חברים" },
];
const ACTION_LABELS: Record<string, string> = {
  create: "יצירה",
  update: "עדכון",
  deactivate: "השבתה",
  reactivate: "החזרה לפעילות",
  delete: "מחיקה",
};

function fmtTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string }>;
}) {
  const ctx = await requireCapability("audit:view");
  const { entityType, action } = await searchParams;

  const where = {
    communityId: ctx.communityId,
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
  };
  const LIMIT = 200;
  const logs = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: LIMIT });

  // Resolve actor ids → names (members are few).
  const members = await db.membership.findMany({ where: { communityId: ctx.communityId }, include: { user: true } });
  const nameById = new Map(members.map((m) => [m.userId, m.user.name ?? m.user.email ?? ""]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">יומן פעילות</h1>
        <Link href="/app/settings" className="text-sm text-brand-600 hover:underline">← הגדרות</Link>
      </div>

      <form method="get" className="flex flex-wrap gap-3 rounded-xl2 border border-brand-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-2">
          סוג:
          <select name="entityType" defaultValue={entityType ?? ""} dir="rtl" className="rounded-lg border border-brand-200 px-2 py-1.5">
            {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          פעולה:
          <select name="action" defaultValue={action ?? ""} dir="rtl" className="rounded-lg border border-brand-200 px-2 py-1.5">
            <option value="">הכל</option>
            {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-brand-500 px-4 py-1.5 font-medium text-white hover:bg-brand-600">סינון</button>
        <Link href="/app/activity" className="self-center text-brand-600 hover:underline">ניקוי</Link>
      </form>

      {logs.length >= LIMIT && (
        <p className="text-xs text-slate-400">מוצגות {LIMIT} הרשומות האחרונות.</p>
      )}

      <ul className="space-y-2">
        {logs.map((l) => {
          const changes = (l.changes as Record<string, { from: unknown; to: unknown }> | null) ?? null;
          return (
            <li key={l.id} className="rounded-xl2 border border-brand-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-800">{describeAudit(l)}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtTime(l.createdAt)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {l.source === "bot" ? "🤖 בוט" : `ע״י ${nameById.get(l.actorId ?? "") || "—"}`}
              </div>
              {changes && Object.keys(changes).length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {Object.entries(changes).map(([field, ch]) => (
                    <li key={field}>
                      {field}: {String(ch.from ?? "—")} ← {String(ch.to ?? "—")}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {logs.length === 0 && (
          <li className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
            אין רשומות התואמות את הסינון.
          </li>
        )}
      </ul>
    </div>
  );
}
