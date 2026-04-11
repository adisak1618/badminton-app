import { messagingApi } from "@line/bot-sdk";

interface RepostCardData {
  title: string;
  eventDate: Date;
  venueName: string;
  venueMapsUrl: string | null;
  shuttlecockFee: number;
  courtFee: number;
  maxPlayers: number;
  registeredCount: number;
  registerLiffUrl: string;
  detailsLiffUrl: string;
  notificationAltText: string;
  isFull: boolean;
  isClosed: boolean;
}

interface EventCardData {
  title: string;
  eventDate: Date;
  venueName: string;
  venueMapsUrl: string | null;
  shuttlecockFee: number;
  courtFee: number;
  maxPlayers: number;
  registeredCount: number;
  registerLiffUrl: string;
  detailsLiffUrl: string;
}

function formatThaiDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatThaiShortDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function generateEventTitle(eventDate: Date, venueName: string): string {
  return `แบด ${formatThaiShortDate(eventDate)} - ${venueName}`;
}

export function buildEventFlexCard(data: EventCardData): messagingApi.FlexMessage {
  const formattedDate = formatThaiDate(data.eventDate);
  const feeText = `ลูกขน ${data.shuttlecockFee}฿ / สนาม ${data.courtFee}฿`;
  const spotsText = `${data.registeredCount}/${data.maxPlayers} คน`;

  const venueContent: messagingApi.FlexText = {
    type: "text",
    text: data.venueName,
    size: "sm",
    color: "#666666",
    ...(data.venueMapsUrl
      ? {
          action: {
            type: "uri",
            label: data.venueName,
            uri: data.venueMapsUrl,
          } as messagingApi.URIAction,
          color: "#00B300",
        }
      : {}),
  };

  return {
    type: "flex",
    altText: `${data.title} — ${data.venueName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: data.title, weight: "bold", size: "lg" },
          { type: "text", text: formattedDate, size: "sm", color: "#666666" },
          venueContent,
          { type: "text", text: feeText, size: "sm", color: "#666666" },
          { type: "text", text: spotsText, size: "sm", color: "#22c55e" },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#00B300",
            action: {
              type: "uri",
              label: "ลงทะเบียน",
              uri: data.registerLiffUrl,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "รายละเอียด",
              uri: data.detailsLiffUrl,
            },
          },
        ],
      },
    },
  };
}

export function buildRepostAltText(opts: {
  action: "register" | "cancel" | "admin_remove" | "close" | "reopen";
  memberName?: string;
  registeredCount: number;
  maxPlayers: number;
}): string {
  const { action, memberName, registeredCount, maxPlayers } = opts;
  switch (action) {
    case "register":
      return `${memberName} ลงทะเบียนแล้ว (${registeredCount}/${maxPlayers} คน)`;
    case "cancel":
      return `${memberName} ยกเลิกแล้ว (${registeredCount}/${maxPlayers} คน)`;
    case "admin_remove":
      return `(${registeredCount}/${maxPlayers} คน)`;
    case "close":
      return `ปิดรับลงทะเบียนแล้ว (${registeredCount}/${maxPlayers} คน)`;
    case "reopen":
      return `เปิดรับลงทะเบียน (${registeredCount}/${maxPlayers} คน)`;
  }
}

interface CancellationCardData {
  title: string;
  eventDate: Date;
  venueName: string;
}

export function buildCancellationFlexCard(data: CancellationCardData): messagingApi.FlexMessage {
  return {
    type: "flex",
    altText: `ยกเลิกอีเวนท์: ${data.title}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "ยกเลิกอีเวนท์", weight: "bold", color: "#ef4444", size: "lg" },
          { type: "text", text: data.title, weight: "bold", size: "md", margin: "md" },
          { type: "text", text: formatThaiDate(data.eventDate), size: "sm", color: "#666666", margin: "sm" },
          { type: "text", text: data.venueName, size: "sm", color: "#666666", margin: "sm" },
          { type: "text", text: "อีเวนท์นี้ถูกยกเลิกแล้ว", size: "sm", color: "#ef4444", margin: "lg" },
        ],
      },
    },
  };
}

export function buildRepostFlexCard(data: RepostCardData): messagingApi.FlexMessage {
  const formattedDate = formatThaiDate(data.eventDate);
  const feeText = `ลูกขน ${data.shuttlecockFee}฿ / สนาม ${data.courtFee}฿`;

  let spotsText: string;
  let spotsColor: string;
  if (data.isClosed) {
    spotsText = `ปิดรับลงทะเบียนแล้ว (${data.registeredCount}/${data.maxPlayers} คน)`;
    spotsColor = "#ef4444";
  } else if (data.isFull) {
    spotsText = `${data.registeredCount}/${data.maxPlayers} เต็ม`;
    spotsColor = "#ef4444";
  } else {
    spotsText = `${data.registeredCount}/${data.maxPlayers} คน`;
    spotsColor = "#22c55e";
  }

  const registerButtonStyle = data.isFull || data.isClosed ? "secondary" : "primary";
  const registerButtonColor = data.isFull || data.isClosed ? undefined : "#00B300";

  const venueContent: messagingApi.FlexText = {
    type: "text",
    text: data.venueName,
    size: "sm",
    color: "#666666",
    ...(data.venueMapsUrl
      ? {
          action: {
            type: "uri",
            label: data.venueName,
            uri: data.venueMapsUrl,
          } as messagingApi.URIAction,
          color: "#00B300",
        }
      : {}),
  };

  return {
    type: "flex",
    altText: data.notificationAltText,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: data.title, weight: "bold", size: "lg" },
          { type: "text", text: formattedDate, size: "sm", color: "#666666" },
          venueContent,
          { type: "text", text: feeText, size: "sm", color: "#666666" },
          { type: "text", text: spotsText, size: "sm", color: spotsColor },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "button",
            style: registerButtonStyle,
            ...(registerButtonColor ? { color: registerButtonColor } : {}),
            action: {
              type: "uri",
              label: "ลงทะเบียน",
              uri: data.registerLiffUrl,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "รายละเอียด",
              uri: data.detailsLiffUrl,
            },
          },
        ],
      },
    },
  };
}
