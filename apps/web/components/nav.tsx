import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";
import Link from "next/link";

export async function Nav() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold">
          Badminton Club
        </Link>
        <div className="flex items-center gap-4">
          {session.isLoggedIn ? (
            <>
              <Link
                href="/clubs"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                My Clubs
              </Link>
              <span className="text-sm text-muted-foreground">
                {session.displayName}
              </span>
              <a
                href="/api/auth/logout"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              href="/api/auth/login/line"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Login with LINE
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
