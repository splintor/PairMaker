import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { Select } from "@/components/Select";
import { PendingButton } from "@/components/PendingButton";
import { addMember, changeMemberRole, removeMember, renameCommunity, setMemberName } from "./actions";

const ROLE_OPTIONS = [
  { value: "member", label: "חבר/ה" },
  { value: "admin", label: "מנהל/ת" },
];

export default async function SettingsPage() {
  const ctx = await requireCapability("member:manage");

  const [community, members] = await Promise.all([
    db.community.findUnique({ where: { id: ctx.communityId } }),
    db.membership.findMany({
      where: { communityId: ctx.communityId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">הגדרות</h1>
        <Link href="/app/activity" className="text-sm text-brand-600 hover:underline">
          יומן פעילות →
        </Link>
      </div>

      <form action={renameCommunity} className="flex flex-wrap items-end gap-2 rounded-xl2 border border-brand-200 bg-white p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm text-slate-600">שם הקהילה</span>
          <input name="name" type="text" dir="rtl" required defaultValue={community?.name ?? ""} className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start" />
        </label>
        <PendingButton>שמירה</PendingButton>
      </form>

      <h2 className="text-lg font-bold text-brand-700">חברי הקהילה</h2>

      <form action={addMember} className="flex flex-wrap items-end gap-2 rounded-xl2 border border-brand-200 bg-white p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm text-slate-600">שם</span>
          <input name="name" type="text" dir="rtl" required placeholder="שם מלא" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start" />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-sm text-slate-600">הוספת חבר/ה (אימייל)</span>
          <input name="email" type="email" dir="rtl" required placeholder="name@example.com" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start" />
        </label>
        <div className="w-32">
          <span className="mb-1 block text-sm text-slate-600">תפקיד</span>
          <Select name="role" options={ROLE_OPTIONS} defaultValue="member" />
        </div>
        <PendingButton>הוספה</PendingButton>
      </form>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand-200 bg-white p-4">
            <div className="flex flex-col gap-1">
              <form action={setMemberName.bind(null, m.id)} className="flex items-end gap-2">
                <input
                  name="name"
                  type="text"
                  dir="rtl"
                  required
                  defaultValue={m.user.name ?? ""}
                  placeholder="שם מלא"
                  className="w-44 rounded-lg border border-brand-200 px-3 py-1.5 text-start text-sm"
                />
                <PendingButton className="text-xs text-brand-600 hover:underline disabled:opacity-60">שמירת שם</PendingButton>
              </form>
              <div className="text-xs text-slate-400">{m.user.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={changeMemberRole.bind(null, m.id)} className="w-32">
                <Select name="role" options={ROLE_OPTIONS} defaultValue={m.role} />
                <PendingButton className="mt-1 text-xs text-brand-600 hover:underline disabled:opacity-60">עדכון תפקיד</PendingButton>
              </form>
              <form action={removeMember.bind(null, m.id)}>
                <PendingButton className="text-sm text-red-600 hover:underline disabled:opacity-60">הסרה</PendingButton>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
