import Link from "next/link";
import { communityLogoSrc } from "@/lib/photo";

/**
 * The "PairMaker" brand link in the nav. Shows the community logo when set
 * (slightly larger than the default emoji), otherwise the 💞 fallback.
 */
export function BrandMark({
  communityId,
  logoUrl,
  onClick,
}: {
  communityId: string;
  logoUrl: string | null;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex items-center gap-2 text-lg font-extrabold text-brand-700"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={communityLogoSrc(communityId, logoUrl)}
          alt=""
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <span className="text-2xl leading-none" aria-hidden>
          💞
        </span>
      )}
      PairMaker
    </Link>
  );
}
