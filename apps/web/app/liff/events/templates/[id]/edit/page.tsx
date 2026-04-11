"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import { templateCreateSchema, type TemplateCreateFormData } from "@/lib/validations/event";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Loader2 } from "lucide-react";

interface EventTemplate {
  id: string;
  title: string | null;
  venueName: string;
  venueMapsUrl: string | null;
  shuttlecockFee: number;
  courtFee: number;
  maxPlayers: number;
  eventDayOfWeek: number;
  eventTime: string;
  openDayOfWeek: number;
  openTime: string;
  status: "active" | "paused" | "archived";
}

interface Occurrence {
  id: string;
  title: string | null;
  eventDate: string;
  status: string;
  templateId: string | null;
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

export default function TemplateEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <TemplateEditForm />
    </Suspense>
  );
}

function TemplateEditForm() {
  const { isReady, isLoggedIn } = useLiff();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const clubId = searchParams.get("clubId");
  const templateId = params.id;

  const [template, setTemplate] = useState<EventTemplate | null>(null);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const form = useForm<TemplateCreateFormData>({
    resolver: zodResolver(templateCreateSchema),
    defaultValues: {
      venueName: "",
      venueMapsUrl: "",
      shuttlecockFee: 0,
      courtFee: 0,
      maxPlayers: 20,
      title: "",
      eventDayOfWeek: 4,
      eventTime: "19:00",
      openDayOfWeek: 1,
      openTime: "12:00",
    },
  });

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
        const found = data.find((t) => t.id === templateId);
        if (!found) {
          setError("ไม่พบ recurring ที่ต้องการ");
          setLoading(false);
          return;
        }
        setTemplate(found);
        form.reset({
          venueName: found.venueName,
          venueMapsUrl: found.venueMapsUrl ?? "",
          shuttlecockFee: found.shuttlecockFee,
          courtFee: found.courtFee,
          maxPlayers: found.maxPlayers,
          title: found.title ?? "",
          eventDayOfWeek: found.eventDayOfWeek,
          eventTime: found.eventTime,
          openDayOfWeek: found.openDayOfWeek,
          openTime: found.openTime,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("โหลดข้อมูลไม่ได้");
        setLoading(false);
      });

    // Fetch occurrences for this template
    fetch(`/api/proxy/events?clubId=${clubId}&templateId=${templateId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Occurrence[]) => {
        setOccurrences(Array.isArray(data) ? data.filter((e) => e.status !== "cancelled") : []);
      })
      .catch(() => {
        // non-blocking: occurrences list is optional
      });
  }, [isReady, isLoggedIn, clubId, templateId, form]);

  async function onSubmit(data: TemplateCreateFormData) {
    const res = await fetch(`/api/proxy/event-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, clubId }),
    });

    if (res.status === 422) {
      toast.error("จำนวนผู้เล่นสูงสุดน้อยกว่าผู้ที่ลงทะเบียนอยู่แล้ว");
      return;
    }
    if (!res.ok) {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    toast.success("บันทึกการแก้ไขสำเร็จ");
  }

  async function handleCancel(eventId: string) {
    setCancellingId(eventId);
    try {
      const res = await fetch(
        `/api/proxy/event-templates/${templateId}/occurrences/${eventId}/cancel`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        toast.error("ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
      } else {
        toast.success("ยกเลิกอีเวนท์สำเร็จ");
        setOccurrences((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch {
      toast.error("ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setCancellingId(null);
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
      <h1 className="text-2xl font-bold mb-6">
        แก้ไข recurring
        {template?.title
          ? `: ${template.title}`
          : template
            ? ` - ${template.venueName}`
            : ""}
      </h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">ชื่ออีเวนท์ (ไม่บังคับ)</Label>
              <Input
                id="title"
                type="text"
                {...form.register("title")}
                placeholder="ระบบจะสร้างให้อัตโนมัติ"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Venue name */}
            <div className="space-y-2">
              <Label htmlFor="venueName">ชื่อสนาม</Label>
              <Input id="venueName" type="text" {...form.register("venueName")} />
              {form.formState.errors.venueName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.venueName.message}
                </p>
              )}
            </div>

            {/* Venue Maps URL */}
            <div className="space-y-2">
              <Label htmlFor="venueMapsUrl">ลิงก์ Google Maps (ไม่บังคับ)</Label>
              <Input id="venueMapsUrl" type="url" {...form.register("venueMapsUrl")} />
            </div>

            {/* Shuttlecock fee */}
            <div className="space-y-2">
              <Label htmlFor="shuttlecockFee">ค่าลูก (บาท)</Label>
              <Input
                id="shuttlecockFee"
                type="number"
                min="0"
                step="1"
                {...form.register("shuttlecockFee", { valueAsNumber: true })}
              />
            </div>

            {/* Court fee */}
            <div className="space-y-2">
              <Label htmlFor="courtFee">ค่าสนาม (บาท)</Label>
              <Input
                id="courtFee"
                type="number"
                min="0"
                step="1"
                {...form.register("courtFee", { valueAsNumber: true })}
              />
            </div>

            {/* Max players */}
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">จำนวนผู้เล่นสูงสุด</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="1"
                step="1"
                {...form.register("maxPlayers", { valueAsNumber: true })}
              />
              {form.formState.errors.maxPlayers && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.maxPlayers.message}
                </p>
              )}
            </div>

            {/* Event day of week */}
            <div className="space-y-2">
              <Label>วันที่จัดอีเวนท์</Label>
              <Select
                value={String(form.watch("eventDayOfWeek"))}
                onValueChange={(v) =>
                  form.setValue("eventDayOfWeek", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวัน" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dayLabels).map(([num, label]) => (
                    <SelectItem key={num} value={num}>
                      วัน{label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event time */}
            <div className="space-y-2">
              <Label htmlFor="eventTime">เวลาเริ่มอีเวนท์</Label>
              <Input id="eventTime" type="time" {...form.register("eventTime")} />
              {form.formState.errors.eventTime && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.eventTime.message}
                </p>
              )}
            </div>

            {/* Open day of week */}
            <div className="space-y-2">
              <Label>วันเปิดรับสมัคร</Label>
              <Select
                value={String(form.watch("openDayOfWeek"))}
                onValueChange={(v) =>
                  form.setValue("openDayOfWeek", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวัน" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dayLabels).map(([num, label]) => (
                    <SelectItem key={num} value={num}>
                      วัน{label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Open time */}
            <div className="space-y-2">
              <Label htmlFor="openTime">เวลาเปิดรับสมัคร</Label>
              <Input id="openTime" type="time" {...form.register("openTime")} />
              {form.formState.errors.openTime && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.openTime.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกการแก้ไข"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Occurrences list with cancellation */}
      {occurrences.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">อีเวนท์ล่าสุด</h2>
          <div className="space-y-3">
            {occurrences.map((occ) => (
              <Card key={occ.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{occ.title ?? occ.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(occ.eventDate).toLocaleString("th-TH")}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="min-h-[44px]"
                        disabled={cancellingId === occ.id}
                      >
                        {cancellingId === occ.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "ยกเลิก"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยกเลิกอีเวนท์นี้?</AlertDialogTitle>
                        <AlertDialogDescription>
                          อีเวนท์จะถูกยกเลิกและแจ้งในกลุ่ม LINE
                          ผู้ลงทะเบียนจะยังถูกเก็บไว้ในระบบ
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">ไม่ยกเลิก</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            variant="destructive"
                            onClick={() => handleCancel(occ.id)}
                          >
                            ยกเลิกอีเวนท์
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
