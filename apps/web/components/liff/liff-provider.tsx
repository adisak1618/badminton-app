"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Liff } from "@line/liff";

interface LiffContextValue {
  liff: Liff | null;
  liffError: string | null;
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
}

const LiffContext = createContext<LiffContextValue>({
  liff: null,
  liffError: null,
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
});

export function LiffProvider({
  liffId,
  children,
}: {
  liffId: string;
  children: ReactNode;
}) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInClient, setIsInClient] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if user already has a valid app session (e.g. logged in via LINE Login OAuth)
        // before running LIFF init — avoids redundant liff.login() redirect
        const sessionRes = await fetch("/api/auth/session");
        const session: { isLoggedIn: boolean } = await sessionRes.json();

        if (session.isLoggedIn) {
          // Already authenticated — init LIFF silently for sendMessages but skip login
          const liffModule = await import("@line/liff");
          const liffInstance = liffModule.default;
          await liffInstance.init({ liffId });
          setLiff(liffInstance);
          setIsInClient(liffInstance.isInClient());
          setIsLoggedIn(true);
          setIsReady(true);
          return;
        }

        // No existing session — proceed with full LIFF auth flow
        const liffModule = await import("@line/liff");
        const liffInstance = liffModule.default;
        await liffInstance.init({ liffId });
        setLiff(liffInstance);
        setIsInClient(liffInstance.isInClient());

        // External browser: redirect to app's LINE Login OAuth (consistent UX)
        if (!liffInstance.isInClient() && !liffInstance.isLoggedIn()) {
          const returnTo = window.location.pathname + window.location.search;
          window.location.href = `/api/auth/login/line?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }

        // Inside LINE app: use LIFF ID token to create session
        const idToken = liffInstance.getIDToken();
        if (idToken) {
          const res = await fetch("/api/auth/liff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          const data: { needsSetup?: boolean } = await res.json();

          const isRelativePath = (path: string) =>
            path.startsWith("/") && !path.includes("://");

          if (data.needsSetup && !window.location.pathname.startsWith("/setup")) {
            const rawReturnTo = window.location.pathname + window.location.search;
            const encodedReturn = isRelativePath(rawReturnTo)
              ? encodeURIComponent(rawReturnTo)
              : encodeURIComponent("/");
            window.location.href = `/setup?returnTo=${encodedReturn}`;
            return;
          }
          setIsLoggedIn(true);
          setIsReady(true);
        } else {
          setLiffError("Could not get ID token.");
          setIsReady(true);
        }
      } catch (err: unknown) {
        setLiffError(String(err));
        setIsReady(true);
      }
    };

    init();
  }, [liffId]);

  return (
    <LiffContext.Provider value={{ liff, liffError, isReady, isLoggedIn, isInClient }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}
