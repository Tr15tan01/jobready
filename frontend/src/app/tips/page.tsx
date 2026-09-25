import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Clock, FlaskConical, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GUIDE_ICON } from "@/components/tips-icons";
import { GUIDES, HUB_RESEARCH, UNIVERSAL_PRINCIPLES } from "@/lib/tips-content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "How to Speak Better: Free Public Speaking Guides and Tips";
const DESCRIPTION =
  "Research-backed guides for every kind of speaking — persuasive speeches, impromptu answers, storytelling, presentations, debate, elevator pitches and job interviews.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  keywords: ["public speaking tips", "how to speak better", "speaking skills", "communication skills", "presentation tips", "interview tips"],
  alternates: { canonical: `${SITE_URL}/tips` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/tips`, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function TipsHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/tips`,
    hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: `${SITE_URL}/tips/${g.slug}` })),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-orange-50 to-white px-4 py-14 sm:px-6 sm:py-20 dark:border-slate-800 dark:from-orange-950/20 dark:to-slate-950">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-200">
              <BookMarked size={13} aria-hidden="true" /> Free speaking guides
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">How to speak better, in any situation</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Practical structures, common mistakes, practice drills and what the research actually says — for
              every kind of speech you&apos;ll give.
            </p>
          </div>
        </section>

        <section aria-labelledby="guides-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="guides-heading" className="text-2xl font-bold text-slate-900 dark:text-white">Guides by type of speaking</h2>
          <ul className="animate-stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => {
              const Icon = GUIDE_ICON[g.slug];
              return (
                <li key={g.slug}>
                  <Link
                    href={`/tips/${g.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${g.accent.tile}`}>
                      {Icon && <Icon size={21} aria-hidden="true" />}
                    </span>
                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{g.label}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{g.description}</p>
                    <p className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" /> {g.readingMinutes} min read</span>
                      <span className={`flex items-center gap-1 font-semibold ${g.accent.text}`}>Read guide <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="principles-heading" className="bg-slate-50 px-4 py-14 sm:px-6 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl">
            <h2 id="principles-heading" className="text-2xl font-bold text-slate-900 dark:text-white">Eight principles that work for every speech</h2>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">Whatever you&apos;re saying, these habits make you clearer, calmer and more memorable.</p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {UNIVERSAL_PRINCIPLES.map((p, i) => (
                <li key={p.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{p.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="research-heading" className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h2 id="research-heading" className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <FlaskConical size={22} className="text-violet-600" aria-hidden="true" /> What the research says
          </h2>
          <ul className="mt-6 space-y-4">
            {HUB_RESEARCH.map((r) => (
              <li key={r.source} className="rounded-2xl border-l-4 border-violet-500 bg-violet-50/60 p-5 dark:bg-violet-950/20">
                <p className="text-slate-800 dark:text-slate-200">{r.finding}</p>
                <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">{r.source}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-center text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">Reading helps. Practising changes things.</h2>
            <p className="mx-auto mt-3 max-w-lg text-indigo-100">
              Get a random topic, speak, and receive a score with specific feedback on structure, pace and filler words — free.
            </p>
            <Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg hover:bg-indigo-50">
              <Sparkles size={16} aria-hidden="true" /> Start practising free
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
