import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import crypto from "crypto";
import { sessionOptions, type SessionData } from "@/lib/session";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo");

  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.oauthState = state;
  session.oauthNonce = nonce;
  if (returnTo?.startsWith("/")) {
    session.returnTo = returnTo;
  }
  await session.save();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINE_LOGIN_CHANNEL_ID,
    redirect_uri: env.LINE_LOGIN_CALLBACK_URL,
    state,
    scope: "profile openid",
    nonce,
  });

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );
}
