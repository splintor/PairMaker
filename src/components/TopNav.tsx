import Link from "next/link";
import { signOut } from "@/lib/auth";
import { CommunitySwitcher } from "./CommunitySwitcher";
import type { ActiveContext } from "@/lib/community";

export function TopNav({ ctx }: { ctx: ActiveContext }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <nav className="flex items-center gap-5 text-sm">
        <span className="text-lg font-extrabold text-brand-700">💞 שידוכים</span>
        <Link href="/app/candidates" className="font-medium text-brand-700">
          מועמדים
        </Link>
        <Link href="/app/matches" className="text-slate-500">
          שידוכים
        </Link>
        {ctx.role === "admin" && (
          <Link href="/app/settings" className="text-slate-500">
            הגדרות
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <CommunitySwitcher
          items={ctx.memberships.map((m) => ({
            communityId: m.communityId,
            communityName: m.communityName,
          }))}
          activeId={ctx.communityId}
        />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
            {(ctx.userName ?? ctx.userEmail ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-slate-700">{ctx.userName ?? ctx.userEmail}</div>
            <div className="text-xs text-slate-400">{ctx.role === "admin" ? "מנהל/ת" : "חבר/ה"}</div>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button className="text-sm text-slate-400 hover:text-slate-600">יציאה</button>
        </form>
      </div>
    </header>
  );
}
