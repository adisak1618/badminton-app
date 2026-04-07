import type { SessionOptions } from "iron-session";

export interface SessionData {
  lineUserId?: string;
  memberId?: string;
  displayName?: string;
  pictureUrl?: string;
  isLoggedIn: boolean;
  oauthState?: string;
  oauthNonce?: string;
  returnTo?: string;
}

export const defaultSession: SessionData = { isLoggedIn: false };

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "badminton-session",
  ttl: 60 * 60 * 24 * 14, // 14 days
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};
