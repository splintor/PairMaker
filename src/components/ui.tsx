import Link from "next/link";
import { statusLabel } from "@/lib/candidate-display";

export function PrimaryButton({
  children,
  type = "submit",
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className="rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600"
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-brand-200 bg-white px-4 py-2.5 font-medium text-brand-700 hover:bg-brand-50"
    >
      {children}
    </Link>
  );
}

export function StatusPill({ active, gender }: { active: boolean; gender?: "male" | "female" | null }) {
  return active ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      {statusLabel(gender, true)}
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      {statusLabel(gender, false)}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl2 border border-brand-200 bg-white p-5 ${className}`}>{children}</div>
  );
}
