"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClubForm } from "@/components/club-form";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/components/dialog";
import { toast } from "sonner";

interface Club {
  id: string;
  name: string;
  defaultMaxPlayers: number;
  homeCourtLocation: string;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
  lineGroupId: string | null;
}

export default function ClubSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    homeCourtLocation?: string;
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

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch(`/api/proxy/clubs/${params.id}/link`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unlink");
      toast.success("LINE Group unlinked");
      setDialogOpen(false);
      const updated = await fetch(`/api/proxy/clubs/${params.id}`);
      if (updated.ok) setClub(await updated.json());
    } catch {
      toast.error("Failed to unlink group. Please try again.");
      setDialogOpen(false);
    } finally {
      setUnlinking(false);
    }
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
      {club.lineGroupId && (
        <div className="mt-8">
          <h2 className="text-xl font-bold">LINE Group</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This club is linked to a LINE group. Unlinking will stop bot notifications.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
                Unlink Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unlink LINE Group?</DialogTitle>
                <DialogDescription>
                  Bot notifications will stop for this club. Members will no longer receive event updates in the LINE group. This cannot be undone from here — you will need to add the bot again to relink.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Keep Group</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleUnlink}
                  disabled={unlinking}
                >
                  {unlinking ? "Unlinking..." : "Unlink Group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
