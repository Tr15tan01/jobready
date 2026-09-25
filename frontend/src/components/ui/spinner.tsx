"use client";

/**
 * Inline spinner. Inherits currentColor so it stays legible on any button
 * background.
 */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Larger gradient spinner for full-panel loading states. Uses an SVG
 * gradient stroke rather than a flat colour so page-level waits feel
 * less flat, while still honouring prefers-reduced-motion.
 */
export function GradientSpinner({ size = 40 }: { size?: number }) {
  const id = "jr-spinner-gradient";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle
        cx="24" cy="24" r="19"
        className="stroke-slate-200 dark:stroke-slate-700"
        strokeWidth="5"
      />
      <path
        d="M24 5a19 19 0 0 1 19 19"
        stroke={`url(#${id})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A button that shows a spinner and disables itself while `loading`.
 * Keeps the label visible so the button doesn't change width mid-action,
 * and announces busy state to screen readers.
 */
export function LoadingButton({
  loading = false,
  children,
  loadingText,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "success" | "accent" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none";
  const variants = {
    primary:
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400",
    secondary:
      "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    accent: "bg-violet-600 text-white shadow-sm hover:bg-violet-700",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

/**
 * Full-block loading state for panels that are fetching their initial data.
 * With `onCancel`, shows a Cancel button so a long wait is never a dead end.
 */
export function LoadingPanel({
  label = "Loading...",
  onCancel,
  cancelLabel = "Cancel",
}: {
  label?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 p-10 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
    >
      <GradientSpinner />
      <span>{label}</span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">×</span> {cancelLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Skeleton placeholder — used where we know the shape of what's coming
 * (e.g. dashboard metric cards) so the layout doesn't jump on load.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800 ${className}`}
    />
  );
}
