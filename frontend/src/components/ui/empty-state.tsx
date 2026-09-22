import Link from "next/link";

/**
 * First-run state. A dash ("—") tells a new user nothing and reads like
 * something broke; this explains why the space is empty and what to do
 * about it.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
      {icon && <div className="mb-3 flex justify-center text-slate-400 dark:text-slate-500">{icon}</div>}
      <h3 className="mb-1 font-medium text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/**
 * Metric card that degrades gracefully when there's no data yet, instead
 * of rendering a bare dash.
 */
export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint: string;
}) {
  const hasValue = value != null;
  return (
    <div className="rounded-xl border border-slate-100 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {hasValue ? (
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {Math.round(value)}%
        </p>
      ) : (
        <p className="mt-1 sm:mt-2 text-xs leading-snug text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
