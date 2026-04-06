import Link from "next/link";
import { apiClient } from "@/lib/api";
import { ClubCard } from "@/components/club-card";
import { Button } from "@repo/ui/components/button";

interface Club {
  id: string;
  name: string;
  lineGroupId: string | null;
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
  createdAt: string;
  role: string;
  joinedAt: string;
}

export default async function ClubsPage() {
  const clubs = await apiClient.get<Club[]>("/api/clubs");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Clubs</h1>
        <Link href="/clubs/create">
          <Button>Create Club</Button>
        </Link>
      </div>

      {clubs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have any clubs yet. Create one to get started!
          </p>
          <Link href="/clubs/create" className="mt-4 inline-block">
            <Button variant="outline">Create Your First Club</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              id={club.id}
              name={club.name}
              role={club.role}
              lineGroupId={club.lineGroupId}
              defaultMaxPlayers={club.defaultMaxPlayers}
              defaultShuttlecockFee={club.defaultShuttlecockFee}
              defaultCourtFee={club.defaultCourtFee}
            />
          ))}
        </div>
      )}
    </div>
  );
}
