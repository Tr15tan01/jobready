"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
    >
      Log out
    </button>
  );
}
