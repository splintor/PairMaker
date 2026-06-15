"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nav link that highlights itself when the current route matches its href
 * (exact, or a nested path like /app/candidates/[id]). Used in the top bar and
 * mobile menu so the active section is reflected by the route, not hardcoded.
 */
export function NavLink({
  href,
  children,
  onClick,
  className = "",
  activeClassName = "font-medium text-brand-700",
  inactiveClassName = "text-slate-500",
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} onClick={onClick} className={`${className} ${active ? activeClassName : inactiveClassName}`}>
      {children}
    </Link>
  );
}
