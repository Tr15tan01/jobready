"use client";

import { Mail, Phone, MapPin, Printer, X } from "lucide-react";

type Content = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  skills?: { name: string }[];
  work_experience?: {
    company?: string | null; title?: string | null; location?: string | null;
    start_date?: string | null; end_date?: string | null; is_current?: boolean;
    description?: string | null; technologies?: string[];
  }[];
  education?: {
    institution?: string | null; degree?: string | null; field_of_study?: string | null;
    start_date?: string | null; end_date?: string | null;
  }[];
  languages?: string[];
  certifications?: string[];
  projects?: string[];
  achievements?: string[];
};

function dateRange(start?: string | null, end?: string | null, current?: boolean) {
  const e = current ? "Present" : end;
  if (start && e) return `${start} – ${e}`;
  return start || e || "";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b-2 border-indigo-600 pb-1 text-xs font-bold uppercase tracking-widest text-indigo-700 print:border-slate-800 print:text-slate-900 dark:text-indigo-300">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300 print:text-slate-800">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
  );
}

/**
 * Renders a structured resume as a readable document. Only sections that
 * actually have content are shown — never placeholder headings with
 * nothing under them.
 */
export function ResumeView({ content, onClose }: { content: Content; onClose: () => void }) {
  const c = content ?? {};
  const contacts = [
    c.email && { icon: Mail, text: c.email },
    c.phone && { icon: Phone, text: c.phone },
    c.location && { icon: MapPin, text: c.location },
  ].filter(Boolean) as { icon: typeof Mail; text: string }[];

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300">
          <X size={16} /> Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* The printable document */}
      <article id="resume-print" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50 print:text-black">
            {c.full_name || "Your name"}
          </h1>
          {c.headline && <p className="mt-0.5 text-base font-medium text-indigo-700 dark:text-indigo-300 print:text-slate-700">{c.headline}</p>}
          {contacts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-700">
              {contacts.map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5"><Icon size={14} /> {text}</span>
              ))}
            </div>
          )}
        </header>

        {c.summary && (
          <Section title="Summary">
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-800">{c.summary}</p>
          </Section>
        )}

        {!!c.work_experience?.length && (
          <Section title="Experience">
            <div className="space-y-4">
              {c.work_experience.map((w, i) => (
                <div key={i} className="break-inside-avoid">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 print:text-black">
                      {w.title}{w.company && <span className="font-normal text-slate-600 dark:text-slate-400"> · {w.company}</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{dateRange(w.start_date, w.end_date, w.is_current)}</p>
                  </div>
                  {w.location && <p className="text-xs text-slate-500">{w.location}</p>}
                  {w.description && (
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-800">{w.description}</p>
                  )}
                  {!!w.technologies?.length && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{w.technologies.join(" · ")}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {!!c.education?.length && (
          <Section title="Education">
            <div className="space-y-2">
              {c.education.map((e, i) => (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">{[e.degree, e.field_of_study].filter(Boolean).join(", ") || e.institution}</span>
                    {(e.degree || e.field_of_study) && e.institution && <span className="text-slate-600 dark:text-slate-400"> · {e.institution}</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{dateRange(e.start_date, e.end_date)}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {!!c.skills?.length && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {c.skills.map((s) => (
                <span key={s.name} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 print:border print:border-slate-400 print:bg-transparent print:text-slate-800">
                  {s.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {!!c.certifications?.length && <Section title="Certifications"><List items={c.certifications} /></Section>}
        {!!c.projects?.length && <Section title="Projects"><List items={c.projects} /></Section>}
        {!!c.achievements?.length && <Section title="Achievements"><List items={c.achievements} /></Section>}
        {!!c.languages?.length && (
          <Section title="Languages">
            <p className="text-sm text-slate-700 dark:text-slate-300">{c.languages.join(" · ")}</p>
          </Section>
        )}
      </article>
    </div>
  );
}
