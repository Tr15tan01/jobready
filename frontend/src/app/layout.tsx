import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/lib/i18n/config";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "JobReady",
  description: "Your AI Communication & Career Coach — prepare smarter, interview better, get hired.",
  icons: { icon: "/icon.svg" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
