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
}

const LiffContext = createContext<LiffContextValue>({
  liff: null,
  liffError: null,
  isReady: false,
  isLoggedIn: false,
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

  useEffect(() => {
    // Dynamic import prevents SSR crash ("window is not defined" — RESEARCH.md Pitfall 1)
    import("@line/liff")
      .then((mod) => mod.default)
      .then((liffInstance) =>
        liffInstance.init({ liffId }).then(() => {
          setLiff(liffInstance);

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
              .then(() => {
                setIsLoggedIn(true);
                setIsReady(true);
              })
              .catch(() => {
                setLiffError("Authentication failed");
                setIsReady(true);
              });
          } else {
            // Per D-03: no browser fallback — require LINE environment
            setLiffError(
              "Could not get ID token. Please ensure this page is opened inside LINE."
            );
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
    <LiffContext.Provider value={{ liff, liffError, isReady, isLoggedIn }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}
