"use client";

import { useEffect, useState } from "react";
import { GradientSpinner } from "@/components/ui/spinner";
import { Logo } from "@/components/ui/logo";

/**
 * Full-screen loader for sign-in and sign-up. A spinner inside the button
 * is easy to miss; this makes it unmistakable that something is happening.
 * After a few seconds it explains why it might be slow.
 */
export function AuthLoadingOverlay({ show, title }: { show: boolean; title: string }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!show) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      className="animate-fade-in fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-white/85 px-6 text-center backdrop-blur-md dark:bg-slate-950/85"
    >
      <div className="relative flex items-center justify-center">
        <GradientSpinner size={88} />
        <span className="absolute"><Logo size={34} /></span>
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
          {slow
            ? "Waking up the server — after a quiet spell this can take up to a minute."
            : "Just a moment…"}
        </p>
      </div>
    </div>
  );
}
