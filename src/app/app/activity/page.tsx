import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { describeAudit, auditHref } from "@/lib/audit-format";
import { relativeTimeHe } from "@/lib/relative-time";
import { ActivityFilters } from "@/components/ActivityFilters";
import { ReloadButton } from "@/components/ReloadButton";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";

// Render in Israel local time (the server runs in UTC), DST-aware.
const TZ = "Asia/Jerusalem";
function fmtTime(d: Date): string {
  const date = d.toLocaleDateString("he-IL", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
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

  // Resolve candidate gender so candidate entries render the correct grammatical form.
  // Gender is effectively immutable, so the current value equals the value at action time.
  const candidateIds = [...new Set(logs.filter((l) => l.entityType === "candidate").map((l) => l.entityId))];
  const candidates = candidateIds.length
    ? await db.candidate.findMany({ where: { communityId: ctx.communityId, id: { in: candidateIds } }, select: { id: true, gender: true } })
    : [];
  const genderById = new Map(candidates.map((c) => [c.id, c.gender]));

  // Deleted candidates are gone from the table; recover gender from the delete snapshot.
  function genderFor(l: (typeof logs)[number]): "male" | "female" | null {
    if (l.entityType !== "candidate") return null;
    const live = genderById.get(l.entityId);
    if (live) return live;
    if (l.action === "delete") {
      const g = (l.snapshot as { gender?: unknown } | null)?.gender;
      if (g === "male" || g === "female") return g;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">יומן פעילות</h1>
        <div className="flex items-center gap-3">
          <ReloadButton />
          <Link href="/app/settings" className="text-sm text-brand-600 hover:underline">← הגדרות</Link>
        </div>
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
          const parts = describeAudit({ ...l, gender: genderFor(l) });
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
                <span className="shrink-0 cursor-default text-xs text-slate-400" title={fmtTime(l.createdAt)}>
                  {relativeTimeHe(l.createdAt)}
                </span>
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
