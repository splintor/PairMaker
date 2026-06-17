import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeCandidatePhoto } from "@/lib/blob";
import { validatePhotoUpload, extForType } from "@/lib/photo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Must be a member of at least one community, and not globally blocked.
  const member = await db.membership.findFirst({
    where: { userId: session.user.id },
    select: { user: { select: { blockedAt: true } } },
  });
  if (!member || member.user.blockedAt) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "חסר קובץ" }, { status: 400 });
  }

  const check = validatePhotoUpload({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });

  try {
    const handle = await storeCandidatePhoto(
      await file.arrayBuffer(),
      extForType(file.type),
      file.type,
    );
    return NextResponse.json({ handle });
  } catch (err) {
    console.error("[photo upload] blob store failed:", err);
    return NextResponse.json({ error: "אחסון התמונות אינו זמין כעת" }, { status: 500 });
  }
}
