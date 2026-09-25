import Link from "next/link";
import { LogoWordmark } from "@/components/ui/logo";
import { GUIDES } from "@/lib/tips-content";

/** Footer for public pages, with links to every speaking guide (good for SEO too). */
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
        <div>
          <LogoWordmark size={24} />
          <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Your AI communication &amp; career coach. Practise interviews and speeches, privately.
          </p>
        </div>
        <nav aria-label="Speaking guides">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Speaking guides</p>
          <ul className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <li><Link href="/tips" className="hover:text-slate-900 dark:hover:text-white">All guides</Link></li>
            {GUIDES.map((g) => (
              <li key={g.slug}><Link href={`/tips/${g.slug}`} className="hover:text-slate-900 dark:hover:text-white">{g.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">JobReady</p>
          <ul className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <li><Link href="/about" className="hover:text-slate-900 dark:hover:text-white">About</Link></li>
            <li><Link href="/#pricing" className="hover:text-slate-900 dark:hover:text-white">Pricing</Link></li>
            <li><Link href="/help/video-privacy" className="hover:text-slate-900 dark:hover:text-white">Video privacy</Link></li>
            <li><Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link></li>
            <li><Link href="/cookies" className="hover:text-slate-900 dark:hover:text-white">Cookies</Link></li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-4 text-xs text-slate-400 sm:px-6">© {new Date().getFullYear()} JobReady. Coaching, not a guarantee of any hiring outcome.</p>
    </footer>
  );
}
