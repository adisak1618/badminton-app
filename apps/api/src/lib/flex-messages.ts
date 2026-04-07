import { messagingApi } from "@line/bot-sdk";

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
