"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Menu, X } from "lucide-react";
import { LogoWordmark } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/tips", label: "Speaking guides", highlight: true },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

/**
 * Header for public pages (home, guides, about). Shows "Dashboard" to a
 * signed-in visitor and Log in / Get started to everyone else.
 */
export function SiteHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const signedIn = !loading && !!user;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="JobReady home" className="shrink-0"><LogoWordmark size={28} /></Link>
        <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/tips" ? pathname.startsWith("/tips") : pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  n.highlight
                    ? "text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/40"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                } ${active ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              >
                {n.highlight && <BookMarked size={15} aria-hidden="true" />}
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:block dark:text-slate-200 dark:hover:bg-slate-800">Log in</Link>
              <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Get started</Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-menu" aria-label="Site" className="animate-fade-soft border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  {n.highlight && <BookMarked size={16} className="text-orange-600" aria-hidden="true" />}
                  {n.label}
                </Link>
              </li>
            ))}
            {!signedIn && (
              <li>
                <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Log in</Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
