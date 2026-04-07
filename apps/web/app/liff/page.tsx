"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiff } from "@/components/liff/liff-provider";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

export default function LiffEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <LiffEntryContent />
    </Suspense>
  );
}

function LiffEntryContent() {
  const { isReady, liffError, isLoggedIn } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isReady) return;
    if (liffError) return;

    if (isLoggedIn) {
      // Check for liff.state redirect (from ?path= in LIFF URL)
      const liffState = searchParams.get("liff.state");
      if (liffState) {
        // liff.state contains the path + query, e.g. "/events/create&clubId=xxx"
        // Parse it: everything before first & is the path, rest are query params
        const [path, ...queryParts] = liffState.split("&");
        const query = queryParts.length > 0 ? "?" + queryParts.join("&") : "";
        router.replace(`/liff${path}${query}`);
        return;
      }

      fetch("/api/proxy/liff/profile")
        .then((res) => {
          if (res.status === 404) {
            router.replace("/liff/setup");
          } else if (res.ok) {
            router.replace("/liff/profile");
          }
        })
        .catch(() => {
          router.replace("/liff/setup");
        });
    }
  }, [isReady, liffError, isLoggedIn, router, searchParams]);

  if (liffError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Unable to Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">
              Please close this page and open it again from LINE.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
