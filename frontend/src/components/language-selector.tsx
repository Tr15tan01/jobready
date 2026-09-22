"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, Locale, locales } from "@/lib/i18n/config";

const LABELS: Record<Locale, string> = { en: "English", ka: "ქართული", es: "Español" };

export function LanguageSelector({ current }: { current: Locale }) {
  const router = useRouter();

  function handleChange(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <select
      aria-label="Language"
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
