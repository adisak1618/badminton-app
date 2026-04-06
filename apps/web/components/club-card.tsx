import Link from "next/link";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

interface ClubCardProps {
  id: string;
  name: string;
  role: string;
  lineGroupId: string | null;
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
}

export function ClubCard({
  id,
  name,
  role,
  lineGroupId,
  defaultMaxPlayers,
  defaultShuttlecockFee,
  defaultCourtFee,
}: ClubCardProps) {
  return (
    <Link href={`/clubs/${id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{name}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={role === "owner" ? "default" : "secondary"}>
              {role}
            </Badge>
            {lineGroupId ? (
              <Badge variant="outline">Linked</Badge>
            ) : (
              <Badge variant="destructive">Not linked</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Max: {defaultMaxPlayers} players</span>
            <span>Shuttle: {defaultShuttlecockFee}B</span>
            <span>Court: {defaultCourtFee}B</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
