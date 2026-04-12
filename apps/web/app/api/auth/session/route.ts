import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  return NextResponse.json({
    isLoggedIn: session.isLoggedIn ?? false,
    lineUserId: session.lineUserId ?? null,
    displayName: session.displayName ?? null,
  });
}
