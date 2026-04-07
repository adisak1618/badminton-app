import { LiffProvider } from "@/components/liff/liff-provider";
import { Toaster } from "@repo/ui/components/sonner";

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

  return (
    <div className="min-h-screen bg-background">
      <LiffProvider liffId={liffId}>
        {children}
      </LiffProvider>
      <Toaster />
    </div>
  );
}
