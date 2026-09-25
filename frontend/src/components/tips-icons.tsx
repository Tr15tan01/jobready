import { Megaphone, Zap, BookOpen, Presentation, Scale, Rocket, MessageSquare, type LucideIcon } from "lucide-react";

/** Icon per guide, matching the practice-mode icons in the app. */
export const GUIDE_ICON: Record<string, LucideIcon> = {
  "persuasive-speech": Megaphone,
  "impromptu-speaking": Zap,
  storytelling: BookOpen,
  "presentation-skills": Presentation,
  debate: Scale,
  "elevator-pitch": Rocket,
  "job-interview-answers": MessageSquare,
};
