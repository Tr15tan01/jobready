"use client";

import { useAuth } from "@/lib/auth-context";
import { LoadingButton } from "@/components/ui/spinner";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api-client";


type Job = {
  id: string;
  title: string;
  company: string | null;
  requirements: {
    required_skills: string[];
    preferred_skills: string[];
    technologies: string[];
    responsibilities: string[];
  } | null;
};

type Match = {
  overall_score: number;
  required_requirements_score: number;
  experience_score: number;
  technical_skills_score: number;
  responsibilities_score: number;
  preferred_score: number;
  strong_matches: string[];
  gaps: string[];
  partial_matches: string[];
  explanation: string | null;
};

type ResumeItem = { id: string; is_primary: boolean; versions: { id: string }[] };

export function JobMatcher({ refreshKey = 0 }: { refreshKey?: number }) {
  const { accessToken: token } = useAuth();

  const [description, setDescription] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [primaryVersionId, setPrimaryVersionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(
    (extra: Record<string, string> = {}) => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...extra,
    }),
    [token]
  );

  const loadJobs = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/v1/jobs`, { headers: authHeaders() });
    if (res.ok) setJobs(await res.json());
  }, [token, authHeaders]);

  const loadPrimaryResume = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/v1/resumes`, { headers: authHeaders() });
    if (!res.ok) return;
    const resumes: ResumeItem[] = await res.json();
    const primary = resumes.find((r) => r.is_primary) ?? resumes[0];
    setPrimaryVersionId(primary?.versions?.[0]?.id ?? null);
  }, [token, authHeaders]);

  // refreshKey changes when an example job is added elsewhere on the page,
  // so the list picks it up without a full reload.
  useEffect(() => {
    loadJobs();
    loadPrimaryResume();
  }, [loadJobs, loadPrimaryResume, refreshKey]);

  async function handleExtract() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`${API_URL}/api/v1/jobs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ raw_description: description }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not analyze this job description.");
      return;
    }
    setDescription("");
    await loadJobs();
  }

  async function handleMatch(jobId: string) {
    if (!primaryVersionId) {
      setError("Upload a resume first to run a match.");
      return;
    }
    const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}/match`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ resume_version_id: primaryVersionId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? "Could not run this match.");
      return;
    }
    const match: Match = await res.json();
    setMatches((prev) => ({ ...prev, [jobId]: match }));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste a job description here..."
          rows={6}
          className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <LoadingButton
          onClick={handleExtract}
          loading={loading}
          loadingText="Reading the requirements..."
          disabled={!description.trim()}
          className="mt-3 w-full sm:w-auto"
        >
          Analyze job
        </LoadingButton>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-4">
        {jobs.map((job) => {
          const match = matches[job.id];
          return (
            <div key={job.id} className="rounded-xl border border-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-slate-900 dark:text-slate-50">
                  {job.title} {job.company ? `— ${job.company}` : ""}
                </h3>
                <button
                  onClick={() => handleMatch(job.id)}
                  className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Check match
                </button>
              </div>

              {job.requirements && (
                <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                  {job.requirements.required_skills.map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {match && (
                <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
                  <p className="mb-2 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    Overall Match: {match.overall_score}%
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-5 dark:text-slate-400">
                    <div>Required: {match.required_requirements_score}%</div>
                    <div>Experience: {match.experience_score}%</div>
                    <div>Skills: {match.technical_skills_score}%</div>
                    <div>Responsibilities: {match.responsibilities_score}%</div>
                    <div>Preferred: {match.preferred_score}%</div>
                  </div>
                  {match.strong_matches.length > 0 && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Strong matches:</strong> {match.strong_matches.join(", ")}
                    </p>
                  )}
                  {match.gaps.length > 0 && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Gaps:</strong> {match.gaps.join(", ")}
                    </p>
                  )}
                  {match.partial_matches.length > 0 && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Partial:</strong> {match.partial_matches.join(", ")}
                    </p>
                  )}
                  {match.explanation && <p className="mt-2 text-slate-500 dark:text-slate-400">{match.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
