import { Elysia } from "elysia";
import { unsealData } from "iron-session";
import { env } from "../env";
import { unauthorized } from "../lib/errors";

interface SessionData {
  lineUserId?: string;
  memberId?: string;
  displayName?: string;
  pictureUrl?: string;
  isLoggedIn: boolean;
}

export const authMiddleware = new Elysia({ name: "auth" })
  .derive({ as: "scoped" }, async ({ cookie }) => {
    const sealed = cookie["badminton-session"]?.value;
    if (!sealed) throw unauthorized("No session cookie");

    const session = await unsealData<SessionData>(sealed, {
      password: env.SESSION_SECRET,
    });

    if (!session.isLoggedIn || !session.lineUserId) {
      throw unauthorized("Invalid session");
    }

    return { session };
  });
