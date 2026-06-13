import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCandidatePhoto } from "@/lib/blob";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const candidate = await db.candidate.findUnique({ where: { id } });
  if (!candidate || !candidate.photoUrl) return new NextResponse(null, { status: 404 });

  // Viewer must be a member of the candidate's community.
  const member = await db.membership.findFirst({
    where: { userId: session.user.id, communityId: candidate.communityId },
  });
  if (!member) return new NextResponse(null, { status: 404 });

  const photo = await readCandidatePhoto(candidate.photoUrl);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.stream, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
