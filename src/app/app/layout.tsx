import { requireMembership } from "@/lib/community";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMembership();
  return (
    <div className="min-h-screen">
      <TopNav ctx={ctx} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
