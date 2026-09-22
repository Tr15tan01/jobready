"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  is_active: boolean;
};

type Stats = {
  total_users: number;
  active_users: number;
  total_ai_requests: number;
  estimated_ai_spend_usd: number;
  cost_by_feature: Record<string, number>;
  requests_by_model: Record<string, number>;
  total_interview_sessions: number;
};

/**
 * This page has no client-side gate beyond being signed in — the real
 * authorization boundary is server-side (get_current_admin on every
 * /admin/* endpoint). A non-admin user sees empty/error states here,
 * never actual admin data, because the backend rejects the requests.
 */
export default function AdminPage() {
  const { accessToken: token } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const authHeaders = useCallback(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    const [usersRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/admin/users`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/v1/admin/stats`, { headers: authHeaders() }),
    ]);
    if (usersRes.status === 403 || statsRes.status === 403) {
      setForbidden(true);
      return;
    }
    if (usersRes.ok) setUsers(await usersRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
  }, [token, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(user: AdminUser) {
    await fetch(`${API_URL}/api/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    await load();
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-slate-500 dark:text-slate-400">You don&apos;t have access to this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Admin</h1>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Users", value: stats.total_users },
            { label: "Active users", value: stats.active_users },
            { label: "AI requests", value: stats.total_ai_requests },
            { label: "Est. AI spend", value: `$${stats.estimated_ai_spend_usd.toFixed(2)}` },
            { label: "Interview sessions", value: stats.total_interview_sessions },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.plan}</td>
                <td className="px-4 py-2">{u.is_active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-2">
                  <button onClick={() => toggleActive(u)} className="text-xs font-medium text-slate-700 underline">
                    {u.is_active ? "Disable" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
