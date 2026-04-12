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

interface EventListItem {
  id: string;
  title: string;
  eventDate: string;
  venueName: string | null;
  venueMapsUrl: string | null;
  shuttlecockFee: number;
  courtFee: number;
  maxPlayers: number;
  status: string;
  registeredCount: number;
}

interface EventTemplate {
  id: string;
  clubId: string;
  venueName: string;
  eventDayOfWeek: number;
  eventTime: string;
  status: string;
}

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [club, eventsList, templates] = await Promise.all([
    apiClient.get<Club>(`/api/clubs/${id}`),
    apiClient.get<EventListItem[]>(`/api/events?clubId=${id}`),
    apiClient.get<EventTemplate[]>(`/api/event-templates?clubId=${id}`),
  ]);

  const activeTemplates = templates.filter((t) => t.status === "active");
  const isAdminOrOwner = club.role === "owner" || club.role === "admin";

  return (
    <div className="space-y-6">
      {/* Club header */}
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.2]">{club.name}</h1>
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

      {/* Quick-links navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-[44px]" asChild>
          <Link href={`#events`}>อีเวนต์</Link>
        </Button>
        {isAdminOrOwner && (
          <>
            <Button variant="outline" className="min-h-[44px]" asChild>
              <Link href={`/clubs/${id}/members`}>สมาชิก</Link>
            </Button>
            <Button variant="outline" className="min-h-[44px]" asChild>
              <Link href={`/clubs/${id}/settings`}>ตั้งค่า</Link>
            </Button>
          </>
        )}
      </div>

      <Separator />

      {/* Weekly Schedule section */}
      {activeTemplates.length > 0 && (
        <div id="schedule">
          <Card>
            <CardHeader>
              <CardTitle>ตารางซ้อม</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTemplates
                .sort((a, b) => a.eventDayOfWeek - b.eventDayOfWeek)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-sm font-semibold w-16">{THAI_DAYS[t.eventDayOfWeek]}</span>
                    <span className="text-sm">{t.eventTime}</span>
                    <span className="text-sm text-muted-foreground truncate">{t.venueName}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Events section */}
      <div id="events">
        <h2 className="text-xl font-semibold mb-4">อีเวนต์ที่กำลังจะมาถึง</h2>
        {eventsList.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="font-semibold">ยังไม่มีอีเวนต์</p>
            <p className="text-sm text-muted-foreground">ยังไม่มีอีเวนต์ที่กำลังจะมาถึง</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {eventsList.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-xl font-semibold">{formatDate(event.eventDate)}</p>
                    <p className="text-sm">{event.venueName}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min((event.registeredCount / event.maxPlayers) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {event.registeredCount}/{event.maxPlayers} คน
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>ลูก {event.shuttlecockFee}฿</span>
                      <span>สนาม {event.courtFee}฿</span>
                      <span>สูงสุด {event.maxPlayers} คน</span>
                    </div>
                    {event.registeredCount >= event.maxPlayers && (
                      <Badge variant="secondary" className="w-full justify-center min-h-[44px]">เต็มแล้ว</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
