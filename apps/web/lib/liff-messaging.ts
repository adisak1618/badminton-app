import type { Liff } from "@line/liff";

export function getLiffContextHeader(liff: Liff | null): Record<string, string> {
  const context = liff?.getContext();
  const isInChat = ["group", "room", "utou"].includes(context?.type ?? "");
  return isInChat ? { "X-Liff-Context": "in-line" } : { "X-Liff-Context": "external" };
}

export async function trySendMessages(liff: Liff | null, flexCard: unknown): Promise<void> {
  if (!liff || !flexCard) return;
  const context = liff.getContext();
  const isInChat = ["group", "room", "utou"].includes(context?.type ?? "");
  if (!isInChat) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await liff.sendMessages([flexCard as any]);
  } catch (err) {
    console.error("sendMessages failed:", err);
  }
}
