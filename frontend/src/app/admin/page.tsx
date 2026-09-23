"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, UserCheck, UserX, DollarSign, Activity, Search, ChevronLeft, ChevronRight,
  X, ShieldAlert, FileText, Briefcase, MessageSquare, Mic, Sparkles, Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-client";
import { DashboardNav } from "@/components/dashboard-nav";
import { GradientSpinner, LoadingButton, LoadingPanel } from "@/components/ui/spinner";

type AdminUser = {
  id: string; email: string; full_name: string | null; plan: string;
  is_active: boolean; is_admin: boolean; email_verified: boolean; created_at: string;
};
type Stats = {
  total_users: number; active_users: number; disabled_users: number; new_users_7d: number;
  active_users_7d: number; users_by_plan: Record<string, number>; total_ai_requests: number;
  estimated_ai_spend_usd: number; cost_per_user_usd: number; cost_by_feature: Record<string, number>;
  requests_by_model: Record<string, number>; total_interview_sessions: number;
  total_speech_sessions: number; completed_sessions: number; average_score: number | null;
  total_resumes: number; total_jobs: number;
};
type Day = { day: string; signups: number; sessions: number; ai_cost_usd: number };
type Detail = {
  user: AdminUser; headline: string | null; resumes: number; jobs: number;
  interview_sessions: number; speech_sessions: number; completed_sessions: number;
  average_score: number | null; ai_requests: number; ai_cost_usd: number;
  last_active: string | null; usage_this_month: Record<string, number>;
  recent_sessions: { id: string; session_type: string; mode: string; status: string; overall_score: number | null; created_at: string }[];
};

const PAGE = 20;
const PLAN_STYLE: Record<string, string> = {
  free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  premium: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
};
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${tone}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function ActivityChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.sessions), ...days.map((d) => d.signups));
  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily sessions and signups over the last 14 days">
        {days.map((d) => (
          <div key={d.day} className="group relative flex flex-1 items-end justify-center gap-0.5">
            <div className="w-1/2 rounded-t bg-indigo-500" style={{ height: `${(d.sessions / max) * 100}%`, minHeight: d.sessions ? 3 : 0 }} />
            <div className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${(d.signups / max) * 100}%`, minHeight: d.signups ? 3 : 0 }} />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
              {d.day}: {d.sessions} sessions, {d.signups} signups, {usd(d.ai_cost_usd)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{days[0]?.day.slice(5)}</span><span>{days[days.length - 1]?.day.slice(5)}</span>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Sessions</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Signups</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { accessToken: token, user: me } = useAuth();
  const [forbidden, setForbidden] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const headers = useCallback(
    () => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }),
    [token]
  );

  // Overview
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/api/v1/admin/stats`, { headers: headers() }),
      fetch(`${API_URL}/api/v1/admin/activity?days=14`, { headers: headers() }),
    ]).then(async ([s, a]) => {
      if (s.status === 403) return setForbidden(true);
      if (s.ok) setStats(await s.json());
      if (a.ok) setDays(await a.json());
    });
  }, [token, headers]);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(q); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (plan) params.set("plan", plan);
    const res = await fetch(`${API_URL}/api/v1/admin/users?${params}`, { headers: headers() });
    if (res.status === 403) setForbidden(true);
    else if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
      setTotal(d.total);
    }
    setLoadingUsers(false);
  }, [token, headers, offset, query, status, plan]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setActionError(null);
    setDetail(null);
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, { headers: headers() });
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }

  async function update(id: string, body: { is_active?: boolean; plan?: string }, key: string) {
    setActing(key);
    setActionError(null);
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) });
    setActing(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setActionError(b.detail ?? "Action failed.");
      return;
    }
    const updated: AdminUser = await res.json();
    setUsers((list) => list.map((u) => (u.id === id ? updated : u)));
    setDetail((d) => (d && d.user.id === id ? { ...d, user: updated } : d));
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
        <DashboardNav />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <ShieldAlert className="mx-auto text-slate-400" size={40} />
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Admins only</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your account doesn&apos;t have access to this page.</p>
        </main>
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const featureCosts = Object.entries(stats?.cost_by_feature ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCost = Math.max(0.0001, ...featureCosts.map(([, c]) => c));

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <DashboardNav />
      <main className="animate-fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Admin</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Users, behaviour and AI spend. Resume contents and interview transcripts are never shown here.
        </p>

        {!stats ? (
          <div className="mt-6"><LoadingPanel label="Loading overview..." /></div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={Users} label="Total users" value={stats.total_users} sub={`+${stats.new_users_7d} this week`} tone="bg-indigo-600" />
              <StatCard icon={UserCheck} label="Active this week" value={stats.active_users_7d} sub="practised in last 7 days" tone="bg-emerald-600" />
              <StatCard icon={UserX} label="Suspended" value={stats.disabled_users} tone="bg-rose-600" />
              <StatCard icon={DollarSign} label="AI spend" value={usd(stats.estimated_ai_spend_usd)} sub={`${usd(stats.cost_per_user_usd)} per user`} tone="bg-amber-500" />
              <StatCard icon={MessageSquare} label="Interviews" value={stats.total_interview_sessions} tone="bg-violet-600" />
              <StatCard icon={Mic} label="Speech sessions" value={stats.total_speech_sessions} tone="bg-pink-600" />
              <StatCard icon={Activity} label="Avg score" value={stats.average_score ?? "—"} sub={`${stats.completed_sessions} completed`} tone="bg-sky-600" />
              <StatCard icon={Sparkles} label="AI requests" value={stats.total_ai_requests} tone="bg-slate-700" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Last 14 days</h2>
                {days.length ? <ActivityChart days={days} /> : <p className="text-sm text-slate-500">No activity yet.</p>}
              </section>
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Users by plan</h2>
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {(["free", "premium", "pro"] as const).map((p, i) => (
                      <div key={p} className={["bg-slate-400", "bg-indigo-500", "bg-violet-500"][i]}
                        style={{ width: `${((stats.users_by_plan[p] ?? 0) / Math.max(1, stats.total_users)) * 100}%` }} />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Free {stats.users_by_plan.free ?? 0}</span><span>Premium {stats.users_by_plan.premium ?? 0}</span><span>Pro {stats.users_by_plan.pro ?? 0}</span>
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">AI cost by feature</h2>
                  {featureCosts.length === 0 ? <p className="text-sm text-slate-500">No AI usage yet.</p> : (
                    <ul className="space-y-2">
                      {featureCosts.slice(0, 6).map(([f, c]) => (
                        <li key={f}>
                          <div className="flex justify-between text-xs"><span className="text-slate-600 dark:text-slate-300">{f.replaceAll("_", " ")}</span><span className="font-medium text-slate-900 dark:text-white">{usd(c)}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${(c / maxCost) * 100}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* Users */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name" aria-label="Search users"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} aria-label="Filter by status"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">All statuses</option><option value="active">Active</option><option value="disabled">Suspended</option>
            </select>
            <select value={plan} onChange={(e) => { setPlan(e.target.value); setOffset(0); }} aria-label="Filter by plan"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">All plans</option><option value="free">Free</option><option value="premium">Premium</option><option value="pro">Pro</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="hidden px-4 py-3 md:table-cell">Joined</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingUsers ? (
                  <tr><td colSpan={5} className="py-10"><div className="flex justify-center"><GradientSpinner size={32} /></div></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users match.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{u.full_name || "—"} {u.is_admin && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">ADMIN</span>}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_STYLE[u.plan]}`}>{u.plan}</span></td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${u.is_active ? "text-emerald-600" : "text-rose-600"}`}>
                        <span className={`h-2 w-2 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />{u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDetail(u.id)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800">
            <span>{total} users · page {Math.floor(offset / PAGE) + 1} of {pages}</span>
            <div className="flex gap-1">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} aria-label="Previous page"
                className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><ChevronLeft size={18} /></button>
              <button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} aria-label="Next page"
                className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><ChevronRight size={18} /></button>
            </div>
          </div>
        </section>
      </main>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <aside role="dialog" aria-label="User details" onClick={(e) => e.stopPropagation()}
            className="animate-fade-in h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">User details</h2>
              <button onClick={() => { setDetail(null); setDetailLoading(false); }} aria-label="Close" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex justify-center py-20"><GradientSpinner size={40} /></div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{detail.user.full_name || "—"}</p>
                  <p className="text-sm text-slate-500">{detail.user.email}{!detail.user.email_verified && " · unverified"}</p>
                  {detail.headline && <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">{detail.headline}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock size={13} /> Joined {fmtDate(detail.user.created_at)} · last active {fmtDate(detail.last_active)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: FileText, n: detail.resumes, l: "Resumes" }, { icon: Briefcase, n: detail.jobs, l: "Jobs" },
                    { icon: MessageSquare, n: detail.interview_sessions, l: "Interviews" }, { icon: Mic, n: detail.speech_sessions, l: "Speech" },
                    { icon: Activity, n: detail.average_score ?? "—", l: "Avg score" }, { icon: DollarSign, n: usd(detail.ai_cost_usd), l: "AI cost" },
                  ].map(({ icon: Icon, n, l }) => (
                    <div key={l} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <Icon size={16} className="mx-auto text-indigo-500" />
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{n}</p>
                      <p className="text-[11px] text-slate-500">{l}</p>
                    </div>
                  ))}
                </div>

                {Object.keys(detail.usage_this_month).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Usage this month</h3>
                    <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      {Object.entries(detail.usage_this_month).map(([f, c]) => (
                        <li key={f} className="flex justify-between"><span>{f.replaceAll("_", " ")}</span><span className="font-medium">{c}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent sessions</h3>
                  {detail.recent_sessions.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
                    <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                      {detail.recent_sessions.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-2">
                          <span className="text-slate-700 dark:text-slate-300">
                            <span className="capitalize">{s.mode}</span>
                            <span className="text-xs text-slate-400"> · {s.session_type === "speech_practice" ? "speech" : "interview"} · {fmtDate(s.created_at)}</span>
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{s.overall_score != null ? `${s.overall_score}/10` : s.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Account controls</h3>
                  {actionError && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{actionError}</p>}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Plan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["free", "premium", "pro"].map((p) => (
                        <LoadingButton key={p} variant={detail.user.plan === p ? "primary" : "secondary"} loading={acting === `plan-${p}`}
                          disabled={detail.user.plan === p} onClick={() => update(detail.user.id, { plan: p }, `plan-${p}`)} className="px-2 py-2 text-xs capitalize">
                          {p}
                        </LoadingButton>
                      ))}
                    </div>
                  </div>
                  {detail.user.is_active ? (
                    <LoadingButton variant="danger" className="w-full" loading={acting === "status"} loadingText="Suspending..."
                      disabled={detail.user.id === me?.id} onClick={() => update(detail.user.id, { is_active: false }, "status")}>
                      <UserX size={16} /> Suspend account
                    </LoadingButton>
                  ) : (
                    <LoadingButton variant="success" className="w-full" loading={acting === "status"} loadingText="Reactivating..."
                      onClick={() => update(detail.user.id, { is_active: true }, "status")}>
                      <UserCheck size={16} /> Reactivate account
                    </LoadingButton>
                  )}
                  <p className="text-xs text-slate-500">
                    {detail.user.id === me?.id
                      ? "You can't suspend your own account."
                      : "Suspending signs the user out of every device immediately. All changes are audit-logged."}
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
