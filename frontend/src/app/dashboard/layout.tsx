import Link from "next/link";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, getDictionary, isLocale } from "@/lib/i18n/config";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const t = getDictionary(locale).nav;

  const links = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/dashboard/resume", label: t.resume },
    { href: "/dashboard/jobs", label: t.jobs },
    { href: "/dashboard/interview", label: t.interview },
    { href: "/dashboard/speech-practice", label: "Speech Practice" },
    { href: "/dashboard/progress", label: t.progress },
    { href: "/dashboard/learning-plan", label: t.learningPlan },
    { href: "/dashboard/settings", label: t.settings },
  ];

  return (
    <div className="min-h-screen dark:bg-slate-950">
      <header className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight dark:text-slate-50">
            JobReady
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-slate-900 dark:hover:text-white">
                {l.label}
              </Link>
            ))}
            <LanguageSelector current={locale} />
            <ThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
