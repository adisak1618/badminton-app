import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { env } from "@/lib/env";
import { db, members } from "@repo/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { idToken } = body;

  if (!idToken) {
    return NextResponse.json({ error: "ID token is required" }, { status: 401 });
  }

  // Verify token server-side via LINE — never trust client-supplied lineUserId (T-03-01, T-03-02)
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: env.LINE_LOGIN_CHANNEL_ID,
    }),
  });

  if (!verifyRes.ok) {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  // Extract lineUserId from LINE-verified token (profile.sub) — never from request body
  const profile = await verifyRes.json();

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  session.lineUserId = profile.sub;
  session.displayName = profile.name;
  session.pictureUrl = profile.picture;
  session.isLoggedIn = true;

  // Check if member record already exists (keyed by lineUserId — global, no club_id)
  const [existingMember] = await db
    .select()
    .from(members)
    .where(eq(members.lineUserId, profile.sub));

  if (existingMember) {
    session.memberId = existingMember.id;
  } else {
    // Auto-create member record so any LIFF page works without requiring setup first
    const [newMember] = await db
      .insert(members)
      .values({
        lineUserId: profile.sub,
        displayName: profile.name ?? "LINE User",
      })
      .returning();
    session.memberId = newMember.id;
  }

  await session.save();

  return NextResponse.json({
    ok: true,
    needsSetup: !existingMember,
    displayName: profile.name,
  });
}
