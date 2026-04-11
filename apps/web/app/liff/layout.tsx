import { LiffProvider } from "@/components/liff/liff-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { env } from "@/lib/env";

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const liffId = env.NEXT_PUBLIC_LIFF_ID;

  return (
    <div className="min-h-screen bg-background">
      <LiffProvider liffId={liffId}>
        {children}
      </LiffProvider>
      <Toaster />
    </div>
  );
}
