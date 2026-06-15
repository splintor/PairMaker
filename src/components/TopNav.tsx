import Link from "next/link";
import { signOut } from "@/lib/auth";
import { NavLink } from "./NavLink";
import { CommunitySwitcher } from "./CommunitySwitcher";
import { MobileNav } from "./MobileNav";
import type { ActiveContext } from "@/lib/community";

export function TopNav({ ctx }: { ctx: ActiveContext }) {
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-5">
        <Link href="/" className="text-lg font-extrabold text-brand-700">💞 PairMaker</Link>
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="ראשי">
          <NavLink href="/app/candidates">מועמדים</NavLink>
          <NavLink href="/app/matches">שידוכים</NavLink>
          {ctx.role === "admin" && <NavLink href="/app/settings">הגדרות</NavLink>}
        </nav>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <CommunitySwitcher
          items={ctx.memberships.map((m) => ({
            communityId: m.communityId,
            communityName: m.communityName,
          }))}
          activeId={ctx.communityId}
        />
        <div className="text-sm font-medium text-slate-700">{ctx.userName ?? ctx.userEmail}</div>
        <form action={doSignOut}>
          <button className="text-sm text-slate-400 hover:text-slate-600">יציאה</button>
        </form>
      </div>

      <MobileNav ctx={ctx} signOutAction={doSignOut} />
    </header>
  );
}
