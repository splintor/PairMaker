import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-brand-200 bg-white p-10 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
