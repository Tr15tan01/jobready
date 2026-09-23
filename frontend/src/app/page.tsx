import Link from "next/link";
import {
  FileText, Target, MessageSquare, Mic, Video, TrendingUp, ArrowRight, Check,
  Megaphone, Zap, BookOpen, Presentation, Scale, Rocket, Stethoscope, Code2, Ruler,
  GraduationCap, LineChart, ShoppingBag,
} from "lucide-react";
import { LogoWordmark } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppPreview, PrivacyIllustration } from "@/components/landing/illustrations";

const FEATURES = [
  { icon: FileText, title: "Resume, done right", body: "Build one by answering a few questions, or upload yours. AI polishes wording — it never invents experience.", tone: "bg-emerald-600" },
  { icon: Target, title: "Transparent job matching", body: "See exactly why you match: required skills, experience and responsibilities, each scored and explained.", tone: "bg-amber-500" },
  { icon: MessageSquare, title: "Realistic interviews", body: "Questions one at a time, tailored to your role, with structured feedback after every answer.", tone: "bg-indigo-600" },
  { icon: Mic, title: "Speech coaching", body: "Pace, filler words and clarity — language-aware, and never penalising an accent.", tone: "bg-rose-600" },
  { icon: Video, title: "Private video coaching", body: "Eye contact and movement, analysed on your own device. Video is never uploaded.", tone: "bg-violet-600" },
  { icon: TrendingUp, title: "Progress you can see", body: "Scores across sessions, recurring weak spots, and a day-by-day plan to fix them.", tone: "bg-sky-600" },
];

const STYLES = [
  { icon: Megaphone, label: "Persuasive", tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
  { icon: Zap, label: "Impromptu", tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  { icon: BookOpen, label: "Storytelling", tone: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300" },
  { icon: Presentation, label: "Presentation", tone: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300" },
  { icon: Scale, label: "Debate", tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" },
  { icon: Rocket, label: "Elevator pitch", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
];

const FIELDS = [
  { icon: Code2, label: "Engineering" }, { icon: Stethoscope, label: "Healthcare" },
  { icon: Ruler, label: "Architecture" }, { icon: GraduationCap, label: "Education" },
  { icon: LineChart, label: "Analytics" }, { icon: ShoppingBag, label: "Marketing" },
];

// Mirrors backend config (app/core/config.py). The landing page is static,
// so it can't read the API at build time — keep these in sync. Signed-in
// users see the live, config-driven version in Settings.
const PLANS = [
  { name: "Free", price: "$0", tagline: "Everything you need to start", featured: false, cta: "Start free", items: [
    "6 interviews a month, up to 5 questions each",
    "12 speech sessions, 3 attempts each",
    "12 job matches · 2 resume analyses · 2 AI-built resumes",
    "Text, voice and video answers",
    "Score and written feedback on every answer",
    "Delivery summary: face in frame and pace",
  ] },
  { name: "Premium", price: "$19", tagline: "For an active job search", featured: true, cta: "Choose Premium", items: [
    "12 interviews a month, up to 8 questions each",
    "22 speech sessions, 5 attempts each",
    "25 job matches · 10 resume analyses · 8 AI-built resumes",
    "15 personalised learning plans a month",
    "Full delivery analysis: eye contact, movement, filler words",
    "Longer sessions with more retries",
  ] },
  { name: "Pro", price: "$49", tagline: "For intensive preparation", featured: false, cta: "Choose Pro", items: [
    "25 interviews a month, up to 10 questions each",
    "32 speech sessions, 8 attempts each",
    "60 job matches · 25 resume analyses · 20 AI-built resumes",
    "40 personalised learning plans a month",
    "Full delivery analysis on every answer",
    "Our longest sessions and most retries",
  ] },
];

const FAQ = [
  { q: "Is my interview video recorded?", a: "No. Video is analysed on your own device and never uploaded. We keep only a few summary numbers, such as how often your face was in frame." },
  { q: "Does it work outside tech?", a: "Yes. Matching and interview questions adapt to your field — nursing, teaching, architecture, marketing and more." },
  { q: "Will the AI make things up on my resume?", a: "It's built not to. It rewords only what you give it and never adds employers, numbers or skills you didn't mention." },
  { q: "Can it guarantee I'll get the job?", a: "No, and be wary of anything that claims to. JobReady is coaching — it helps you prepare and improve." },
  { q: "Can I delete my data?", a: "Any time, from Settings. Deleting your account removes everything in it permanently." },
];

export default function LandingPage() {
  return (
    <main className="bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="JobReady home"><LogoWordmark size={28} /></Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#features" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 md:block dark:text-slate-300 dark:hover:text-white">Features</a>
            <a href="#pricing" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 md:block dark:text-slate-300 dark:hover:text-white">Pricing</a>
            <ThemeToggle />
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Log in</Link>
            <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
              Your AI communication & career coach
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Prepare smarter.{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">Interview better.</span>{" "}
              Get hired.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Build a strong resume, see how you match real jobs, and practise interviews and
              everyday speaking with feedback after every answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 motion-reduce:transition-none">
                Start practising free <ArrowRight size={16} />
              </Link>
              <a href="#how" className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                See how it works
              </a>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Check size={16} className="text-emerald-500" /> Free plan · no card needed
            </p>
          </div>
          <AppPreview />
        </div>
      </section>

      {/* Fields */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-8 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="mb-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">Built for every profession, not just tech</p>
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-4 px-4">
          {FIELDS.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Icon size={18} className="text-indigo-500" /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Everything you need to get ready</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">From your first resume draft to the final interview.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, tone }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm ${tone}`}><Icon size={22} /></span>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-slate-50/60 py-20 dark:bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">How it works</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["Tell us your role", "Set your job title, add a resume, and optionally a job you're applying for."],
              ["Practise out loud", "Answer realistic questions by typing, speaking, or on camera."],
              ["Improve every round", "Get a score and specific fixes, retry, and track your progress."],
            ].map(([title, body], i) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Speech styles */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Beyond interviews</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Get a random prompt and speak. Six styles for everyday communication.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {STYLES.map(({ icon: Icon, label, tone }) => (
            <span key={label} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${tone}`}>
              <Icon size={17} /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-slate-900 py-20 text-white dark:bg-slate-900/60">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Private by design</h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              Your interview video never leaves your device, and your audio is discarded right
              after it&apos;s transcribed. We keep only what you need to see your progress.
            </p>
            <Link href="/help/video-privacy" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-indigo-300 hover:text-indigo-200">
              How video analysis works <ArrowRight size={16} />
            </Link>
          </div>
          <PrivacyIllustration />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Simple pricing</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 dark:bg-slate-900 ${p.featured ? "border-indigo-600 shadow-xl shadow-indigo-600/10" : "border-slate-200 dark:border-slate-800"}`}>
              {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h3 className="font-semibold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{p.tagline}</p>
              <p className="mt-4 text-4xl font-bold text-slate-900 dark:text-white">{p.price}<span className="text-base font-normal text-slate-500">/mo</span></p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><Check size={17} className="shrink-0 text-emerald-500" /> {i}</li>
                ))}
              </ul>
              <Link href="/register" className={`mt-6 rounded-xl py-3 text-center text-sm font-semibold ${p.featured ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Questions</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900 dark:text-white">
                {q}
                <span className="ml-4 text-slate-400 transition group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your next interview starts here.</h2>
          <p className="mx-auto mt-3 max-w-lg text-indigo-100">Set up in a minute. Your first practice session is free.</p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg hover:bg-indigo-50">
            Create your free account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <LogoWordmark size={24} />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-white">About</Link>
            <Link href="/help/video-privacy" className="hover:text-slate-900 dark:hover:text-white">Video privacy</Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
            <Link href="/cookies" className="hover:text-slate-900 dark:hover:text-white">Cookies</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
