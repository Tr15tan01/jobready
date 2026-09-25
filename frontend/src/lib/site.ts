/** Public site URL for canonical links, sitemap and social previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://frontend-khaki-two-25.vercel.app")
  .trim()
  .replace(/\/+$/, "");

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "JobReady";
