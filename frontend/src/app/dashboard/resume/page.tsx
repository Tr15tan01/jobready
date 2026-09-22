import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, getDictionary, isLocale } from "@/lib/i18n/config";
import { ResumeManager } from "@/components/resume-manager";

export default async function ResumePage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">{t.resume.title}</h1>
      <ResumeManager locale={locale} />
    </main>
  );
}
