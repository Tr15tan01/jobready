/**
 * A template (unlike a layout) re-mounts on every navigation, so each
 * dashboard page gets a subtle fade-in rather than only the first one.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
