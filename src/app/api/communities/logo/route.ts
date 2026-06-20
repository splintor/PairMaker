import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeCommunityLogo } from "@/lib/blob";
import { validatePhotoUpload, extForType } from "@/lib/photo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const communityId = String(form.get("communityId") ?? "");
  const file = form.get("file");

  // Only an admin (non-blocked) of the target community may set its logo.
  const membership = await db.membership.findFirst({
    where: { communityId, userId: session.user.id, role: "admin" },
    select: { user: { select: { blockedAt: true } } },
  });
  if (!membership || membership.user.blockedAt) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "חסר קובץ" }, { status: 400 });
  }
  const check = validatePhotoUpload({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });

  try {
    const handle = await storeCommunityLogo(
      await file.arrayBuffer(),
      extForType(file.type),
      file.type,
    );
    return NextResponse.json({ handle });
  } catch (err) {
    console.error("[community logo upload] blob store failed:", err);
    return NextResponse.json({ error: "אחסון הלוגו אינו זמין כעת" }, { status: 500 });
  }
}
