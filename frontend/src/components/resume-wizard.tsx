"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LoadingButton } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


type Experience = {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};
type Education = { institution: string; degree: string; field_of_study: string; end_date: string };

const STEPS = ["Basics", "Experience", "Education", "Skills", "Review"] as const;

const emptyExperience = (): Experience => ({
  company: "", title: "", start_date: "", end_date: "", is_current: false, description: "",
});
const emptyEducation = (): Education => ({ institution: "", degree: "", field_of_study: "", end_date: "" });

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const label = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";

/** Splits a comma/newline list into clean entries. */
function toList(value: string): string[] {
  return value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export function ResumeWizard({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { accessToken, user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basics, setBasics] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: "",
    location: "",
    target_role: "",
    summary: "",
  });
  const [experience, setExperience] = useState<Experience[]>([emptyExperience()]);
  const [education, setEducation] = useState<Education[]>([emptyEducation()]);
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [certifications, setCertifications] = useState("");

  const canAdvance = step !== 0 || basics.full_name.trim().length > 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/resumes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...basics,
          // Drop blank entries so the AI never sees empty placeholders it
          // might be tempted to "fill in".
          experience: experience.filter((e) => e.company.trim() && e.title.trim()).map((e) => ({
            ...e,
            start_date: e.start_date || null,
            end_date: e.is_current ? null : e.end_date || null,
          })),
          education: education.filter((e) => e.institution.trim()).map((e) => ({
            ...e,
            degree: e.degree || null,
            field_of_study: e.field_of_study || null,
            end_date: e.end_date || null,
          })),
          skills: toList(skills),
          languages: toList(languages),
          certifications: toList(certifications),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          res.status === 429
            ? "You've used all your AI resume generations for this month. Upgrade in Settings for more, or upload an existing resume instead."
            : body.detail ?? "Could not generate your resume."
        );
        return;
      }
      onCreated();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((name, i) => (
          <li key={name} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition motion-reduce:transition-none ${
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${i === step ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
              {name}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Full name *</label>
              <input className={input} value={basics.full_name} onChange={(e) => setBasics({ ...basics, full_name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Target role</label>
              <input className={input} placeholder="e.g. Registered Nurse" value={basics.target_role} onChange={(e) => setBasics({ ...basics, target_role: e.target.value })} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={basics.email} onChange={(e) => setBasics({ ...basics, email: e.target.value })} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={input} value={basics.phone} onChange={(e) => setBasics({ ...basics, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={label}>Location</label>
            <input className={input} placeholder="City, Country" value={basics.location} onChange={(e) => setBasics({ ...basics, location: e.target.value })} />
          </div>
          <div>
            <label className={label}>About you (optional)</label>
            <textarea
              className={input} rows={3}
              placeholder="A few sentences about your background and what you're looking for. We'll polish the wording — we won't add anything you didn't say."
              value={basics.summary}
              onChange={(e) => setBasics({ ...basics, summary: e.target.value })}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Describe what you actually did in plain words. Mention real numbers only if you have them —
            the AI tidies phrasing but won&apos;t invent results.
          </p>
          {experience.map((exp, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Job title</label>
                  <input className={input} value={exp.title} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                </div>
                <div>
                  <label className={label}>Company / organisation</label>
                  <input className={input} value={exp.company} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} />
                </div>
                <div>
                  <label className={label}>Start (YYYY-MM)</label>
                  <input className={input} placeholder="2021-03" value={exp.start_date} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))} />
                </div>
                <div>
                  <label className={label}>End (YYYY-MM)</label>
                  <input className={input} placeholder="2024-01" disabled={exp.is_current} value={exp.is_current ? "" : exp.end_date} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={exp.is_current} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, is_current: e.target.checked } : x))} />
                I currently work here
              </label>
              <div>
                <label className={label}>What did you do?</label>
                <textarea className={input} rows={3} value={exp.description} onChange={(e) => setExperience(experience.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              </div>
              {experience.length > 1 && (
                <button type="button" onClick={() => setExperience(experience.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setExperience([...experience, emptyExperience()])} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <Plus size={15} /> Add another role
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {education.map((ed, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-2 dark:border-slate-800">
              <div>
                <label className={label}>Institution</label>
                <input className={input} value={ed.institution} onChange={(e) => setEducation(education.map((x, j) => j === i ? { ...x, institution: e.target.value } : x))} />
              </div>
              <div>
                <label className={label}>Degree / qualification</label>
                <input className={input} value={ed.degree} onChange={(e) => setEducation(education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x))} />
              </div>
              <div>
                <label className={label}>Field of study</label>
                <input className={input} value={ed.field_of_study} onChange={(e) => setEducation(education.map((x, j) => j === i ? { ...x, field_of_study: e.target.value } : x))} />
              </div>
              <div>
                <label className={label}>Graduated (YYYY-MM)</label>
                <input className={input} value={ed.end_date} onChange={(e) => setEducation(education.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))} />
              </div>
              {education.length > 1 && (
                <button type="button" onClick={() => setEducation(education.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setEducation([...education, emptyEducation()])} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <Plus size={15} /> Add education
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <label className={label}>Skills (comma-separated)</label>
            <textarea className={input} rows={3} placeholder="Patient assessment, Python, Budget management..." value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
          <div>
            <label className={label}>Languages</label>
            <input className={input} placeholder="English, Georgian, Spanish" value={languages} onChange={(e) => setLanguages(e.target.value)} />
          </div>
          <div>
            <label className={label}>Certifications</label>
            <input className={input} placeholder="ACLS, AWS Solutions Architect..." value={certifications} onChange={(e) => setCertifications(e.target.value)} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
            <p className="flex items-center gap-2 font-medium text-indigo-900 dark:text-indigo-200">
              <Sparkles size={16} /> Ready to generate
            </p>
            <p className="mt-1 text-indigo-800/80 dark:text-indigo-300/80">
              We&apos;ll turn your answers into a polished resume. We only rephrase what you wrote —
              nothing is invented. You can edit everything afterwards.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
            <dt className="text-slate-400">Name</dt><dd>{basics.full_name}</dd>
            <dt className="text-slate-400">Target role</dt><dd>{basics.target_role || "—"}</dd>
            <dt className="text-slate-400">Roles</dt><dd>{experience.filter((e) => e.company && e.title).length}</dd>
            <dt className="text-slate-400">Education</dt><dd>{education.filter((e) => e.institution).length}</dd>
            <dt className="text-slate-400">Skills</dt><dd>{toList(skills).length}</dd>
          </dl>
          <p className="text-xs text-slate-400">
            Uses 1 of your monthly AI resume generations (Free plan: 2 per month).
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={step === 0 ? onCancel : () => setStep(step - 1)} className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <LoadingButton onClick={() => setStep(step + 1)} disabled={!canAdvance}>
            Continue
          </LoadingButton>
        ) : (
          <LoadingButton onClick={submit} loading={submitting} loadingText="Writing your resume..." variant="accent">
            Generate resume
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
