import Link from "next/link";
import { Monitor, Smartphone, Laptop, Mic, Video, ShieldCheck, AlertCircle } from "lucide-react";
import { LogoWordmark } from "@/components/ui/logo";

export const metadata = { title: "Allow camera & microphone — JobReady" };

const DEVICES = [
  {
    icon: Monitor,
    name: "Chrome, Edge or Brave (Windows, Mac, Linux)",
    color: "text-indigo-600",
    steps: [
      "Click the camera or lock icon at the left of the address bar.",
      "Set Camera and Microphone to Allow.",
      "Reload the page.",
      "Still blocked? Open Settings → Privacy and security → Site settings → Camera / Microphone and remove JobReady from the Blocked list.",
    ],
  },
  {
    icon: Laptop,
    name: "Safari (Mac)",
    color: "text-sky-600",
    steps: [
      "In the menu bar, choose Safari → Settings for This Website.",
      "Set Camera and Microphone to Allow.",
      "Reload the page.",
      "Also check System Settings → Privacy & Security → Camera / Microphone and make sure Safari is switched on.",
    ],
  },
  {
    icon: Monitor,
    name: "Firefox",
    color: "text-orange-600",
    steps: [
      "Click the camera or microphone icon in the address bar.",
      "Remove the Blocked permission, then reload.",
      "Firefox will ask again — choose Allow.",
    ],
  },
  {
    icon: Smartphone,
    name: "iPhone and iPad (Safari)",
    color: "text-emerald-600",
    steps: [
      "Tap the ‘aA’ icon in the address bar, then Website Settings.",
      "Set Camera and Microphone to Allow.",
      "If there's no option: open the Settings app → Safari → Camera / Microphone → choose Ask or Allow.",
      "Use Safari — some in-app browsers (inside social apps) can't access the camera at all.",
    ],
  },
  {
    icon: Smartphone,
    name: "Android (Chrome)",
    color: "text-rose-600",
    steps: [
      "Tap the icon at the left of the address bar, then Permissions.",
      "Allow Camera and Microphone.",
      "If that doesn't work: Android Settings → Apps → Chrome → Permissions → allow Camera and Microphone.",
    ],
  },
];

export default function PermissionsHelpPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/dashboard"><LogoWordmark size={26} /></Link>
        </div>
      </header>

      <div className="animate-fade-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-50">
          Allowing camera and microphone
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your browser asks permission the first time you record. If you clicked Block, or it
          never asked, follow the steps for your device below.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <Mic className="shrink-0 text-emerald-600" size={22} />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <strong>Audio answers</strong> need only the microphone. Audio is transcribed, then discarded.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <Video className="shrink-0 text-violet-600" size={22} />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <strong>Video answers</strong> need both. Video is analysed on your device and never uploaded.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {DEVICES.map(({ icon: Icon, name, color, steps }) => (
            <section key={name} className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
                <Icon size={20} className={color} /> {name}
              </h2>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
            <AlertCircle size={20} className="text-amber-600" /> Still not working?
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>Close other apps using the camera — Zoom, Teams, FaceTime. Only one app can use it at a time.</li>
            <li>Check your device isn&apos;t muted, and that a physical camera shutter isn&apos;t closed.</li>
            <li>Camera access requires a secure (https) connection. It won&apos;t work on plain http.</li>
            <li>You can always answer in writing — it needs no permissions at all.</li>
          </ul>
        </section>

        <p className="mt-8 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <ShieldCheck size={16} className="text-emerald-600" />
          Curious what happens to your video?{" "}
          <Link href="/help/video-privacy" className="font-medium text-indigo-600 underline dark:text-indigo-400">
            How video analysis works
          </Link>
        </p>
      </div>
    </main>
  );
}
