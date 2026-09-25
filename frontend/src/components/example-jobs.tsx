"use client";

import { useEffect, useState } from "react";
import { Briefcase, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LoadingButton, Skeleton } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


type Example = {
  id: string;
  title: string;
  company: string;
  category: string;
  seniority: string;
  location: string;
  preview: string;
};

// Per-category accent, so the grid reads at a glance.
const CATEGORY_STYLE: Record<string, string> = {
  Technology: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  Healthcare: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "Architecture & Design": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "Product & Business": "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "Marketing & Sales": "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
  Education: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "Finance & Legal": "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  Operations: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  "Customer Service": "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  Hospitality: "bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300",
  "Trades & Engineering": "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300",
  "Creative & Media": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
  "Public Sector & Nonprofit": "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  "Science & Research": "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
};
// First screenful; the rest are one tap away.
const INITIAL_VISIBLE = 12;

export function ExampleJobs({ onAdded }: { onAdded: () => void }) {
  const { accessToken } = useAuth();
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/jobs/examples`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setExamples)
      .catch(() => setExamples([]))
      .finally(() => setLoading(false));
  }, []);

  async function add(id: string) {
    setAdding(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/examples/${id}`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail ?? "Could not add that job.");
        return;
      }
      setAdded((prev) => new Set(prev).add(id));
      onAdded();
    } finally {
      setAdding(null);
    }
  }

  const categories = ["All", ...Array.from(new Set(examples.map((e) => e.category)))];
  const needle = search.trim().toLowerCase();
  const matching = examples.filter(
    (e) =>
      (category === "All" || e.category === category) &&
      (!needle || `${e.title} ${e.company} ${e.category}`.toLowerCase().includes(needle))
  );
  const visible = showAll || needle || category !== "All" ? matching : matching.slice(0, INITIAL_VISIBLE);
  const hidden = matching.length - visible.length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">Try an example role</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No posting to hand? Add one of these — free on every plan — and see how your resume matches.
          </p>
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${examples.length} example roles — e.g. nurse, analyst, designer`}
        aria-label="Search example roles"
        className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition motion-reduce:transition-none ${
              category === c
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <div className="animate-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="mb-1 h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          : visible.length === 0
          ? [<p key="none" className="col-span-full py-6 text-center text-sm text-slate-500 dark:text-slate-400">No example roles match &ldquo;{search}&rdquo;.</p>]
          : visible.map((job) => {
              const isAdded = added.has(job.id);
              return (
                <div
                  key={job.id}
                  className="flex flex-col rounded-xl border border-slate-100 p-4 transition hover:border-slate-300 hover:shadow-sm motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                >
                  <span className={`mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[job.category] ?? "bg-slate-100 text-slate-700"}`}>
                    {job.category}
                  </span>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{job.title}</p>
                  <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Briefcase size={12} /> {job.seniority}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                  </p>
                  <div className="mt-auto">
                    <LoadingButton
                      onClick={() => add(job.id)}
                      loading={adding === job.id}
                      loadingText="Analysing..."
                      disabled={isAdded}
                      variant={isAdded ? "success" : "secondary"}
                      className="w-full text-xs"
                    >
                      {isAdded ? "Added" : <><Plus size={14} /> Add to my jobs</>}
                    </LoadingButton>
                  </div>
                </div>
              );
            })}
      </div>
      {!loading && hidden > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Show all {matching.length} example roles
          </button>
        </div>
      )}
    </section>
  );
}
