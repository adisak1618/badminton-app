"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import { getLiffContextHeader, trySendMessages } from "@/lib/liff-messaging";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Loader2, X } from "lucide-react";

interface EventData {
  id: string;
  title: string;
  eventDate: string;
  venueName: string | null;
  venueMapsUrl: string | null;
  status: "open" | "closed" | "cancelled";
  maxPlayers: number;
  clubId: string;
}

interface Registration {
  id: string;
  memberId: string;
  displayName: string;
}

interface RegistrationsResponse {
  event: EventData;
  registrations: Registration[];
  registeredCount: number;
  currentMemberRegistrationId: string | null;
  isAdmin: boolean;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function LiffEventRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <LiffEventRegisterInner />
    </Suspense>
  );
}

function LiffEventRegisterInner() {
  const { liff, isReady, isLoggedIn } = useLiff();
  const { id: eventId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [currentMemberRegistrationId, setCurrentMemberRegistrationId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/registrations?eventId=${eventId}`);
      if (!res.ok) {
        setError("โหลดข้อมูลไม่ได้ กรุณาลองใหม่");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as RegistrationsResponse;
      setEvent(data.event);
      setRegistrations(data.registrations);
      setRegisteredCount(data.registeredCount);
      setCurrentMemberRegistrationId(data.currentMemberRegistrationId);
      setIsAdmin(data.isAdmin);
      setLoading(false);
    } catch {
      setError("โหลดข้อมูลไม่ได้ กรุณาลองใหม่");
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    fetchData();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isReady, isLoggedIn, fetchData]);

  const isRegistered = currentMemberRegistrationId !== null;
  const isFull = registeredCount >= (event?.maxPlayers ?? 0);
  const isClosed = event?.status === "closed";
  const isCancelled = event?.status === "cancelled";

  async function handleRegisterToggle() {
    setSubmitting(true);
    try {
      if (isRegistered) {
        const res = await fetch(`/api/proxy/registrations/${currentMemberRegistrationId}`, {
          method: "DELETE",
          headers: { ...getLiffContextHeader(liff) },
        });
        if (res.ok) {
          const data = (await res.json()) as { registeredCount?: number; flexCard?: unknown };
          await trySendMessages(liff, data.flexCard);
          toast.success("ยกเลิกสำเร็จ");
          await fetchData();
        } else {
          const data = (await res.json()) as { message?: string };
          toast.error(data.message ?? "ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
        }
      } else {
        const res = await fetch("/api/proxy/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getLiffContextHeader(liff) },
          body: JSON.stringify({ eventId }),
        });
        if (res.status === 201) {
          const data = (await res.json()) as { id?: string; registeredCount?: number; flexCard?: unknown };
          await trySendMessages(liff, data.flexCard);
          toast.success("ลงทะเบียนสำเร็จ");
          await fetchData();
        } else if (res.status === 409) {
          const data = (await res.json()) as { code?: string; message?: string };
          if (data.code === "ALREADY_REGISTERED") {
            toast.error("ลงทะเบียนแล้ว");
          } else if (data.code === "EVENT_FULL") {
            toast.error("งานนี้เต็มแล้ว");
          } else if (data.code === "EVENT_CLOSED") {
            toast.error("ปิดรับลงทะเบียนแล้ว");
          } else {
            toast.error(data.message ?? "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่");
          }
        } else {
          toast.error("ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember(registrationId: string) {
    try {
      const res = await fetch(`/api/proxy/registrations/${registrationId}`, {
        method: "DELETE",
        headers: { ...getLiffContextHeader(liff) },
      });
      if (res.ok) {
        const data = (await res.json()) as { registeredCount?: number; flexCard?: unknown };
        await trySendMessages(liff, data.flexCard);
        toast.success("ลบสำเร็จ");
        await fetchData();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  }

  async function handleToggleClose() {
    if (!event) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isClosed ? "open" : "closed" }),
      });
      if (res.ok) {
        toast.success(isClosed ? "เปิดรับลงทะเบียนสำเร็จ" : "ปิดรับลงทะเบียนสำเร็จ");
        await fetchData();
      } else {
        toast.error("ดำเนินการไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8">
        <p className="text-destructive">{error ?? "เกิดข้อผิดพลาด"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">ลงทะเบียน</h1>

      {/* Full state badge — per D-14 */}
      {isFull && !isClosed && !isCancelled && (
        <span className="inline-block mb-4 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm">
          เต็มแล้ว
        </span>
      )}

      {/* Cancelled state badge — per D-08 */}
      {isCancelled && (
        <span className="inline-block mb-4 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm">
          ยกเลิกแล้ว
        </span>
      )}

      {/* Event info card */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-1">
          <p className="text-sm font-bold">{event.title}</p>
          <p className="text-sm text-muted-foreground">{formatDate(event.eventDate)}</p>
          {event.venueName && <p className="text-sm">{event.venueName}</p>}
          {event.venueMapsUrl && (
            <a href={event.venueMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
              Google Maps
            </a>
          )}
          <p className={`text-sm ${isFull ? "text-destructive" : "text-foreground"}`}>
            {registeredCount}/{event.maxPlayers} คน
          </p>
        </CardContent>
      </Card>

      {/* Register/Cancel button — per D-01, D-03, D-08, D-14, D-16 */}
      <Button
        className="w-full min-h-[44px] mb-6"
        disabled={submitting || (isFull && !isRegistered) || isClosed || isCancelled}
        onClick={handleRegisterToggle}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isRegistered ? "กำลังยกเลิก..." : "กำลังลงทะเบียน..."}
          </>
        ) : isCancelled ? (
          "ยกเลิกแล้ว"
        ) : isClosed ? (
          "ปิดรับลงทะเบียนแล้ว"
        ) : isFull && !isRegistered ? (
          "เต็มแล้ว"
        ) : isRegistered ? (
          "ยกเลิก"
        ) : (
          "ลงทะเบียน"
        )}
      </Button>

      {/* Member list — per D-02 */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-bold mb-4">ลงทะเบียนแล้ว</p>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีผู้ลงทะเบียน</p>
          ) : (
            <ul className="space-y-3">
              {registrations.map((reg, idx) => (
                <li key={reg.id} className="flex items-center justify-between text-sm">
                  <span>
                    {idx + 1}. {reg.displayName}
                  </span>
                  {isAdmin && (
                    <button
                      className="text-muted-foreground hover:text-destructive p-1"
                      onClick={() => handleRemoveMember(reg.id)}
                      aria-label={`ลบ ${reg.displayName}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Admin close/reopen button — per D-11, D-13 */}
      {isAdmin && (
        <Button
          variant="outline"
          className="w-full min-h-[44px] mt-6"
          disabled={submitting}
          onClick={handleToggleClose}
        >
          {isClosed ? "เปิดรับลงทะเบียน" : "ปิดรับลงทะเบียน"}
        </Button>
      )}
    </div>
  );
}
