"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Briefcase, MessageSquare, Mic, TrendingUp,
  CalendarCheck, Settings, Menu, X, ShieldCheck, LogOut,
} from "lucide-react";
import { LogoWordmark } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: "bg-indigo-600" },
  { href: "/dashboard/resume", label: "Resume", icon: FileText, tone: "bg-emerald-600" },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase, tone: "bg-amber-500" },
  { href: "/dashboard/interview", label: "Interview", icon: MessageSquare, tone: "bg-violet-600" },
  { href: "/dashboard/speech-practice", label: "Speech", icon: Mic, tone: "bg-rose-600" },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp, tone: "bg-sky-600" },
  { href: "/dashboard/learning-plan", label: "Plan", icon: CalendarCheck, tone: "bg-teal-600" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, tone: "bg-slate-600" },
];
const ADMIN_LINK = { href: "/admin", label: "Admin", icon: ShieldCheck, tone: "bg-amber-600" };

function isActive(pathname: string, href: string) {
  // "/dashboard" must match exactly or it would light up on every page.
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Admin link only for admins; the backend still enforces access on every
  // /admin endpoint — hiding the link is convenience, not security.
  const links = user?.is_admin ? [...LINKS, ADMIN_LINK] : LINKS;

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    // Lock page scroll behind the drawer, focus inside it, close on Escape,
    // and hand focus back to the menu button when it closes.
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const trigger = menuButtonRef.current;
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  async function signOut() {
    await logout();
    window.location.assign("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0" aria-label="JobReady home">
            <LogoWordmark size={28} />
          </Link>

          {/* Desktop */}
          <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 xl:flex dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut size={16} /> Log out
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="nav-drawer"
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet drawer: overlays the page instead of pushing it down. */}
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="animate-fade-soft absolute inset-0 h-full w-full cursor-default bg-slate-900/50 backdrop-blur-sm"
          />
          <nav
            id="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="animate-slide-in-right absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-2xl dark:bg-slate-950"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <LogoWordmark size={26} />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            {user && (
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.full_name || "Your account"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            )}

            <ul className="animate-stagger flex-1 space-y-1 overflow-y-auto p-3">
              {links.map(({ href, label, icon: Icon, tone }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${tone}`}>
                        <Icon size={16} />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut size={18} /> Log out
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
