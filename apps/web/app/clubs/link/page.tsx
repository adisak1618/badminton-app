"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

interface Club {
  id: string;
  name: string;
  lineGroupId: string | null;
  role: string;
}

function LinkGroupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = searchParams.get("groupId");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadClubs() {
      const res = await fetch("/api/proxy/clubs");
      if (res.ok) {
        const allClubs: Club[] = await res.json();
        // Show only unlinked clubs where user is owner
        setClubs(
          allClubs.filter((c) => !c.lineGroupId && c.role === "owner")
        );
      }
      setLoading(false);
    }
    loadClubs();
  }, []);

  if (!groupId) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">
          Missing group ID. Please use the link from the LINE bot.
        </p>
      </div>
    );
  }

  const handleLink = async (clubId: string) => {
    setLinking(clubId);
    setError(null);

    const res = await fetch("/api/proxy/clubs/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, groupId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to link" }));
      setError(err.message);
      setLinking(null);
      return;
    }

    setSuccess(clubs.find((c) => c.id === clubId)?.name || "Club");
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg text-center py-20">
        <Card>
          <CardContent className="pt-6">
            <p className="text-lg font-semibold">
              Successfully linked to {success}!
            </p>
            <p className="mt-2 text-muted-foreground">
              The bot will now manage events for this club in your LINE group.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/clubs")}
            >
              Go to My Clubs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading your clubs...</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Link LINE Group to Club</h1>
        <p className="mt-1 text-muted-foreground">
          Select which club to link with this LINE group.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {clubs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have any unlinked clubs. Create a club first, then come
              back to link it.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/clubs/create")}
            >
              Create a Club
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clubs.map((club) => (
            <Card key={club.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{club.name}</CardTitle>
                <Button
                  size="sm"
                  disabled={linking !== null}
                  onClick={() => handleLink(club.id)}
                >
                  {linking === club.id ? "Linking..." : "Link"}
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LinkGroupPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
      <LinkGroupContent />
    </Suspense>
  );
}
