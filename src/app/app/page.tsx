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
      <p className="mt-4 text-sm text-slate-400">ניהול המועמדים יתווסף ב-M2.</p>
    </div>
  );
}
