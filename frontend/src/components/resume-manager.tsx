"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState } from "react";
import { getDictionary, Locale } from "@/lib/i18n/config";
import { Upload, Sparkles } from "lucide-react";
import { ResumeWizard } from "@/components/resume-wizard";
import { LoadingPanel, Spinner } from "@/components/ui/spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ResumeVersion = {
  id: string;
  version_number: number;
  label: string | null;
  template: string;
  content: {
    full_name?: string | null;
    summary?: string | null;
    skills?: { name: string; category?: string | null }[];
    work_experience?: { company?: string; title?: string; description?: string }[];
    education?: { institution?: string; degree?: string }[];
  };
};

type ResumeItem = {
  id: string;
  title: string;
  is_primary: boolean;
  versions: ResumeVersion[];
};

export function ResumeManager({ locale }: { locale: Locale }) {
  const { accessToken: token } = useAuth();
  const t = getDictionary(locale).resume;

  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ resumeId: string; versionId: string; text: string } | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const authHeaders = useCallback(
    (extra: Record<string, string> = {}) => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    }),
    [token]
  );

  const loadResumes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/resumes`, { headers: authHeaders() });
    if (res.ok) setResumes(await res.json());
    setLoading(false);
  }, [token, authHeaders]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/v1/resumes`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? "Upload failed.");
      return;
    }
    await loadResumes();
  }

  async function handleMakePrimary(resumeId: string) {
    await fetch(`${API_URL}/api/v1/resumes/${resumeId}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ is_primary: true }),
    });
    await loadResumes();
  }

  async function handleDelete(resumeId: string) {
    await fetch(`${API_URL}/api/v1/resumes/${resumeId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await loadResumes();
  }

  async function handleImprove(resumeId: string, version: ResumeVersion) {
    const res = await fetch(
      `${API_URL}/api/v1/resumes/${resumeId}/versions/${version.id}/improve`,
      {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          section: "summary",
          section_content: { summary: version.content.summary },
        }),
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.suggestion) {
      setSuggestion({ resumeId, versionId: version.id, text: data.suggestion });
    }
  }

  async function acceptSuggestion(version: ResumeVersion) {
    if (!suggestion) return;
    await fetch(
      `${API_URL}/api/v1/resumes/${suggestion.resumeId}/versions/${suggestion.versionId}`,
      {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: { ...version.content, summary: suggestion.text } }),
      }
    );
    setSuggestion(null);
    await loadResumes();
  }

  if (loading) return <LoadingPanel label="Loading your resumes..." />;

  if (showWizard) {
    return (
      <ResumeWizard
        onCancel={() => setShowWizard(false)}
        onCreated={async () => {
          setShowWizard(false);
          await loadResumes();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Two ways in: build from scratch, or bring an existing resume */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 text-left transition hover:border-indigo-400 hover:shadow-md motion-reduce:transition-none dark:border-indigo-900 dark:from-indigo-950/40 dark:to-violet-950/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles size={20} />
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">Create with AI</span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Answer a few questions and we&apos;ll write a clean, professional resume from what you tell us.
          </span>
          <span className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-slate-900/60 dark:text-indigo-300">
            2 free per month
          </span>
        </button>

        <label
          className={`flex cursor-pointer flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 transition hover:border-emerald-400 hover:bg-emerald-50/40 motion-reduce:transition-none dark:border-slate-700 dark:hover:bg-emerald-950/20 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            {uploading ? <Spinner size={20} /> : <Upload size={20} />}
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {uploading ? "Reading your resume..." : t.upload}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Already have one? We&apos;ll extract it into editable, structured sections.
          </span>
          <span className="mt-1 text-xs text-slate-400">{t.uploadHint}</span>
          <input type="file" accept=".pdf,.docx,.txt" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {resumes.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t.noResumesYet}</p>
      )}

      <div className="space-y-4">
        {resumes.map((resume) => {
          const primaryVersion = resume.versions[0];
          return (
            <div key={resume.id} className="rounded-xl border border-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-slate-50">{resume.title}</h3>
                  {resume.is_primary && (
                    <span className="text-xs font-medium text-emerald-600">{t.primary}</span>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  {!resume.is_primary && (
                    <button
                      onClick={() => handleMakePrimary(resume.id)}
                      className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {t.makePrimary}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-red-600 hover:bg-red-50"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>

              {primaryVersion && (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{t.summary}</p>
                    <p className="text-slate-600">
                      {primaryVersion.content.summary || t.informationNotProvided}
                    </p>
                    <button
                      onClick={() => handleImprove(resume.id, primaryVersion)}
                      className="mt-1 text-xs font-medium text-slate-900 underline"
                    >
                      {t.improveWithAI}
                    </button>
                    {suggestion?.versionId === primaryVersion.id && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-slate-700">{suggestion.text}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => acceptSuggestion(primaryVersion)}
                            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
                          >
                            {t.accept}
                          </button>
                          <button
                            onClick={() => setSuggestion(null)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          >
                            {t.reject}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-slate-700">{t.skills}</p>
                    <p className="text-slate-600">
                      {primaryVersion.content.skills?.length
                        ? primaryVersion.content.skills.map((s) => s.name).join(", ")
                        : t.informationNotProvided}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
