"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClubForm } from "@/components/club-form";

interface Club {
  id: string;
  name: string;
  defaultMaxPlayers: number;
  homeCourtLocation: string;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
}

export default function ClubSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClub() {
      const res = await fetch(`/api/proxy/clubs/${params.id}`);
      if (res.ok) {
        setClub(await res.json());
      }
      setLoading(false);
    }
    loadClub();
  }, [params.id]);

  const handleSubmit = async (data: {
    name: string;
    defaultMaxPlayers: number;
    defaultShuttlecockFee: number;
    defaultCourtFee: number;
  }) => {
    const res = await fetch(`/api/proxy/clubs/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Failed to update" }));
      throw new Error(error.message);
    }

    router.push(`/clubs/${params.id}`);
    router.refresh();
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!club) {
    return <div className="text-destructive">Club not found</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <ClubForm
        title="Club Settings"
        submitLabel="Save Changes"
        defaultValues={{
          name: club.name,
          defaultMaxPlayers: club.defaultMaxPlayers,
          defaultShuttlecockFee: club.defaultShuttlecockFee,
          homeCourtLocation: club.homeCourtLocation,
          defaultCourtFee: club.defaultCourtFee,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
