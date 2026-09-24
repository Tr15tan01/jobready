"use client";

import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/spinner";

/**
 * Appears when any API request has been pending for a few seconds. The
 * usual cause is the free-tier backend waking from sleep after inactivity,
 * which can take up to a minute — without this, the app just looks frozen.
 */
export function ServerWakeNotice() {
  const { slow } = useAuth();
  if (!slow) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in fixed inset-x-0 top-20 z-[60] mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-indigo-200 bg-white/95 px-4 py-3 text-sm shadow-xl backdrop-blur dark:border-indigo-900 dark:bg-slate-900/95"
    >
      <Spinner size={18} className="shrink-0 text-indigo-600" />
      <span className="text-slate-700 dark:text-slate-200">
        <strong className="font-semibold">Connecting to the server…</strong>{" "}
        After a quiet spell this can take up to a minute. Hang tight.
      </span>
    </div>
  );
}
