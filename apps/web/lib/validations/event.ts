import { z } from "zod";

export const eventCreateSchema = z.object({
  title: z.string().max(255).optional(),
  eventDate: z.string().min(1, "กรุณากรอกวันที่และเวลา"),
  venueName: z.string().min(1, "กรุณากรอกชื่อสนาม").max(500),
  venueMapsUrl: z
    .string()
    .url("กรุณากรอก URL ที่ถูกต้อง")
    .max(500)
    .or(z.literal(""))
    .optional(),
  shuttlecockFee: z.number().int().min(0),
  courtFee: z.number().int().min(0),
  maxPlayers: z.number().int().min(1, "กรุณากรอกตัวเลขที่มากกว่า 0"),
});

export type EventCreateFormData = z.infer<typeof eventCreateSchema>;

export const templateCreateSchema = z.object({
  venueName: z.string().min(1, "กรุณากรอกชื่อสนาม").max(255),
  venueMapsUrl: z.string().url("กรุณากรอก URL ที่ถูกต้อง").max(500).or(z.literal("")).optional(),
  shuttlecockFee: z.number().int().min(0),
  courtFee: z.number().int().min(0),
  maxPlayers: z.number().int().min(1, "กรุณากรอกตัวเลขที่มากกว่า 0"),
  title: z.string().max(255).optional(),
  eventDayOfWeek: z.number().int().min(0).max(6),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณากรอกเวลาในรูปแบบ HH:MM"),
  openDayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณากรอกเวลาในรูปแบบ HH:MM"),
});

export type TemplateCreateFormData = z.infer<typeof templateCreateSchema>;
