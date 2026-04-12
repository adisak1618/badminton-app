"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import { ProfileForm } from "@/components/liff/profile-form";
import { Loader2 } from "lucide-react";

interface MemberProfile {
  id: string;
  displayName: string;
  skillLevel: "beginner" | "intermediate" | "advanced" | "competitive";
  yearsPlaying: number;
}

export default function LiffProfilePage() {
  const { isReady, isLoggedIn } = useLiff();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    fetch("/api/proxy/liff/profile")
      .then((res) => {
        if (res.status === 404) {
          window.location.replace("/liff/setup");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, [isReady, isLoggedIn]);

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8">
        <p className="text-destructive">Could not load profile. Please try again.</p>
      </div>
    );
  }

  async function handleSubmit(data: {
    displayName: string;
    skillLevel: string;
    yearsPlaying: number;
  }) {
    const res = await fetch("/api/proxy/liff/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Could not save. Please try again.");
      throw new Error("Update failed");
    }
    const updated = await res.json();
    setProfile(updated);
    toast.success("Profile updated");
    // Per D-08: Stay on page after save. No redirect.
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <ProfileForm
        defaultValues={{
          displayName: profile.displayName,
          skillLevel: profile.skillLevel,
          yearsPlaying: profile.yearsPlaying,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
