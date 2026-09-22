"""
Speech Practice topics. Deliberately a static bank, not AI-generated —
picking a random prompt doesn't need a model call, and a curated bank
guarantees a sensible, on-topic prompt every time (section 25 cost
control: never call AI where a cheaper mechanism works just as well).

Capped at 6 modes by design, so the picker stays simple: Persuasive,
Impromptu, Storytelling, Presentation, Debate, Pitch.
"""
import random

SPEECH_PRACTICE_MODES = ["persuasive", "impromptu", "storytelling", "presentation", "debate", "pitch"]

SPEECH_PRACTICE_LABELS = {
    "persuasive": "Persuasive Speech",
    "impromptu": "Impromptu Speech",
    "storytelling": "Storytelling",
    "presentation": "Presentation",
    "debate": "Debate",
    "pitch": "Elevator Pitch",
}

PROMPT_BANK: dict[str, list[str]] = {
    "persuasive": [
        "Convince someone to try a hobby you love.",
        "Argue why remote work is better than working in an office (or vice versa).",
        "Persuade a friend to read a book that changed your perspective.",
        "Make the case for a four-day work week.",
        "Convince your audience that failure is essential to growth.",
        "Argue that everyone should learn to cook.",
        "Persuade someone to switch to a habit you've found valuable.",
        "Make the case for lifelong learning.",
    ],
    "impromptu": [
        "If you could have dinner with anyone, living or dead, who would it be and why?",
        "What's a skill everyone should learn, and why?",
        "Describe your ideal Saturday.",
        "What's a piece of advice you'd give your younger self?",
        "Is it better to be a specialist or a generalist?",
        "What does success mean to you?",
        "Describe a time you changed your mind about something important.",
        "What's one thing you'd change about how people communicate?",
    ],
    "storytelling": [
        "Tell a story about a time you overcame an unexpected obstacle.",
        "Describe a moment that taught you something about yourself.",
        "Tell a story about a mistake that turned into a valuable lesson.",
        "Describe a person who changed the direction of your life.",
        "Tell a story about the best team you've ever been part of.",
        "Describe a moment you were proud of a decision you made.",
        "Tell a story about a time you had to adapt quickly.",
        "Describe the most memorable trip or experience of your life.",
    ],
    "presentation": [
        "Present an idea for improving your workplace or school.",
        "Explain a concept from your field to someone with no background in it.",
        "Present the case for a project or initiative you care about.",
        "Walk through how you'd approach solving a problem you've faced recently.",
        "Present the three most important things you've learned in your career so far.",
        "Explain how you'd onboard a new team member effectively.",
        "Present a plan for achieving a personal or professional goal.",
        "Explain a trend in your industry and why it matters.",
    ],
    "debate": [
        "Is it better to specialize deeply or stay a generalist? Argue one side.",
        "Should companies require employees to return to the office? Argue one side.",
        "Is failure more valuable than early success? Argue one side.",
        "Should schools focus more on practical skills than theory? Argue one side.",
        "Is competition or collaboration more important for success? Argue one side.",
        "Should everyone learn to code? Argue one side.",
        "Is it better to take risks early in a career or play it safe? Argue one side.",
        "Should performance reviews be replaced with continuous feedback? Argue one side.",
    ],
    "pitch": [
        "Pitch yourself for your dream role in 60 seconds.",
        "Pitch an idea for a product that would make daily life easier.",
        "Pitch a project you're proud of to someone who's never heard of it.",
        "Pitch a change you'd make to how your team works.",
        "Pitch a book, show, or idea you think everyone should know about.",
        "Pitch a solution to a problem you personally experience often.",
        "Pitch yourself as a candidate for a promotion.",
        "Pitch an idea for a side project you'd love to build.",
    ],
}


def get_random_prompt(mode: str) -> str:
    bank = PROMPT_BANK.get(mode)
    if not bank:
        raise ValueError(f"Unknown speech practice mode: {mode}")
    return random.choice(bank)
