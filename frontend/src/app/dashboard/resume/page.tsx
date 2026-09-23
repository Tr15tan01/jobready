import { getDictionary } from "@/lib/i18n/config";
import { ResumeManager } from "@/components/resume-manager";

export default function ResumePage() {
  const locale = "en" as const;
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">{t.resume.title}</h1>
      <ResumeManager locale={locale} />
    </main>
  );
}
