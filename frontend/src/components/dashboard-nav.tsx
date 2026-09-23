"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Briefcase, MessageSquare, Mic, TrendingUp,
  CalendarCheck, Settings, Menu, X, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LogoWordmark } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/resume", label: "Resume", icon: FileText },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/interview", label: "Interview", icon: MessageSquare },
  { href: "/dashboard/speech-practice", label: "Speech", icon: Mic },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { href: "/dashboard/learning-plan", label: "Plan", icon: CalendarCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const ADMIN_LINK = { href: "/admin", label: "Admin", icon: ShieldCheck };

function isActive(pathname: string, href: string) {
  // "/dashboard" must match exactly, or it would light up on every page.
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  // Admin link only for admins. The backend still enforces this on every
  // /admin endpoint — hiding the link is convenience, not security.
  const links = user?.is_admin ? [...LINKS, ADMIN_LINK] : LINKS;

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Stop the page scrolling behind the open menu on mobile.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0" aria-label="JobReady home">
          <LogoWordmark size={28} />
        </Link>

        {/* Desktop */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition motion-reduce:transition-none ${
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
          <div className="hidden lg:block"><LogoutButton /></div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="animate-fade-in border-t border-slate-200 bg-white px-4 pb-6 pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <ul className="grid grid-cols-2 gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <LogoutButton />
          </div>
        </nav>
      )}
    </header>
  );
}
