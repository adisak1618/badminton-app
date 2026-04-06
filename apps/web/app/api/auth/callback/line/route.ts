import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!code || !state || state !== session.oauthState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.LINE_LOGIN_CALLBACK_URL,
      client_id: env.LINE_LOGIN_CHANNEL_ID,
      client_secret: env.LINE_LOGIN_CHANNEL_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
  }

  const tokenData = await tokenRes.json();

  // Verify ID token to get profile
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: tokenData.id_token,
      client_id: env.LINE_LOGIN_CHANNEL_ID,
    }),
  });

  if (!verifyRes.ok) {
    return NextResponse.redirect(new URL("/?error=id_token_verification_failed", request.url));
  }

  const profile = await verifyRes.json();

  // Upsert member via API — the API will handle database operations
  // For now, store Line profile in session; member upsert happens on first API call
  session.lineUserId = profile.sub;
  session.displayName = profile.name;
  session.pictureUrl = profile.picture;
  session.isLoggedIn = true;
  session.oauthState = undefined;
  session.oauthNonce = undefined;
  await session.save();

  return NextResponse.redirect(new URL("/clubs", request.url));
}
