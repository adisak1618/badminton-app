"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import { ProfileForm } from "@/components/liff/profile-form";
import { Loader2 } from "lucide-react";

export default function LiffSetupPage() {
  const { isReady, liff } = useLiff();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [defaultName, setDefaultName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    // Get display name from LIFF profile to pre-fill (per D-05)
    if (liff) {
      const decodedToken = liff.getDecodedIDToken();
      if (decodedToken?.name) {
        setDefaultName(decodedToken.name);
      }
    }
    setLoading(false);
  }, [isReady, liff]);

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  async function handleSubmit(data: {
    displayName: string;
    skillLevel: string;
    yearsPlaying: number;
  }) {
    const res = await fetch("/api/proxy/liff/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Could not save. Please try again." }));
      toast.error(err.message || "Could not save. Please try again.");
      throw new Error(err.message);
    }
    toast.success("Profile saved");
    router.replace(returnTo || "/liff/profile");
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Set Up Your Profile</h1>
      <p className="text-sm text-muted-foreground mb-6">This only takes a moment.</p>
      <ProfileForm
        defaultValues={{ displayName: defaultName }}
        onSubmit={handleSubmit}
        submitLabel="Set Up Profile"
      />
    </div>
  );
}
