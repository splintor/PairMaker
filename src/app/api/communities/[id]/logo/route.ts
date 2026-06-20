import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCommunityLogo } from "@/lib/blob";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  // Serve the logo only to members of the community (membership folded into the where).
  const community = await db.community.findFirst({
    where: { id, memberships: { some: { userId: session.user.id } } },
    select: { logoUrl: true },
  });
  if (!community?.logoUrl) return new NextResponse(null, { status: 404 });

  const logo = await readCommunityLogo(community.logoUrl);
  if (!logo) return new NextResponse(null, { status: 404 });

  return new NextResponse(logo.stream, {
    headers: {
      "Content-Type": logo.contentType,
      // The src URL carries a `?v=<blob-handle>` token that changes when the logo
      // changes, so an unchanged logo can be cached immutably.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
