"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface EventTemplate {
  id: string;
  title: string | null;
  venueName: string;
  eventDayOfWeek: number;
  eventTime: string;
  status: "active" | "paused" | "archived";
}

const dayLabels: Record<number, string> = {
  0: "อาทิตย์",
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
};

export default function TemplateListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <TemplateList />
    </Suspense>
  );
}

function TemplateList() {
  const { isReady, isLoggedIn } = useLiff();
  const searchParams = useSearchParams();
  const clubId = searchParams.get("clubId");

  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingNow, setCreatingNow] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    if (!clubId) {
      setError("ไม่พบ Club ID กรุณาเปิดหน้านี้ผ่านคำสั่งในกลุ่ม LINE");
      setLoading(false);
      return;
    }

    fetch(`/api/proxy/event-templates?clubId=${clubId}`)
      .then((res) => {
        if (res.status === 403) {
          setError("คุณไม่มีสิทธิ์จัดการ recurring กรุณาติดต่อผู้ดูแลสโมสร");
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          setError("โหลดข้อมูลไม่ได้");
          setLoading(false);
          return null;
        }
        return res.json() as Promise<EventTemplate[]>;
      })
      .then((data) => {
        if (!data) return;
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => {
        setError("โหลดข้อมูลไม่ได้");
        setLoading(false);
      });
  }, [isReady, isLoggedIn, clubId]);

  async function handleCreateNow(templateId: string) {
    if (!clubId) return;
    setCreatingNow(templateId);
    try {
      const res = await fetch(`/api/proxy/event-templates/${templateId}/create-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      if (!res.ok) {
        toast.error("สร้างไม่สำเร็จ กรุณาลองใหม่");
      } else {
        toast.success("สร้างและโพสต์อีเวนท์สำเร็จ");
      }
    } catch {
      toast.error("สร้างไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setCreatingNow(null);
    }
  }

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">รายการ recurring</h1>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold mb-2">ยังไม่มี recurring</h2>
          <p className="text-muted-foreground text-sm">
            สร้างอีเวนท์และเปิดตัวเลือก &quot;สร้างซ้ำทุกสัปดาห์&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {tpl.title ?? `${tpl.venueName} - วัน${dayLabels[tpl.eventDayOfWeek]}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      วัน{dayLabels[tpl.eventDayOfWeek]} {tpl.eventTime}
                    </p>
                  </div>
                  <StatusBadge status={tpl.status} />
                </div>

                <Button
                  variant="outline"
                  className="w-full min-h-[44px]"
                  disabled={creatingNow === tpl.id}
                  onClick={() => handleCreateNow(tpl.id)}
                >
                  {creatingNow === tpl.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    "สร้างอีเวนท์ทันที"
                  )}
                </Button>

                <Link href={`/liff/events/templates/${tpl.id}/edit?clubId=${clubId}`}>
                  <Button variant="ghost" className="w-full min-h-[44px]">
                    แก้ไข
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: EventTemplate["status"] }) {
  if (status === "active") {
    return <Badge variant="default">กำลังใช้งาน</Badge>;
  }
  if (status === "paused") {
    return <Badge variant="secondary">หยุดชั่วคราว</Badge>;
  }
  return <Badge variant="outline">เก็บถาวร</Badge>;
}
