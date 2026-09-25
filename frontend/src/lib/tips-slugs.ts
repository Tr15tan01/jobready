/** URL slugs of the public tips guides, keyed by speech-practice mode. */
export const SPEECH_TIPS_SLUG: Record<string, string> = {
  persuasive: "persuasive-speech",
  impromptu: "impromptu-speaking",
  storytelling: "storytelling",
  presentation: "presentation-skills",
  debate: "debate",
  pitch: "elevator-pitch",
};

export const INTERVIEW_TIPS_SLUG = "job-interview-answers";

export function tipsHref(mode: string | null | undefined): string {
  return mode && SPEECH_TIPS_SLUG[mode] ? `/tips/${SPEECH_TIPS_SLUG[mode]}` : "/tips";
}
