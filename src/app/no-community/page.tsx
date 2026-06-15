import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";
import { signOut } from "@/lib/auth";

export default function NoCommunity() {
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <EmptyState
          icon="🏘️"
          title="אין לך קהילה עדיין"
          hint="בקשו ממנהל/ת הקהילה להוסיף אתכם, או צרו קהילה חדשה."
          action={<LinkButton href="/communities/new">יצירת קהילה חדשה</LinkButton>}
        />
        <form action={doSignOut} className="mt-4 text-center">
          <button className="text-sm text-slate-400 hover:text-slate-600">יציאה</button>
        </form>
      </div>
    </main>
  );
}
