export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 prose prose-slate dark:prose-invert dark:bg-slate-950">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">
        Placeholder text for product use — have this reviewed by a lawyer before launch.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Account information (email, name, locale).</li>
        <li>Resume text and structured data extracted from uploads — not the original file, once extracted.</li>
        <li>Job descriptions you add and the resulting match scores.</li>
        <li>Interview transcripts, derived speech metrics, and derived visual metrics.</li>
      </ul>
      <h2>What we never store</h2>
      <ul>
        <li>Interview video or audio recordings are never permanently stored.</li>
        <li>Camera frames are processed locally in your browser wherever technically possible and are not uploaded.</li>
      </ul>
      <h2>Your controls</h2>
      <p>You can delete any resume, delete any interview session, delete your account, or export your data at any time from Settings.</p>
      <h2>AI-generated content</h2>
      <p>
        Resume suggestions, match scores, and interview feedback are AI-assisted coaching
        recommendations. They are not guarantees of employment outcomes and should be reviewed
        with your own judgment.
      </p>
    </main>
  );
}
