import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 w-full rounded-xl2" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
