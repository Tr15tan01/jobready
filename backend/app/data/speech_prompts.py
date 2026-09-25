"""
Speech Practice topics. Deliberately a static bank, not AI-generated —
picking a topic doesn't need a model call, and a curated bank guarantees a
sensible, on-topic prompt every time (section 25 cost control: never call AI
where a cheaper mechanism works just as well).

Capped at 6 modes by design, so the picker stays simple: Persuasive,
Impromptu, Storytelling, Presentation, Debate, Pitch.

Plans unlock a larger slice of each mode's bank: the first
SPEECH_TOPICS_FREE prompts are free, the first SPEECH_TOPICS_PREMIUM are on
Premium, and Pro gets all of them (see app/core/config.py). Order matters:
the free slice is a varied, representative sample of each mode.
"""
import secrets
from typing import Iterable, Optional

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
        # --- free slice ---
        "Convince someone to try a hobby you love.",
        "Make the case for a four-day work week.",
        "Persuade a friend to read a book that changed your perspective.",
        "Convince your audience that failure is essential to growth.",
        "Argue that everyone should learn to cook.",
        "Persuade your neighbours to start a community garden.",
        "Convince a sceptical manager to let the team try a new tool.",
        "Persuade someone to take a digital detox for one weekend.",
        "Make the case for learning a second language as an adult.",
        "Convince your audience to walk or cycle for short trips.",
        # --- premium slice ---
        "Persuade a young person to start saving money now.",
        "Make the case for lifelong learning.",
        "Convince your town to invest in its public library.",
        "Persuade someone to volunteer two hours a month.",
        "Argue that sleep is the most underrated productivity tool.",
        "Convince your team to hold fewer, shorter meetings.",
        "Persuade a friend to finally see a doctor for a regular check-up.",
        "Make the case for keeping a daily journal.",
        "Convince your audience to buy less and repair more.",
        "Persuade a company to offer paid mentoring for new hires.",
        "Convince someone who hates public speaking to join a speaking club.",
        "Make the case for teaching financial literacy in every school.",
        "Persuade a friend to travel somewhere they've never considered.",
        "Convince your audience that asking for help is a strength.",
        # --- pro slice ---
        "Persuade a board of directors to fund a four-week employee sabbatical.",
        "Make the case for banning phones during family dinners.",
        "Convince a city council to make public transport free for students.",
        "Persuade a sceptical audience that kindness is good business.",
        "Argue that every workplace should publish its salary ranges.",
        "Convince a hiring manager that soft skills matter more than a degree.",
        "Persuade your audience to spend one hour a week outdoors without a screen.",
        "Make the case for companies letting employees choose their own hours.",
        "Convince your audience to learn basic first aid this year.",
        "Persuade a room of engineers to write clearer documentation.",
        "Argue that curiosity is the most valuable career skill.",
        "Convince a small business owner to accept feedback from customers publicly.",
    ],
    "impromptu": [
        # --- free slice ---
        "What's a skill everyone should learn, and why?",
        "Describe your ideal Saturday.",
        "What's a piece of advice you'd give your younger self?",
        "What does success mean to you?",
        "If you could master any profession overnight, which would you choose?",
        "What's the most useful thing you've learned from a mistake?",
        "Describe a place that makes you feel calm.",
        "Would you rather be very good at many things or excellent at one?",
        "What's a small habit that made a big difference in your life?",
        "If you could change one rule in your city, what would it be?",
        # --- premium slice ---
        "If you could have dinner with anyone, living or dead, who would it be and why?",
        "Is it better to be a specialist or a generalist?",
        "Describe a time you changed your mind about something important.",
        "What's one thing you'd change about how people communicate?",
        "What would you do with an extra hour every day?",
        "Which invention has most improved your daily life?",
        "What makes a great teacher?",
        "If you wrote a book, what would it be about?",
        "What is something that is overrated, and why?",
        "Describe the best compliment you've ever received.",
        "What does a perfect team look like?",
        "Should people plan their lives in detail or stay flexible?",
        "What would you tell someone on their first day at a new job?",
        "Which season of the year best describes your personality?",
        # --- pro slice ---
        "If you could instantly learn any language, which one and why?",
        "What's a question you wish people asked you more often?",
        "Is it more important to be liked or respected at work?",
        "What would your life look like if money weren't a concern?",
        "Describe a skill that looks easy but is actually hard.",
        "What's a tradition you'd like to start?",
        "Should everyone take a gap year? Why or why not?",
        "What's the most important quality in a leader?",
        "If you could relive one day, which would it be?",
        "What does it mean to be a good listener?",
        "What will work look like in twenty years?",
        "What's something you believed as a child that turned out to be wrong?",
    ],
    "storytelling": [
        # --- free slice ---
        "Tell a story about a time you overcame an unexpected obstacle.",
        "Describe a moment that taught you something about yourself.",
        "Tell a story about a mistake that turned into a valuable lesson.",
        "Describe a person who changed the direction of your life.",
        "Tell a story about the best team you've ever been part of.",
        "Tell a story about a time you got completely lost.",
        "Describe the day you learned something important from a stranger.",
        "Tell a story about your first job or your first day at work.",
        "Tell a story about a time a plan went hilariously wrong.",
        "Describe a moment you surprised yourself.",
        # --- premium slice ---
        "Describe a moment you were proud of a decision you made.",
        "Tell a story about a time you had to adapt quickly.",
        "Describe the most memorable trip or experience of your life.",
        "Tell a story about a time you stood up for someone.",
        "Describe a meal you'll never forget and who you shared it with.",
        "Tell a story about an object you own that has a history.",
        "Tell a story about a deadline you almost missed.",
        "Describe a time someone's small kindness changed your day.",
        "Tell a story about learning a skill that frustrated you at first.",
        "Describe the moment you realised you had grown up.",
        "Tell a story about a conversation that changed your mind.",
        "Tell a story about a risk you took that paid off.",
        "Describe a time you had to deliver bad news.",
        "Tell a story about a teacher or mentor you still think about.",
        # --- pro slice ---
        "Tell a story about a time you failed in public and what happened next.",
        "Describe a moment when you had to lead without being the leader.",
        "Tell a story about a goodbye that mattered.",
        "Tell a story about a time you were wrong about someone.",
        "Describe your proudest moment at work in the style of a movie scene.",
        "Tell a story about solving a problem nobody else wanted to touch.",
        "Tell the story of your career so far in three chapters.",
        "Describe a time you had to rebuild trust.",
        "Tell a story about a coincidence that changed your plans.",
        "Tell a story about a time you said yes when you wanted to say no.",
        "Describe a customer, client or patient you'll always remember.",
        "Tell a story about the moment you chose your profession.",
    ],
    "presentation": [
        # --- free slice ---
        "Present an idea for improving your workplace or school.",
        "Explain a concept from your field to someone with no background in it.",
        "Present the three most important things you've learned in your career so far.",
        "Present a plan for achieving a personal or professional goal.",
        "Explain a trend in your industry and why it matters.",
        "Present how you'd organise a successful team event on a small budget.",
        "Explain how to make a good first impression in a job interview.",
        "Present the pros and cons of working from home.",
        "Explain a process you do at work, step by step, to a new colleague.",
        "Present a quarterly update on a project of your choice.",
        # --- premium slice ---
        "Present the case for a project or initiative you care about.",
        "Walk through how you'd approach solving a problem you've faced recently.",
        "Explain how you'd onboard a new team member effectively.",
        "Present a proposal to reduce waste in your office or home.",
        "Explain how a tool you use every day actually works.",
        "Present lessons learned from a project that didn't go to plan.",
        "Explain how to give constructive feedback in three steps.",
        "Present a budget for launching a small online business.",
        "Explain the history of your profession in two minutes.",
        "Present a customer-service improvement plan.",
        "Explain how to prioritise when everything feels urgent.",
        "Present a proposal for a mentoring programme.",
        "Explain the most common mistake beginners make in your field.",
        "Present three ways technology will change your job in five years.",
        # --- pro slice ---
        "Present a turnaround plan for a struggling product or service.",
        "Explain a complex decision you made, and the trade-offs, to senior leadership.",
        "Present a risk assessment for a project you know well.",
        "Present research findings to an audience that disagrees with them.",
        "Explain your team's goals for next year to the whole company.",
        "Present a recommendation with three options and your preferred one.",
        "Explain a technical failure and its fix to non-technical stakeholders.",
        "Present a case study of a company you admire.",
        "Pitch a new process to a team that likes the old one.",
        "Present a hiring plan for a new department.",
        "Explain how you measure success in your role.",
        "Present the results of a customer survey and what to do next.",
    ],
    "debate": [
        # --- free slice ---
        "Is it better to specialize deeply or stay a generalist? Argue one side.",
        "Should companies require employees to return to the office? Argue one side.",
        "Is failure more valuable than early success? Argue one side.",
        "Should schools focus more on practical skills than theory? Argue one side.",
        "Is competition or collaboration more important for success? Argue one side.",
        "Should social media be banned for children under 16? Argue one side.",
        "Is university still worth the cost? Argue one side.",
        "Should homework be abolished? Argue one side.",
        "Are cities better places to live than the countryside? Argue one side.",
        "Should voting be compulsory? Argue one side.",
        # --- premium slice ---
        "Should everyone learn to code? Argue one side.",
        "Is it better to take risks early in a career or play it safe? Argue one side.",
        "Should performance reviews be replaced with continuous feedback? Argue one side.",
        "Should the working week be shortened to four days? Argue one side.",
        "Is it ethical to use AI to write job applications? Argue one side.",
        "Should tipping be replaced with higher wages? Argue one side.",
        "Is it better to rent or buy a home? Argue one side.",
        "Should companies hire for attitude over skills? Argue one side.",
        "Should public transport be free? Argue one side.",
        "Are open-plan offices good for productivity? Argue one side.",
        "Should unpaid internships be illegal? Argue one side.",
        "Is it better to have a few close friends or many acquaintances? Argue one side.",
        "Should phones be banned in classrooms? Argue one side.",
        "Is job-hopping good for your career? Argue one side.",
        # --- pro slice ---
        "Should salaries be public within a company? Argue one side.",
        "Is a universal basic income a good idea? Argue one side.",
        "Should managers be elected by their teams? Argue one side.",
        "Is it better to be first to market or best in market? Argue one side.",
        "Should cars be banned from city centres? Argue one side.",
        "Do experts deserve more trust than public opinion? Argue one side.",
        "Should companies be allowed to monitor employees working from home? Argue one side.",
        "Is it better to lead with data or with intuition? Argue one side.",
        "Should the retirement age be raised? Argue one side.",
        "Are degrees becoming less important than portfolios? Argue one side.",
        "Should advertising to children be banned? Argue one side.",
        "Is it better to fix a failing project or start over? Argue one side.",
    ],
    "pitch": [
        # --- free slice ---
        "Pitch yourself for your dream role in 60 seconds.",
        "Pitch an idea for a product that would make daily life easier.",
        "Pitch a project you're proud of to someone who's never heard of it.",
        "Pitch a change you'd make to how your team works.",
        "Pitch a solution to a problem you personally experience often.",
        "Pitch yourself to a recruiter you just met at a networking event.",
        "Pitch a local business idea for your neighbourhood.",
        "Pitch an app that helps people build better habits.",
        "Pitch yourself as the perfect volunteer for a charity event.",
        "Pitch a new menu item to a café owner.",
        # --- premium slice ---
        "Pitch a book, show, or idea you think everyone should know about.",
        "Pitch yourself as a candidate for a promotion.",
        "Pitch an idea for a side project you'd love to build.",
        "Pitch a service that saves busy parents time.",
        "Pitch a workshop you could teach in your area of expertise.",
        "Pitch a better way to run weekly team meetings.",
        "Pitch yourself for a freelance project to a new client.",
        "Pitch an eco-friendly product to a sceptical buyer.",
        "Pitch a podcast idea in one minute.",
        "Pitch an event that would bring your community together.",
        "Pitch a tool that would make your job easier to your manager.",
        "Pitch yourself for a scholarship or training programme.",
        "Pitch a subscription box people would actually keep.",
        "Pitch a solution to long queues at a public service.",
        # --- pro slice ---
        "Pitch your startup to an investor who has two minutes before a flight.",
        "Pitch a partnership between your company and a competitor.",
        "Pitch a career change to a hiring manager outside your industry.",
        "Pitch a product to a customer who already uses a rival product.",
        "Pitch a new internal team that the company doesn't have yet.",
        "Pitch yourself for a leadership role you've never held before.",
        "Pitch a budget increase to a finance director.",
        "Pitch a new market your company should enter.",
        "Pitch an idea that has already failed once, and why it will work now.",
        "Pitch your research to a non-specialist funding panel.",
        "Pitch a product feature to engineers who think it's unnecessary.",
        "Pitch yourself for a board or advisory position.",
    ],
}

_rng = secrets.SystemRandom()


def available_prompts(mode: str, limit: Optional[int] = None) -> list[str]:
    """The prompts a plan can draw from: the first `limit` of the mode's bank."""
    bank = PROMPT_BANK.get(mode)
    if not bank:
        raise ValueError(f"Unknown speech practice mode: {mode}")
    return bank if limit is None else bank[: max(1, limit)]


def get_random_prompt(mode: str, limit: Optional[int] = None, recent: Iterable[str] = ()) -> str:
    """A random prompt from the plan's slice, avoiding recently used ones.

    `recent` is the user's most recent prompts for this mode (newest first).
    Every prompt not in it is eligible; if the user has used them all, the
    oldest-used half becomes eligible again, so there's never a dead end and
    never an immediate repeat.
    """
    pool = available_prompts(mode, limit)
    recent_list = [p for p in recent if p in pool]
    fresh = [p for p in pool if p not in set(recent_list)]
    if not fresh:
        # Everything used: re-open the older half of the history.
        keep_blocked = set(recent_list[: max(1, len(pool) // 2)])
        fresh = [p for p in pool if p not in keep_blocked] or pool
    # SystemRandom draws from the OS, so each server process (and restart)
    # doesn't share a predictable sequence.
    return _rng.choice(fresh)
