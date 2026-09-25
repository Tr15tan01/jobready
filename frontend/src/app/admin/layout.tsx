import { RequireAuth } from "@/components/require-auth";

// See dashboard/layout.tsx: never cache signed-in pages in browser history.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
