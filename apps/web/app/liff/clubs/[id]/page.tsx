"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiff } from "@/components/liff/liff-provider";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import { Loader2 } from "lucide-react";

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

export default function LiffClubHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <LiffClubHubInner />
    </Suspense>
  );
}

function LiffClubHubInner() {
  const { isReady, isLoggedIn } = useLiff();
  const { id: clubId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [clubRes, eventsRes, templatesRes] = await Promise.all([
        fetch(`/api/proxy/clubs/${clubId}`),
        fetch(`/api/proxy/events?clubId=${clubId}`),
        fetch(`/api/proxy/event-templates?clubId=${clubId}`),
      ]);

      if (!clubRes.ok || !eventsRes.ok || !templatesRes.ok) {
        setError("โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
        return;
      }

      const [clubData, eventsData, templatesData] = await Promise.all([
        clubRes.json() as Promise<Club>,
        eventsRes.json() as Promise<EventListItem[]>,
        templatesRes.json() as Promise<EventTemplate[]>,
      ]);

      setClub(clubData);
      setEvents(eventsData);
      setTemplates(templatesData);
      setLoading(false);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;
    fetchData();
  }, [isReady, isLoggedIn, fetchData]);

  if (!isReady || !isLoggedIn || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-2">
        <h2 className="text-lg font-semibold text-destructive">โหลดข้อมูลไม่สำเร็จ</h2>
        <p className="text-sm text-muted-foreground">ไม่สามารถโหลดอีเวนต์ได้ กรุณาลองใหม่อีกครั้ง</p>
      </div>
    );
  }

  const activeTemplates = templates
    .filter((t) => t.status === "active")
    .sort((a, b) => a.eventDayOfWeek - b.eventDayOfWeek);

  return (
    <div className="px-4 py-6 space-y-6">
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

      <Separator />

      {/* Weekly Schedule section */}
      {activeTemplates.length > 0 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>ตารางซ้อม</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTemplates.map((t) => (
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
      <div>
        <h2 className="text-xl font-semibold mb-4">อีเวนต์ที่กำลังจะมาถึง</h2>
        {events.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="font-semibold">ยังไม่มีอีเวนต์</p>
            <p className="text-sm text-muted-foreground">ยังไม่มีอีเวนต์ที่กำลังจะมาถึง</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
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
