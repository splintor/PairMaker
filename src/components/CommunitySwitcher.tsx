"use client";
import { useRouter } from "next/navigation";

type Item = { communityId: string; communityName: string };

export function CommunitySwitcher({ items, activeId }: { items: Item[]; activeId: string }) {
  const router = useRouter();
  if (items.length <= 1) {
    const only = items[0];
    return (
      <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-700">
        {only?.communityName}
      </span>
    );
  }
  return (
    <select
      defaultValue={activeId}
      onChange={async (e) => {
        await fetch("/api/active-community", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId: e.target.value }),
        });
        router.refresh();
      }}
      className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-700"
    >
      {items.map((i) => (
        <option key={i.communityId} value={i.communityId}>
          {i.communityName}
        </option>
      ))}
    </select>
  );
}
