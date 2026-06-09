import { requireMembership } from "@/lib/community";

export default async function Dashboard() {
  const ctx = await requireMembership();
  const active = ctx.memberships.find((m) => m.communityId === ctx.communityId);
  return (
    <div className="rounded-xl2 border border-brand-200 bg-white p-6">
      <h1 className="text-xl font-bold text-brand-700">ברוך הבא 👋</h1>
      <p className="mt-2 text-sm text-slate-500">
        קהילה פעילה: {active?.communityName} · תפקיד: {ctx.role === "admin" ? "מנהל" : "חבר"}
      </p>
      <div className="mt-4">
        <a
          href="/app/candidates"
          className="inline-block rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600"
        >
          לניהול המועמדים →
        </a>
      </div>
    </div>
  );
}
