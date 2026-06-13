import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { describeAudit, auditHref } from "@/lib/audit-format";
import { ActivityFilters } from "@/components/ActivityFilters";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";

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

      <ActivityFilters entityType={entityType ?? ""} action={action ?? ""} />

      {logs.length >= LIMIT && (
        <p className="text-xs text-slate-400">מוצגות {LIMIT} הרשומות האחרונות.</p>
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon="📋"
          title="אין רשומות התואמות את הסינון"
          action={<LinkButton href="/app/activity">נקה סינון</LinkButton>}
        />
      ) : (
        <ul className="space-y-2">
        {logs.map((l) => {
          const changes = (l.changes as Record<string, { from: unknown; to: unknown }> | null) ?? null;
          const parts = describeAudit(l);
          const href = auditHref(l);
          return (
            <li key={l.id} className="rounded-xl2 border border-brand-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-800">
                  {parts.before}
                  {href ? (
                    <Link href={href} className="font-medium text-brand-700 hover:underline">
                      {parts.label}
                    </Link>
                  ) : (
                    parts.label
                  )}
                  {parts.after}
                </span>
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
        </ul>
      )}
    </div>
  );
}
