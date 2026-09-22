import { LearningPlanView } from "@/components/learning-plan-view";

export default function LearningPlanPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Learning Plan</h1>
      <LearningPlanView />
    </main>
  );
}
