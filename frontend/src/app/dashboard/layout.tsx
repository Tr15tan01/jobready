import { DashboardNav } from "@/components/dashboard-nav";
import { RequireAuth } from "@/components/require-auth";

// Rendered per request so responses carry "no-store": the browser must not
// serve a cached signed-in page from its history after logout.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
        <DashboardNav />
        {children}
      </div>
    </RequireAuth>
  );
}
