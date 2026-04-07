"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff/liff-provider";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

export default function LiffEntryPage() {
  const { isReady, liffError, isLoggedIn } = useLiff();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (liffError) return;

    if (isLoggedIn) {
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
  }, [isReady, liffError, isLoggedIn, router]);

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
