import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Toaster } from "@repo/ui/components/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Badminton Club Platform",
  description: "Manage your badminton club, events, and registrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-background antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
