"use client";

import { useState } from "react";
import { JobMatcher } from "@/components/job-matcher";
import { ExampleJobs } from "@/components/example-jobs";

export default function JobsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Jobs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste a real posting or start from an example. Each match shows exactly how the score
          was calculated — required skills, experience, responsibilities and more.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-50">Your jobs</h2>
          <JobMatcher refreshKey={refreshKey} />
        </section>
        <ExampleJobs onAdded={() => setRefreshKey((k) => k + 1)} />
      </div>
    </main>
  );
}
