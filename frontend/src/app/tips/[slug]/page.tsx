import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Clock, Dumbbell, FlaskConical, Layers, Mic, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GUIDE_ICON } from "@/components/tips-icons";
import { GUIDES, GUIDES_UPDATED, getGuide } from "@/lib/tips-content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  const url = `${SITE_URL}/tips/${g.slug}`;
  return {
    title: `${g.title} | ${SITE_NAME}`,
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.description, url, siteName: SITE_NAME, type: "article", modifiedTime: GUIDES_UPDATED },
    twitter: { card: "summary", title: g.title, description: g.description },
  };
}

const updatedLabel = new Date(`${GUIDES_UPDATED}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const Icon = GUIDE_ICON[g.slug] ?? Mic;
  const url = `${SITE_URL}/tips/${g.slug}`;
  const practiceHref = g.mode ? "/dashboard/speech-practice" : "/dashboard/interview";
  const related = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 6);
  const toc = [
    { id: "takeaways", label: "Key takeaways" },
    { id: "structures", label: "Structures that work" },
    ...g.sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: "mistakes", label: "Common mistakes" },
    { id: "drills", label: "Practice drills" },
    { id: "research", label: "What the research says" },
    { id: "faq", label: "FAQ" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.description,
      dateModified: GUIDES_UPDATED,
      mainEntityOfPage: url,
      keywords: g.keywords.join(", "),
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Speaking guides", item: `${SITE_URL}/tips` },
        { "@type": "ListItem", position: 3, name: g.label, item: url },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        <header className={`border-b border-slate-100 px-4 py-10 sm:px-6 sm:py-14 dark:border-slate-800 ${g.accent.soft}`}>
          <div className="mx-auto max-w-6xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <li><Link href="/" className="hover:underline">Home</Link></li>
                <li aria-hidden="true"><ChevronRight size={12} /></li>
                <li><Link href="/tips" className="hover:underline">Speaking guides</Link></li>
                <li aria-hidden="true"><ChevronRight size={12} /></li>
                <li aria-current="page" className="font-medium text-slate-700 dark:text-slate-200">{g.label}</li>
              </ol>
            </nav>
            <div className="mt-5 flex items-start gap-4">
              <span className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm sm:flex ${g.accent.tile}`}>
                <Icon size={28} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{g.title}</h1>
                <p className="mt-3 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{g.description}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" /> {g.readingMinutes} min read</span>
                  <span>Updated <time dateTime={GUIDES_UPDATED}>{updatedLabel}</time></span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_260px]">
          <article className="min-w-0 space-y-12">
            <div className="space-y-4 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              {g.intro.map((p) => <p key={p}>{p}</p>)}
            </div>

            <section id="takeaways" aria-labelledby="takeaways-h" className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
              <h2 id="takeaways-h" className="text-lg font-bold text-slate-900 dark:text-white">Key takeaways</h2>
              <ul className="mt-3 space-y-2">
                {g.takeaways.map((t) => (
                  <li key={t} className="flex gap-2.5 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>
            </section>

            <section id="structures" aria-labelledby="structures-h" className="scroll-mt-24">
              <h2 id="structures-h" className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Layers size={22} className={g.accent.text} aria-hidden="true" /> Structures that work
              </h2>
              <div className="mt-5 space-y-6">
                {g.frameworks.map((f) => (
                  <div key={f.name} className="rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">{f.summary}</p>
                    <ol className="mt-4 space-y-3">
                      {f.steps.map((s, i) => (
                        <li key={s.label} className="flex gap-3">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${g.accent.tile}`}>{i + 1}</span>
                          <p className="text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{s.label}</strong> — {s.text}</p>
                        </li>
                      ))}
                    </ol>
                    {f.example && (
                      <blockquote className="mt-4 rounded-xl bg-slate-50 p-4 text-sm italic leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        <span className="mb-1 block text-xs font-semibold not-italic uppercase tracking-wide text-slate-500">Example</span>
                        {f.example}
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {g.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
                <h2 id={`${s.id}-h`} className="text-2xl font-bold text-slate-900 dark:text-white">{s.heading}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-slate-700 dark:text-slate-300">
                  {s.body.map((p) => <p key={p}>{p}</p>)}
                </div>
                {s.bullets && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-6 text-slate-700 marker:text-slate-400 dark:text-slate-300">
                    {s.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                )}
              </section>
            ))}

            <section id="mistakes" aria-labelledby="mistakes-h" className="scroll-mt-24">
              <h2 id="mistakes-h" className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <AlertTriangle size={22} className="text-amber-500" aria-hidden="true" /> Common mistakes and how to fix them
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
                    <tr><th scope="col" className="px-4 py-3 font-semibold">Mistake</th><th scope="col" className="px-4 py-3 font-semibold">Fix</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {g.mistakes.map((m) => (
                      <tr key={m.mistake} className="align-top">
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{m.mistake}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{m.fix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="drills" aria-labelledby="drills-h" className="scroll-mt-24">
              <h2 id="drills-h" className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Dumbbell size={22} className={g.accent.text} aria-hidden="true" /> Practice drills
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {g.drills.map((d) => (
                  <div key={d.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{d.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{d.how}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
              <h2 className="text-xl font-bold sm:text-2xl">Practise {g.label.toLowerCase()} with instant feedback</h2>
              <p className="mt-2 max-w-xl text-indigo-100">
                {g.mode
                  ? "Get a random topic, speak for a minute, and get a score plus specific notes on structure, pace and filler words."
                  : "Answer realistic questions for your role, one at a time, and get a score and a stronger version of every answer."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={practiceHref} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50">
                  <Mic size={16} aria-hidden="true" /> Practise now
                </Link>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  <Sparkles size={16} aria-hidden="true" /> New here? Create a free account
                </Link>
              </div>
            </section>

            <section id="research" aria-labelledby="research-h" className="scroll-mt-24">
              <h2 id="research-h" className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <FlaskConical size={22} className="text-violet-600" aria-hidden="true" /> What the research says
              </h2>
              <ul className="mt-4 space-y-3">
                {g.research.map((r) => (
                  <li key={r.source} className="rounded-2xl border-l-4 border-violet-500 bg-violet-50/60 p-4 dark:bg-violet-950/20">
                    <p className="text-slate-800 dark:text-slate-200">{r.finding}</p>
                    <p className="mt-1.5 text-xs italic text-slate-500 dark:text-slate-400">{r.source}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="faq" aria-labelledby="faq-h" className="scroll-mt-24">
              <h2 id="faq-h" className="text-2xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {g.faq.map((f) => (
                  <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-slate-900 dark:text-white">
                      <h3 className="text-base">{f.q}</h3>
                      <ChevronRight size={18} className="shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">On this page</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {toc.map((t) => (
                  <li key={t.id}><a href={`#${t.id}`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{t.label}</a></li>
                ))}
              </ul>
              <Link href={practiceHref} className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white ${g.accent.tile}`}>
                Practise this <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </nav>
          </aside>
        </div>

        <section aria-labelledby="related-h" className="border-t border-slate-100 bg-slate-50 px-4 py-12 sm:px-6 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl">
            <h2 id="related-h" className="text-xl font-bold text-slate-900 dark:text-white">More speaking guides</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => {
                const RIcon = GUIDE_ICON[r.slug] ?? Mic;
                return (
                  <li key={r.slug}>
                    <Link href={`/tips/${r.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${r.accent.tile}`}><RIcon size={17} aria-hidden="true" /></span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{r.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
