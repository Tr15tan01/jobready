export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" className="fill-slate-900 dark:fill-white" />
      <rect x="16" y="36" width="7" height="14" rx="2.5" className="fill-slate-500 dark:fill-slate-400" />
      <rect x="28.5" y="27" width="7" height="23" rx="2.5" className="fill-slate-400 dark:fill-slate-600" />
      <rect x="41" y="16" width="7" height="34" rx="2.5" className="fill-white dark:fill-slate-900" />
    </svg>
  );
}

export function LogoWordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo size={size} />
      <span className="text-lg font-semibold tracking-tight dark:text-slate-50">JobReady</span>
    </span>
  );
}
