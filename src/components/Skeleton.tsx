export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-brand-100/70 ${className}`} aria-hidden />;
}
