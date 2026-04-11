import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";

interface Club {
  id: string;
  name: string;
  lineGroupId: string | null;
  homeCourtLocation: string | null;
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
  createdAt: string;
  role: string;
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await apiClient.get<Club>(`/api/clubs/${id}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <div className="mt-1 flex gap-2">
            <Badge variant={club.role === "owner" ? "default" : "secondary"}>
              {club.role}
            </Badge>
            {club.lineGroupId ? (
              <Badge variant="outline">LINE Group Linked</Badge>
            ) : (
              <Badge variant="destructive">Not Linked</Badge>
            )}
          </div>
        </div>
        {(club.role === "owner" || club.role === "admin") && (
          <div className="flex gap-2">
            <Link href={`/clubs/${id}/settings`}>
              <Button variant="outline">Settings</Button>
            </Link>
            <Link href={`/clubs/${id}/members`}>
              <Button variant="outline">Members</Button>
            </Link>
          </div>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{club.defaultMaxPlayers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shuttlecock Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{club.defaultShuttlecockFee} B</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Court Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{club.defaultCourtFee} B</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Home Court
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${!club.homeCourtLocation ? "text-muted-foreground" : ""}`}>
              {club.homeCourtLocation ?? "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Club Defaults</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            These defaults pre-fill the event creation form. You can override
            them per event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
