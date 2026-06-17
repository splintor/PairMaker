import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCandidatePhoto } from "@/lib/blob";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  // Single round-trip: fetch the photo handles only if the viewer is a member of
  // the candidate's community (membership check folded into the where clause).
  const candidate = await db.candidate.findFirst({
    where: { id, community: { memberships: { some: { userId: session.user.id } } } },
    select: { photoUrl: true, photos: true },
  });
  if (!candidate) return new NextResponse(null, { status: 404 });

  // `?h=<handle>` serves a specific photo (validated to belong to this candidate);
  // otherwise serve the primary (photoUrl).
  const requested = new URL(req.url).searchParams.get("h");
  const target =
    requested && candidate.photos.includes(requested) ? requested : candidate.photoUrl;
  if (!target) return new NextResponse(null, { status: 404 });

  const photo = await readCandidatePhoto(target);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.stream, {
    headers: {
      "Content-Type": photo.contentType,
      // The src URL carries a `?v=<blob-handle>` token that changes whenever the
      // photo changes, so an unchanged avatar can be cached immutably (the browser
      // won't re-hit this function on every navigation / 5-minute window).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
