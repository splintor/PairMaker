import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";

export default function NoCommunity() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <EmptyState
          icon="🏘️"
          title="אין לך קהילה עדיין"
          hint="בקשו ממנהל/ת הקהילה להוסיף אתכם, או צרו קהילה חדשה."
          action={<LinkButton href="/communities/new">יצירת קהילה חדשה</LinkButton>}
        />
      </div>
    </main>
  );
}
