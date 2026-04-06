"use client";

import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club-form";

export default function CreateClubPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    name: string;
    defaultMaxPlayers: number;
    defaultShuttlecockFee: number;
    defaultCourtFee: number;
  }) => {
    const res = await fetch("/api/proxy/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Failed to create club" }));
      throw new Error(error.message);
    }

    router.push("/clubs");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg">
      <ClubForm
        title="Create a New Club"
        submitLabel="Create Club"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
