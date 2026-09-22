import { cookies } from "next/headers";
import Link from "next/link";
import { LOCALE_COOKIE, defaultLocale, getDictionary, isLocale } from "@/lib/i18n/config";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  { key: "resumeOptimization", desc: "AI-assisted rewrites that never invent experience — every suggestion traces back to your real background." },
  { key: "jobMatching", desc: "A transparent, weighted match score against real job descriptions — not a single opaque similarity number." },
  { key: "interviewPractice", desc: "One question at a time, generated from the role and your resume, across behavioral, technical, and system-design modes." },
  { key: "videoCoaching", desc: "Local, on-device analysis of eye contact, posture and movement. Your video is never uploaded or stored." },
  { key: "speechCoaching", desc: "Pace, filler words, grammar and clarity feedback — language-aware, and never penalizing an accent." },
  { key: "progressTracking", desc: "See readiness climb across attempts, with recurring weaknesses turned into a concrete practice plan." },
] as const;

export default async function LandingPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const t = getDictionary(locale);

  return (
    <main className="dark:bg-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight dark:text-slate-50">JobReady</span>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSelector current={locale} />
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t.nav.login}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {t.nav.signup}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Your AI Communication &amp; Career Coach
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          {t.landing.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          {t.landing.heroSubtitle} Beyond interviews, practice everyday communication — persuasive
          speeches, impromptu talks, presentations, and more.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 motion-reduce:transition-none dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {t.landing.ctaPrimary}
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 motion-reduce:transition-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {t.landing.ctaSecondary}
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900 dark:text-slate-50">{t.landing.howItWorks}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { step: "1", title: "Upload your resume", desc: "PDF, DOCX or TXT — parsed into structured, editable data." },
            { step: "2", title: "Match to a job", desc: "Paste a description and get a transparent, explained match score." },
            { step: "3", title: "Practice live", desc: "Answer AI-generated questions by text or voice and get structured feedback." },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-100 p-6 transition hover:shadow-sm motion-reduce:transition-none dark:border-slate-800 dark:hover:shadow-slate-900">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                {s.step}
              </div>
              <h3 className="mb-1 font-medium text-slate-900 dark:text-slate-50">{s.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.key} className="rounded-xl border border-slate-100 p-6 dark:border-slate-800">
              <h3 className="mb-2 font-medium text-slate-900 dark:text-slate-50">
                {t.landing[f.key as keyof typeof t.landing]}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
          <div className="rounded-xl border border-slate-100 p-6 dark:border-slate-800">
            <h3 className="mb-2 font-medium text-slate-900 dark:text-slate-50">Speech Practice</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Six general communication modes — Persuasive, Impromptu, Storytelling, Presentation,
              Debate, and Elevator Pitch. Take a random prompt, speak, and get scored feedback.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900 dark:text-slate-50">{t.landing.pricing}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { name: "Free", price: "$0", items: ["3 resume analyses/mo", "3 job matches/mo", "2 interview sessions/mo", "3 speech practice sessions/mo"] },
            { name: "Premium", price: "$19/mo", items: ["30 of each per month", "Voice analysis", "Personalized learning plans"] },
            { name: "Pro", price: "$49/mo", items: ["500 of each per month", "Video coaching", "Advanced analytics"] },
          ].map((p) => (
            <div key={p.name} className="rounded-xl border border-slate-100 p-6 dark:border-slate-800">
              <h3 className="font-medium text-slate-900 dark:text-slate-50">{p.name}</h3>
              <p className="my-2 text-2xl font-semibold dark:text-slate-50">{p.price}</p>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {p.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">{t.landing.privacy}</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Interview video is never permanently stored. Camera processing happens locally in your
          browser whenever possible — only derived metrics, transcripts and scores are saved.
        </p>
        <Link href="/privacy" className="mt-3 inline-block text-sm font-medium text-slate-900 underline dark:text-slate-100">
          Read the full privacy policy
        </Link>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="mb-6 text-3xl font-semibold text-slate-900 dark:text-slate-50">{t.landing.finalCtaTitle}</h2>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {t.landing.ctaPrimary}
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
        </div>
      </footer>
    </main>
  );
}
