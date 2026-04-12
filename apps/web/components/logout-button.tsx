"use client";

import { useLiff } from "@/components/liff/liff-provider";

export function LogoutButton() {
  const { liff } = useLiff();

  const handleLogout = () => {
    if (liff?.isLoggedIn()) {
      liff.logout();
    }
    window.location.href = "/api/auth/logout";
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Logout
    </button>
  );
}
