"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useLiff } from "@/components/liff/liff-provider";
import {
  eventCreateSchema,
  type EventCreateFormData,
  templateCreateSchema,
  type TemplateCreateFormData,
} from "@/lib/validations/event";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent } from "@repo/ui/components/card";
import { Switch } from "@repo/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Loader2 } from "lucide-react";

interface ClubDefaults {
  venueName: string | null;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
  defaultMaxPlayers: number;
}

const dayOfWeekOptions = [
  { value: 1, label: "วันจันทร์" },
  { value: 2, label: "วันอังคาร" },
  { value: 3, label: "วันพุธ" },
  { value: 4, label: "วันพฤหัสบดี" },
  { value: 5, label: "วันศุกร์" },
  { value: 6, label: "วันเสาร์" },
  { value: 0, label: "วันอาทิตย์" },
];

export default function LiffEventCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      }
    >
      <LiffEventCreateForm />
    </Suspense>
  );
}

function LiffEventCreateForm() {
  const { liff, isReady, isLoggedIn } = useLiff();
  const searchParams = useSearchParams();
  const clubId = searchParams.get("clubId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  // Recurring template form state (uncontrolled via useState for Select fields)
  const [eventDayOfWeek, setEventDayOfWeek] = useState<number>(1);
  const [eventTime, setEventTime] = useState("");
  const [openDayOfWeek, setOpenDayOfWeek] = useState<number>(1);
  const [openTime, setOpenTime] = useState("");

  const form = useForm<EventCreateFormData>({
    resolver: zodResolver(eventCreateSchema),
    defaultValues: {
      title: "",
      eventDate: "",
      venueName: "",
      venueMapsUrl: "",
      shuttlecockFee: 0,
      courtFee: 0,
      maxPlayers: 20,
    },
  });

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    if (!clubId) {
      setError("ไม่พบ Club ID กรุณาเปิดหน้านี้ผ่านคำสั่งในกลุ่ม LINE");
      setLoading(false);
      return;
    }

    fetch(`/api/proxy/events/club-defaults?clubId=${clubId}`)
      .then((res) => {
        if (res.status === 403) {
          setError("คุณไม่มีสิทธิ์สร้างอีเวนท์ กรุณาติดต่อผู้ดูแลสโมสร");
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          setError("โหลดข้อมูลไม่ได้");
          setLoading(false);
          return null;
        }
        return res.json() as Promise<ClubDefaults>;
      })
      .then((data) => {
        if (!data) return;
        form.reset({
          title: "",
          eventDate: "",
          venueName: data.venueName ?? "",
          venueMapsUrl: "",
          shuttlecockFee: data.defaultShuttlecockFee,
          courtFee: data.defaultCourtFee,
          maxPlayers: data.defaultMaxPlayers,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("โหลดข้อมูลไม่ได้");
        setLoading(false);
      });
  }, [isReady, isLoggedIn, clubId, form]);

  async function onSubmit(data: EventCreateFormData) {
    if (isRecurring) {
      // Validate recurring fields
      const templateData: TemplateCreateFormData = {
        title: data.title,
        venueName: data.venueName,
        venueMapsUrl: data.venueMapsUrl,
        shuttlecockFee: data.shuttlecockFee,
        courtFee: data.courtFee,
        maxPlayers: data.maxPlayers,
        eventDayOfWeek,
        eventTime,
        openDayOfWeek,
        openTime,
      };

      const parsed = templateCreateSchema.safeParse(templateData);
      if (!parsed.success) {
        toast.error("กรุณากรอกข้อมูล recurring ให้ครบถ้วน");
        return;
      }

      const res = await fetch("/api/proxy/event-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, ...parsed.data }),
      });

      if (res.status === 403) {
        toast.error("คุณไม่มีสิทธิ์จัดการ recurring กรุณาติดต่อผู้ดูแลสโมสร");
        return;
      }
      if (!res.ok) {
        toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      toast.success("สร้าง recurring สำเร็จ");
      setTimeout(() => {
        liff?.closeWindow();
      }, 1000);
      return;
    }

    // One-time event path (unchanged)
    const eventDateWithTz = data.eventDate + ":00+07:00";

    const parsed = new Date(eventDateWithTz);
    if (parsed <= new Date()) {
      form.setError("eventDate", { message: "กรุณาเลือกวันที่ในอนาคต" });
      return;
    }

    const body = {
      clubId,
      title: data.title || undefined,
      eventDate: eventDateWithTz,
      venueName: data.venueName,
      venueMapsUrl: data.venueMapsUrl || undefined,
      shuttlecockFee: data.shuttlecockFee,
      courtFee: data.courtFee,
      maxPlayers: data.maxPlayers,
    };

    const res = await fetch("/api/proxy/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 422) {
      toast.error("กลุ่ม LINE ยังไม่ได้เชื่อมกับสโมสร กรุณาเชื่อมก่อนสร้างอีเวนท์");
      return;
    }
    if (!res.ok) {
      toast.error("สร้างอีเวนท์ไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    toast.success("สร้างอีเวนท์สำเร็จ");
    setTimeout(() => {
      liff?.closeWindow();
    }, 1000);
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
      <h1 className="text-2xl font-bold mb-6">สร้างอีเวนท์</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Event title - optional (D-08) */}
            <div className="space-y-2">
              <Label htmlFor="title">ชื่ออีเวนท์ (ไม่บังคับ)</Label>
              <Input
                id="title"
                type="text"
                {...form.register("title")}
                placeholder="ระบบจะสร้างให้อัตโนมัติ"
                aria-describedby={form.formState.errors.title ? "title-error" : undefined}
              />
              {form.formState.errors.title && (
                <p id="title-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Recurring toggle (D-05) */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="recurring-toggle" className="text-sm font-medium">
                  สร้างซ้ำทุกสัปดาห์
                </Label>
                <p className="text-sm text-muted-foreground">
                  ระบบจะสร้างอีเวนท์ทุกสัปดาห์โดยอัตโนมัติ
                </p>
              </div>
              <Switch
                id="recurring-toggle"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {/* Date/time - shown only when NOT recurring (D-08) */}
            {!isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="eventDate">วันที่และเวลา</Label>
                <input
                  id="eventDate"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("eventDate")}
                  aria-describedby={form.formState.errors.eventDate ? "eventDate-error" : undefined}
                />
                {form.formState.errors.eventDate && (
                  <p id="eventDate-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.eventDate.message}
                  </p>
                )}
              </div>
            )}

            {/* Recurring schedule fields - shown only when recurring is ON */}
            {isRecurring && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="eventDayOfWeek">วันที่จัดอีเวนท์</Label>
                  <Select
                    value={String(eventDayOfWeek)}
                    onValueChange={(val) => setEventDayOfWeek(Number(val))}
                  >
                    <SelectTrigger id="eventDayOfWeek">
                      <SelectValue placeholder="เลือกวัน" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfWeekOptions.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventTime">เวลาเริ่ม</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openDayOfWeek">วันที่เปิดรับสมัคร</Label>
                  <Select
                    value={String(openDayOfWeek)}
                    onValueChange={(val) => setOpenDayOfWeek(Number(val))}
                  >
                    <SelectTrigger id="openDayOfWeek">
                      <SelectValue placeholder="เลือกวัน" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfWeekOptions.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openTime">เวลาเปิดรับสมัคร</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Venue name - required (D-08) */}
            <div className="space-y-2">
              <Label htmlFor="venueName">ชื่อสนาม</Label>
              <Input
                id="venueName"
                type="text"
                {...form.register("venueName")}
                aria-describedby={form.formState.errors.venueName ? "venueName-error" : undefined}
              />
              {form.formState.errors.venueName && (
                <p id="venueName-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.venueName.message}
                </p>
              )}
            </div>

            {/* Venue Maps URL - optional (D-08) */}
            <div className="space-y-2">
              <Label htmlFor="venueMapsUrl">ลิงก์ Google Maps (ไม่บังคับ)</Label>
              <Input
                id="venueMapsUrl"
                type="url"
                {...form.register("venueMapsUrl")}
                aria-describedby={form.formState.errors.venueMapsUrl ? "venueMapsUrl-error" : undefined}
              />
              {form.formState.errors.venueMapsUrl && (
                <p id="venueMapsUrl-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.venueMapsUrl.message}
                </p>
              )}
            </div>

            {/* Shuttlecock fee - pre-filled (D-06) */}
            <div className="space-y-2">
              <Label htmlFor="shuttlecockFee">ค่าลูก (บาท)</Label>
              <Input
                id="shuttlecockFee"
                type="number"
                min="0"
                step="1"
                {...form.register("shuttlecockFee", { valueAsNumber: true })}
                aria-describedby={form.formState.errors.shuttlecockFee ? "shuttlecockFee-error" : undefined}
              />
              {form.formState.errors.shuttlecockFee && (
                <p id="shuttlecockFee-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.shuttlecockFee.message}
                </p>
              )}
            </div>

            {/* Court fee - pre-filled (D-06) */}
            <div className="space-y-2">
              <Label htmlFor="courtFee">ค่าสนาม (บาท)</Label>
              <Input
                id="courtFee"
                type="number"
                min="0"
                step="1"
                {...form.register("courtFee", { valueAsNumber: true })}
                aria-describedby={form.formState.errors.courtFee ? "courtFee-error" : undefined}
              />
              {form.formState.errors.courtFee && (
                <p id="courtFee-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.courtFee.message}
                </p>
              )}
            </div>

            {/* Max players - pre-filled (D-06) */}
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">จำนวนผู้เล่นสูงสุด</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="1"
                step="1"
                {...form.register("maxPlayers", { valueAsNumber: true })}
                aria-describedby={form.formState.errors.maxPlayers ? "maxPlayers-error" : undefined}
              />
              {form.formState.errors.maxPlayers && (
                <p id="maxPlayers-error" className="text-sm text-destructive" role="alert">
                  {form.formState.errors.maxPlayers.message}
                </p>
              )}
            </div>

            {/* Submit button - primary CTA (UI-SPEC focal point) */}
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : isRecurring ? (
                "บันทึก"
              ) : (
                "สร้างอีเวนท์"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
