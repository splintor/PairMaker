import { NextResponse } from "next/server";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/community";

export async function POST(req: Request) {
  const { communityId } = await req.json();
  if (typeof communityId !== "string" || !communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
