import { candidatePhotoSrc } from "@/lib/photo";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
} as const;

export function CandidateAvatar({
  id,
  name,
  photoUrl,
  size = "md",
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const cls = `${SIZES[size]} shrink-0 rounded-full`;
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={candidatePhotoSrc(id, photoUrl)} alt={name} className={`${cls} object-cover`} />;
  }
  return (
    <div
      className={`${cls} flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white`}
    >
      {name.charAt(0)}
    </div>
  );
}
