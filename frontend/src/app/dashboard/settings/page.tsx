"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


type UsageFeature = { key: string; label: string; used: number; limit: number; remaining: number };
type Usage = { plan: string; period: string; features: UsageFeature[] };
type Plan = {
  key: string;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  limits: { key: string; label: string; limit: number }[];
};

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ka", label: "ქართული" },
  { value: "es", label: "Español" },
];

function UsageBar({ feature }: { feature: UsageFeature }) {
  const pct = feature.limit > 0 ? Math.min(100, (feature.used / feature.limit) * 100) : 0;
  // Colour shifts as the allowance runs down, so "nearly out" is visible
  // at a glance rather than requiring the user to read the numbers.
  const tone = pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{feature.label}</span>
        <span className={pct >= 100 ? "font-medium text-red-600" : "text-slate-500 dark:text-slate-400"}>
          {feature.used} / {feature.limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all motion-reduce:transition-none ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { accessToken: token, user, refreshUser, logout } = useAuth();

  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [locale, setLocale] = useState("en");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const headers = useCallback(
    () => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }),
    [token]
  );

  useEffect(() => {
    if (user) {
      setName(user.full_name ?? "");
      setLocale(user.locale ?? "en");
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/api/v1/usage`, { headers: headers() }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/v1/usage/plans`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, p]) => {
        setUsage(u);
        setPlans(p?.plans ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, headers]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await fetch(`${API_URL}/api/v1/me`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ full_name: name, locale }),
    });
    setSavingProfile(false);
    setProfileMsg(res.ok ? "Saved." : "Could not save your changes.");
    if (res.ok) await refreshUser();
  }

  async function changePassword() {
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    const res = await fetch(`${API_URL}/api/v1/me/change-password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
    });
    setSavingPw(false);
    if (res.ok) {
      // Changing the password bumps token_version server-side, which
      // revokes every existing session including this one.
      setPwMsg({ ok: true, text: "Password changed. Signing you out of all devices..." });
      setTimeout(async () => {
        await logout();
        router.push("/login");
      }, 1800);
    } else {
      const body = await res.json().catch(() => ({}));
      setPwMsg({ ok: false, text: body.detail ?? "Could not change your password." });
    }
  }

  async function upgrade(targetPlan: string) {
    setUpgrading(targetPlan);
    setUpgradeError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ plan: targetPlan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUpgradeError(body.detail ?? "Could not start checkout.");
        return;
      }
      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch {
      setUpgradeError("Could not reach the server. Is the backend running?");
    } finally {
      setUpgrading(null);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch(`${API_URL}/api/v1/me`, { method: "DELETE", headers: headers() });
    setDeleting(false);
    if (res.ok) {
      await logout();
      router.push("/");
    }
  }

  const currentPlan = usage?.plan ?? "free";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Settings</h1>

      {loading ? (
        <LoadingPanel label="Loading your settings..." />
      ) : (
        <div className="space-y-6">
          {/* Profile */}
          <section className="rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-medium text-slate-900 dark:text-slate-50">Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Email</label>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {user?.email}
                  {user?.email_verified === false && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      unverified
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="name" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Full name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="locale" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                  Language (also used for AI feedback)
                </label>
                <select
                  id="locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <LoadingButton onClick={saveProfile} loading={savingProfile} loadingText="Saving...">
                  Save changes
                </LoadingButton>
                {profileMsg && <span className="text-sm text-slate-500 dark:text-slate-400">{profileMsg}</span>}
              </div>
            </div>
          </section>

          {/* Password */}
          <section className="rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-1 font-medium text-slate-900 dark:text-slate-50">Password</h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Changing your password signs you out everywhere, on every device.
            </p>
            <div className="space-y-3">
              <input
                type="password" placeholder="Current password" value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                type="password" placeholder="New password (min. 8 characters)" value={pw.next} minLength={8}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                type="password" placeholder="Repeat new password" value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {pwMsg && (
                <p className={`text-sm ${pwMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{pwMsg.text}</p>
              )}
              <LoadingButton
                onClick={changePassword}
                loading={savingPw}
                loadingText="Updating..."
                disabled={!pw.current || pw.next.length < 8}
              >
                Change password
              </LoadingButton>
            </div>
          </section>

          {/* Usage */}
          {usage && (
            <section className="rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-1 font-medium text-slate-900 dark:text-slate-50">This month&apos;s usage</h2>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Resets on the 1st. You&apos;re on the <span className="font-medium capitalize">{currentPlan}</span> plan.
              </p>
              <div className="space-y-3">
                {usage.features.map((f) => <UsageBar key={f.key} feature={f} />)}
              </div>
            </section>
          )}

          {/* Plans */}
          <section className="rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-medium text-slate-900 dark:text-slate-50">Plans</h2>
            {upgradeError && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {upgradeError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((p) => {
                const isCurrent = p.key === currentPlan;
                const accent =
                  p.key === "pro" ? "border-violet-300 dark:border-violet-800"
                  : p.key === "premium" ? "border-indigo-300 dark:border-indigo-800"
                  : "border-slate-200 dark:border-slate-700";
                return (
                  <div key={p.key} className={`rounded-lg border-2 p-4 ${isCurrent ? accent : "border-slate-200 dark:border-slate-700"}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{p.name}</p>
                      {isCurrent && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          current
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{p.price}</p>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{p.tagline}</p>
                    <ul className="mb-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {p.features.map((f) => <li key={f}>• {f}</li>)}
                    </ul>
                    <ul className="mb-3 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      {p.limits.map((l) => <li key={l.key}>{l.label}: {l.limit}/mo</li>)}
                    </ul>
                    {!isCurrent && p.key !== "free" && (
                      <LoadingButton
                        onClick={() => upgrade(p.key)}
                        loading={upgrading === p.key}
                        loadingText="Redirecting..."
                        variant={p.key === "pro" ? "accent" : "primary"}
                        className="w-full text-xs"
                      >
                        Upgrade to {p.name}
                      </LoadingButton>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Checkout is handled securely by Paddle. You&apos;ll return here afterwards.
            </p>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border border-red-200 p-6 dark:border-red-900/50 dark:bg-slate-900">
            <h2 className="mb-1 font-medium text-red-700 dark:text-red-400">Delete account</h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Permanently removes your account and everything in it — resumes, jobs, interview
              transcripts, scores and progress. This cannot be undone.
            </p>
            {!confirmDelete ? (
              <LoadingButton variant="secondary" onClick={() => setConfirmDelete(true)}>
                Delete my account
              </LoadingButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">Are you sure?</span>
                <LoadingButton variant="danger" onClick={deleteAccount} loading={deleting} loadingText="Deleting...">
                  Yes, delete everything
                </LoadingButton>
                <LoadingButton variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </LoadingButton>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
