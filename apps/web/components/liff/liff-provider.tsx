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
    // Dynamic import prevents SSR crash ("window is not defined" — RESEARCH.md Pitfall 1)
    import("@line/liff")
      .then((mod) => mod.default)
      .then((liffInstance) =>
        liffInstance.init({ liffId }).then(() => {
          setLiff(liffInstance);
          setIsInClient(liffInstance.isInClient());

          // External browser login: if not inside LINE app and not yet logged in,
          // trigger LINE Login OAuth flow (RESEARCH.md Pattern 1, Pitfall 1)
          if (!liffInstance.isInClient() && !liffInstance.isLoggedIn()) {
            liffInstance.login({ redirectUri: window.location.href });
            return; // redirect imminent
          }

          // After LIFF init, get ID token and authenticate with our server
          // Per D-01: ID token is sent to /api/auth/liff (Next.js route handler, same origin)
          // NOT through /api/proxy — avoids circular dependency and is a direct server call
          const idToken = liffInstance.getIDToken();
          if (idToken) {
            fetch("/api/auth/liff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            })
              .then((res) => res.json())
              .then((data: { needsSetup?: boolean }) => {
                // Validate returnTo to prevent open redirect (T-10-02)
                const isRelativePath = (path: string) =>
                  path.startsWith("/") && !path.includes("://");

                if (data.needsSetup && !window.location.pathname.startsWith("/setup")) {
                  const rawReturnTo = window.location.pathname + window.location.search;
                  const returnTo = isRelativePath(rawReturnTo)
                    ? encodeURIComponent(rawReturnTo)
                    : encodeURIComponent("/");
                  window.location.href = `/setup?returnTo=${returnTo}`;
                  return;
                }
                setIsLoggedIn(true);
                setIsReady(true);
              })
              .catch(() => {
                setLiffError("Authentication failed");
                setIsReady(true);
              });
          } else {
            setLiffError("Could not get ID token.");
            setIsReady(true);
          }
        })
      )
      .catch((err: unknown) => {
        setLiffError(String(err));
        setIsReady(true);
      });
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
