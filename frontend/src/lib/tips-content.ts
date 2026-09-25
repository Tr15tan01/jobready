/**
 * Public speaking guides (/tips and /tips/[slug]).
 *
 * Plain data so every guide renders with the same accessible, SEO-friendly
 * structure. Research notes cite the original work (author, year, venue)
 * and are phrased no more strongly than the findings support.
 */

export type Framework = { name: string; summary: string; steps: { label: string; text: string }[]; example?: string };
export type Section = { id: string; heading: string; body: string[]; bullets?: string[] };
export type Research = { finding: string; source: string };
export type Guide = {
  slug: string;
  mode: string | null; // speech-practice mode, or null for the interview guide
  label: string; // short name for cards and breadcrumbs
  title: string; // <title> / H1
  description: string; // meta description, ~150 chars
  keywords: string[];
  readingMinutes: number;
  accent: { tile: string; soft: string; text: string };
  intro: string[];
  takeaways: string[];
  frameworks: Framework[];
  sections: Section[];
  mistakes: { mistake: string; fix: string }[];
  drills: { name: string; how: string }[];
  research: Research[];
  faq: { q: string; a: string }[];
};

export const GUIDES_UPDATED = "2026-09-25";

export const GUIDES: Guide[] = [
  // ---------------------------------------------------------------- Persuasive
  {
    slug: "persuasive-speech",
    mode: "persuasive",
    label: "Persuasive speech",
    title: "How to Give a Persuasive Speech: Structure, Techniques and Examples",
    description:
      "Learn to persuade with evidence, not pressure: Monroe's Motivated Sequence, ethos–pathos–logos, handling objections, and research on what actually changes minds.",
    keywords: ["persuasive speech", "how to persuade", "Monroe's motivated sequence", "ethos pathos logos", "persuasive speaking tips"],
    readingMinutes: 9,
    accent: { tile: "bg-rose-600", soft: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300" },
    intro: [
      "A persuasive speech asks an audience to believe, feel or do something they weren't going to before you started. That's a big ask, so the best persuaders don't push harder — they make the change feel reasonable, safe and worth it.",
      "This guide gives you two proven structures, the three ingredients every persuasive message needs, and what research says about objections, eye contact and evidence.",
    ],
    takeaways: [
      "Start from your audience's current belief, not from your conclusion.",
      "Name the strongest objection yourself — and answer it.",
      "Use one vivid example and one hard number rather than ten weak ones.",
      "End with a specific, small, doable action.",
    ],
    frameworks: [
      {
        name: "Monroe's Motivated Sequence",
        summary: "A five-step structure developed by Alan H. Monroe in the 1930s and still taught in speech courses because it follows how people make decisions.",
        steps: [
          { label: "Attention", text: "Open with a question, story or surprising fact that makes the topic matter now." },
          { label: "Need", text: "Show the problem concretely — who it affects and what it costs." },
          { label: "Satisfaction", text: "Present your solution and explain how it solves the need." },
          { label: "Visualisation", text: "Paint the future: what life looks like with (and without) your solution." },
          { label: "Action", text: "Ask for one specific next step the audience can take today." },
        ],
        example: "“Last month our team spent 11 hours in status meetings (attention/need). A 10-minute written update each Friday would cover the same ground (satisfaction). Picture getting those hours back for real work (visualisation). Let's trial it for four weeks, starting this Friday (action).”",
      },
      {
        name: "Problem – Cause – Solution",
        summary: "A shorter structure for two-minute speeches: name the problem, explain why it happens, then show why your solution targets that cause.",
        steps: [
          { label: "Problem", text: "One clear sentence plus one example." },
          { label: "Cause", text: "Why it keeps happening — this is where credibility is won." },
          { label: "Solution", text: "Your proposal, and why it addresses the cause rather than the symptom." },
        ],
      },
    ],
    sections: [
      {
        id: "three-ingredients",
        heading: "The three ingredients: credibility, emotion and logic",
        body: [
          "Aristotle's Rhetoric described three modes of persuasion that still map neatly onto modern research. Ethos is why the audience should trust you. Pathos is why they should care. Logos is why your argument holds up.",
          "Most weak persuasive speeches are all logos: a list of reasons with no one to care about them. Most manipulative ones are all pathos. Aim for balance — a personal connection to the topic, a human example, and evidence that survives a sceptical question.",
        ],
        bullets: [
          "Ethos: say briefly why you know about this (“I've run this process for three years…”).",
          "Pathos: one specific person or moment beats a statistic about millions.",
          "Logos: one strong number, with its source, beats five vague ones.",
        ],
      },
      {
        id: "know-your-audience",
        heading: "Start from where your audience is",
        body: [
          "Before writing a word, decide where your audience stands: already agree, undecided, or opposed. Each needs a different speech. Supporters need energy and a clear action. Undecided listeners need clear reasons. Opponents need to feel heard before they can move at all.",
          "With a sceptical audience, aim for a smaller change. Moving someone from “no” to “maybe, I'd try it” is a real win — and far more realistic than a conversion.",
        ],
      },
      {
        id: "objections",
        heading: "Handle objections before they're raised",
        body: [
          "Many speakers avoid mentioning counterarguments for fear of weakening their case. The research points the other way: presenting the other side and then refuting it tends to be more persuasive than ignoring it. It signals honesty and takes the objection out of the listener's head.",
          "Use a simple pattern: “You might be thinking X. That's fair, because Y. Here's why I still believe Z.”",
        ],
      },
      {
        id: "delivery",
        heading: "Delivery that supports the message",
        body: [
          "Speak a little slower than feels natural on your key claim, then pause. Silence after an important sentence gives it weight. Keep your hands visible and still between gestures, and let your voice drop at the end of statements — rising endings can make claims sound like questions.",
          "Eye contact builds connection with people who already agree, but be aware it can feel confrontational to people who strongly disagree. With a hostile audience, a warmer, more conversational tone often works better than intensity.",
        ],
      },
      {
        id: "ending",
        heading: "End with a specific ask",
        body: [
          "“Think about it” is not an action. “Sign up for the trial before Friday” is. The more specific and small the ask, the more likely people are to do it. Repeat your core message in one sentence, then make the ask, then stop talking.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Opening with “Today I'm going to talk about…”", fix: "Open with the problem, a question or a short story instead." },
      { mistake: "Too many arguments", fix: "Pick your three strongest. Extra weak points dilute the strong ones." },
      { mistake: "Attacking people who disagree", fix: "Attack the problem, respect the person. Contempt closes minds." },
      { mistake: "Statistics without context", fix: "Translate numbers into something tangible: “that's one in every classroom.”" },
      { mistake: "A vague ending", fix: "Finish with one concrete action and a deadline." },
    ],
    drills: [
      { name: "The one-sentence case", how: "Before practising, write your whole argument in one sentence of under 25 words. If you can't, your speech isn't focused yet." },
      { name: "Steelman first", how: "Argue the opposite side for 60 seconds, as convincingly as you can. Then give your real speech and address those points." },
      { name: "Swap the adjectives for evidence", how: "Record yourself, then replace every “really important” or “huge” with a fact, example or number." },
    ],
    research: [
      { finding: "Across dozens of studies, two-sided messages that acknowledge and then refute counterarguments were more persuasive than one-sided messages; two-sided messages that don't refute the other side were less persuasive.", source: "Allen, M. (1991). Meta-analysis comparing the persuasiveness of one-sided and two-sided messages. Western Journal of Speech Communication." },
      { finding: "People process persuasive messages either carefully (weighing arguments) or superficially (relying on cues like confidence or credentials). Attitude change produced by careful processing lasts longer.", source: "Petty, R. E. & Cacioppo, J. T. (1986). The Elaboration Likelihood Model of persuasion. Advances in Experimental Social Psychology." },
      { finding: "Stories that absorb listeners (“narrative transportation”) shifted their beliefs toward the story's message, and highly transported readers were less likely to pick holes in it.", source: "Green, M. C. & Brock, T. C. (2000). The role of transportation in the persuasiveness of public narratives. Journal of Personality and Social Psychology." },
      { finding: "Eye contact made listeners who already disagreed with a speaker less persuaded, not more — gaze can feel like pressure to a sceptical audience.", source: "Chen, F. S., Minson, J. A., Schöne, M., & Heinrichs, M. (2013). In the eye of the beholder: Eye contact increases resistance to persuasion. Psychological Science." },
      { finding: "Warning people about an argument and giving them a weakened version of it in advance (“inoculation”) makes them more resistant to it later — useful to know when you face a practised opponent.", source: "McGuire, W. J. (1961) and later work on inoculation theory." },
    ],
    faq: [
      { q: "How long should a persuasive speech be?", a: "For practice, two to five minutes is ideal. That's long enough for a full Monroe sequence, short enough to force you to cut weak points." },
      { q: "What's the best opening for a persuasive speech?", a: "One that makes the problem feel real and immediate: a short story, a striking statistic with context, or a question the audience genuinely wants answered." },
      { q: "Should I use emotional appeals?", a: "Yes, honestly. Emotion tells people why the facts matter. It becomes manipulation only when it replaces evidence or exaggerates the stakes." },
    ],
  },

  // ---------------------------------------------------------------- Impromptu
  {
    slug: "impromptu-speaking",
    mode: "impromptu",
    label: "Impromptu speaking",
    title: "Impromptu Speaking: How to Think on Your Feet (PREP and More)",
    description:
      "Speak well with no preparation: the PREP and Past–Present–Future frameworks, how to buy thinking time, and drills that make impromptu answers sound planned.",
    keywords: ["impromptu speaking", "impromptu speech tips", "PREP method", "think on your feet", "table topics"],
    readingMinutes: 8,
    accent: { tile: "bg-amber-500", soft: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
    intro: [
      "Impromptu speaking — answering with little or no preparation — is the kind of speaking we do most: in meetings, interviews, and when someone says “what do you think?”. It feels like a talent, but it's mostly a set of habits you can practise.",
      "The secret of speakers who sound effortlessly prepared is that they carry a few ready-made structures in their heads. The topic changes; the shape of the answer doesn't.",
    ],
    takeaways: [
      "Pause before you speak. Two seconds of silence reads as thoughtful, not lost.",
      "Pick one structure (PREP is the easiest) and use it every time until it's automatic.",
      "Make one point well rather than three points badly.",
      "Land the ending: restate your point and stop.",
    ],
    frameworks: [
      {
        name: "PREP: Point – Reason – Example – Point",
        summary: "The most versatile impromptu structure. It works for opinions, questions in meetings and interview answers.",
        steps: [
          { label: "Point", text: "Answer the question in your first sentence." },
          { label: "Reason", text: "Give the main reason you believe it." },
          { label: "Example", text: "Make it concrete with a story, case or fact." },
          { label: "Point", text: "Restate your answer — often with a small twist or call to action." },
        ],
        example: "Q: “Is it better to be a specialist or a generalist?” — “Early in a career, I think a generalist has the edge (point), because you don't yet know which skills the market will reward (reason). My first job mixed support, sales and a little coding, and that mix is exactly how I discovered I loved product work (example). So: go broad first, then specialise once you know what you love (point).”",
      },
      {
        name: "Past – Present – Future",
        summary: "Ideal for questions about change, experience or plans.",
        steps: [
          { label: "Past", text: "How it used to be, or where you started." },
          { label: "Present", text: "Where things are now." },
          { label: "Future", text: "Where it's heading, or what you'd like to happen." },
        ],
      },
      {
        name: "What – So what – Now what",
        summary: "Good for updates and reflections: describe it, explain why it matters, say what happens next.",
        steps: [
          { label: "What", text: "The fact or situation." },
          { label: "So what", text: "Why it matters to this audience." },
          { label: "Now what", text: "The action or recommendation." },
        ],
      },
    ],
    sections: [
      {
        id: "first-seconds",
        heading: "The first five seconds",
        body: [
          "Most impromptu stumbles happen at the start, when you begin talking before you know your point. Instead: listen to the whole question, pause, choose your point, then speak your first sentence slowly.",
          "If you need a little more time, buy it honestly. Repeat or reframe the question (“So the question is whether…”), or give a short, true bridge (“That's a question I've thought about a lot”). Don't overuse it — one bridge is fine, three sound evasive.",
        ],
      },
      {
        id: "one-point",
        heading: "One point, fully developed",
        body: [
          "Under pressure, people tend to list many ideas quickly. Listeners remember very little of a list. A single clear point with one good example is more memorable and sounds more confident.",
          "Short-term memory can only hold a few items at once, which is one reason three is a natural maximum for spoken points — and one is often best for a 60-second answer.",
        ],
      },
      {
        id: "examples",
        heading: "Build an example bank",
        body: [
          "The “E” in PREP is where most people freeze. Solve it in advance: keep a list of 10–15 stories from your life and work — a success, a failure, a conflict, a time you learned something, a time you changed your mind. Most impromptu topics can be answered with one of them.",
        ],
        bullets: [
          "A time you solved a problem nobody else would touch",
          "A mistake and what it taught you",
          "A person who influenced you",
          "A decision you'd make differently now",
          "A moment you were proud of your team",
        ],
      },
      {
        id: "fillers",
        heading: "Replace fillers with pauses",
        body: [
          "“Um” and “uh” are a normal part of speech and sometimes even help listeners anticipate what's next. The problem is frequency: a filler every few words distracts and makes you sound unsure. The fix isn't to fight them — it's to get comfortable with silence. When you feel a filler coming, close your mouth and pause.",
        ],
      },
      {
        id: "ending",
        heading: "Stop on purpose",
        body: [
          "Weak impromptu answers trail off (“…so yeah, that's basically it”). Strong ones end deliberately: restate your point in one sentence, then stop and hold eye contact for a beat. That final line is what people remember.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Starting to talk before you have a point", fix: "Pause for two seconds and decide your first sentence." },
      { mistake: "Apologising (“I'm not prepared for this…”)", fix: "Skip it. Nobody expects a prepared speech; just answer." },
      { mistake: "Rambling through several ideas", fix: "Pick one point and develop it with one example." },
      { mistake: "Trailing off at the end", fix: "Restate your point, then stop." },
    ],
    drills: [
      { name: "Random-topic reps", how: "Get a random topic, give yourself 10 seconds, then speak for 60–90 seconds using PREP. JobReady's impromptu mode gives you a fresh topic every session." },
      { name: "Framework rotation", how: "Answer the same topic three times: once with PREP, once with Past–Present–Future, once with What–So what–Now what. Notice which fits best." },
      { name: "The filler freeze", how: "Record a 60-second answer and count fillers. Repeat the same topic, aiming to replace each one with a silent pause." },
    ],
    research: [
      { finding: "Listeners use “uh” and “um” as signals about upcoming speech, and “uh” in particular can help word recognition — fillers aren't inherently bad; frequency is the issue.", source: "Fox Tree, J. E. (2001). Listeners' uses of um and uh in speech comprehension. Memory & Cognition." },
      { finding: "Working memory holds roughly four chunks of information at a time, which is why a few well-organised points are easier to follow than a long list.", source: "Cowan, N. (2001). The magical number 4 in short-term memory. Behavioral and Brain Sciences." },
      { finding: "Telling yourself “I am excited” before a stressful speaking task, rather than trying to calm down, improved performance and made speakers feel more excited.", source: "Brooks, A. W. (2014). Get excited: Reappraising pre-performance anxiety as excitement. Journal of Experimental Psychology: General." },
      { finding: "People remember the first and last items of a sequence best (the serial-position effect) — which is why your opening line and final sentence carry so much weight.", source: "Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology." },
    ],
    faq: [
      { q: "How do I get better at impromptu speaking fast?", a: "Short, frequent practice with random topics. Ten one-minute answers spread over a week beat one long session, and a single go-to structure (like PREP) speeds everything up." },
      { q: "How long should an impromptu answer be?", a: "Usually 60–120 seconds. In meetings and interviews, shorter is often better — you can always add detail if asked." },
      { q: "What if my mind goes blank?", a: "Restate the question out loud, then use Past–Present–Future: almost anything can be answered by saying how it was, how it is and how it could be." },
    ],
  },

  // ---------------------------------------------------------------- Storytelling
  {
    slug: "storytelling",
    mode: "storytelling",
    label: "Storytelling",
    title: "Storytelling for Speakers: How to Tell a Story People Remember",
    description:
      "Tell stories that stick: the Story Spine, how to open in the middle of the action, using detail and dialogue, and what neuroscience says about why stories work.",
    keywords: ["storytelling tips", "how to tell a story", "story spine", "storytelling in presentations", "narrative structure"],
    readingMinutes: 8,
    accent: { tile: "bg-violet-600", soft: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300" },
    intro: [
      "Stories are how people have passed on knowledge for as long as there have been people. In a speech, an interview or a meeting, a good story makes an abstract point concrete and gives your listener something to hold on to long after the facts fade.",
      "You don't need dramatic material. Good stories come from ordinary moments told with a clear shape, specific detail and an honest point.",
    ],
    takeaways: [
      "Every story needs a character who wants something and an obstacle in the way.",
      "Start as close to the action as possible.",
      "Specific details (a name, a time, a sound) make a story feel real.",
      "Know your point before you start — and say it in one line at the end.",
    ],
    frameworks: [
      {
        name: "The Story Spine",
        summary: "An improv structure created by Kenn Adams and popularised by Pixar's story artists. It turns any memory into a story with a clear arc.",
        steps: [
          { label: "Once upon a time…", text: "Set the scene and the character (often you)." },
          { label: "Every day…", text: "The normal situation." },
          { label: "Until one day…", text: "The change or problem." },
          { label: "Because of that…", text: "What happened next (repeat this step one or two times)." },
          { label: "Until finally…", text: "The climax or turning point." },
          { label: "And ever since…", text: "How things changed — the lesson." },
        ],
        example: "“I used to dread team meetings (every day). Until one day our manager asked me to run one (until one day). Because of that I prepared an agenda for the first time, and because of that the meeting finished 20 minutes early (because of that). Until finally the team asked me to run them every week (until finally). Ever since, I've believed that structure is a kindness (and ever since).”",
      },
      {
        name: "Situation – Complication – Resolution",
        summary: "A tighter business version, useful in presentations and interviews.",
        steps: [
          { label: "Situation", text: "The context in one or two sentences." },
          { label: "Complication", text: "What went wrong or what was at stake." },
          { label: "Resolution", text: "What happened and what it taught you." },
        ],
      },
    ],
    sections: [
      {
        id: "start-in-the-middle",
        heading: "Start in the middle of the action",
        body: [
          "Skip the long set-up. Instead of “So, this was back in 2019 when I was working at a small company…”, try “The server went down at 4:55 on a Friday.” You can fill in the background once the listener is hooked.",
        ],
      },
      {
        id: "detail",
        heading: "Use specific, sensory detail",
        body: [
          "Detail is what makes a story feel true. Concrete words (the smell of burnt coffee, the blinking red light) are easier to picture and remember than abstract ones. Choose two or three vivid details, not twenty.",
          "Dialogue is another shortcut to vividness. “She looked at me and said, ‘You've got one hour'” is more gripping than “She told me there was a deadline.”",
        ],
      },
      {
        id: "stakes",
        heading: "Make the stakes clear",
        body: [
          "A story without an obstacle is just a report. Say what could have gone wrong and why it mattered to you. The listener leans in when they're not sure how it ends.",
        ],
      },
      {
        id: "point",
        heading: "Know your point — and say it",
        body: [
          "Before you tell a story, finish this sentence: “This story shows that…”. Then end the story with that line, in plain words. Without it, listeners may enjoy the story and miss why you told it.",
        ],
      },
      {
        id: "delivery",
        heading: "Delivery: slow down at the turning point",
        body: [
          "Speed up slightly through background, then slow down and lower your voice at the key moment. A pause just before the turning point builds anticipation. Relive the moment rather than recite it — your face and voice will follow.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Too much background", fix: "Start as late as possible; add context only when needed." },
      { mistake: "No obstacle", fix: "Name what was at stake and what stood in the way." },
      { mistake: "Being the flawless hero", fix: "Show a doubt or mistake — it makes you relatable and the success believable." },
      { mistake: "No point", fix: "End with one sentence that says what the story means." },
    ],
    drills: [
      { name: "Story in 60 seconds", how: "Tell a personal story using the Story Spine in exactly one minute. Then cut it to 30 seconds without losing the point." },
      { name: "Find the first line", how: "Write three different opening lines for the same story. Pick the one that starts closest to the action." },
      { name: "Detail upgrade", how: "Record a story, then retell it adding one sensory detail and one line of dialogue. Compare how it feels." },
    ],
    research: [
      { finding: "When a story was told and understood, the listener's brain activity mirrored the speaker's (with a slight delay), and stronger coupling predicted better comprehension.", source: "Stephens, G. J., Silbert, L. J., & Hasson, U. (2010). Speaker–listener neural coupling underlies successful communication. PNAS." },
      { finding: "Being absorbed in a narrative (“transportation”) changed readers' beliefs in line with the story.", source: "Green, M. C. & Brock, T. C. (2000). Journal of Personality and Social Psychology." },
      { finding: "Concrete words that evoke images are remembered better than abstract ones — part of the reason specific details make stories stick.", source: "Paivio, A. (1971). Imagery and Verbal Processes (dual-coding theory)." },
    ],
    faq: [
      { q: "How long should a story in a speech be?", a: "Often 60–90 seconds. In an interview, keep it under two minutes. The shorter it is, the more each detail has to earn its place." },
      { q: "Can I tell a story about failure?", a: "Yes — they're often the most engaging. Just make sure it ends with what you learned or changed." },
      { q: "What if my life isn't interesting enough?", a: "Small moments make great stories: a conversation, a mistake, a first day. Structure and detail matter far more than drama." },
    ],
  },

  // ---------------------------------------------------------------- Presentation
  {
    slug: "presentation-skills",
    mode: "presentation",
    label: "Presentation skills",
    title: "Presentation Skills: How to Structure and Deliver a Clear Presentation",
    description:
      "Plan, structure and deliver presentations people follow: the one-message rule, signposting, slide design backed by learning research, and handling Q&A.",
    keywords: ["presentation skills", "how to give a presentation", "presentation structure", "presentation tips", "slide design tips"],
    readingMinutes: 9,
    accent: { tile: "bg-sky-600", soft: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300" },
    intro: [
      "A presentation succeeds when the audience leaves understanding one thing clearly and knowing what to do with it. Most presentations fail not for lack of information but from too much of it, in no clear order.",
      "This guide covers how to decide your message, structure it so it's easy to follow, design slides that help instead of compete, and stay calm in Q&A.",
    ],
    takeaways: [
      "Write your key message in one sentence before you make a single slide.",
      "Tell people where you're going (signposting) — it measurably helps them follow.",
      "Slides support you; they are not your script.",
      "Plan for questions: prepare answers to the three you'd least like to get.",
    ],
    frameworks: [
      {
        name: "Tell – Show – Tell",
        summary: "The classic presentation structure, and it works because it uses the primacy and recency effects.",
        steps: [
          { label: "Tell them what you'll tell them", text: "Your key message and a roadmap of your 2–4 points." },
          { label: "Tell them", text: "Each point with its evidence or example, clearly signposted." },
          { label: "Tell them what you told them", text: "Summarise the message and the action you want." },
        ],
      },
      {
        name: "Answer first (the pyramid)",
        summary: "For busy or senior audiences: lead with your conclusion, then the supporting arguments, then the detail.",
        steps: [
          { label: "Answer", text: "Your recommendation or conclusion in one sentence." },
          { label: "Arguments", text: "Two to four reasons, in order of importance." },
          { label: "Evidence", text: "Data and examples behind each reason, as time allows." },
        ],
        example: "“I recommend we move support to a 24-hour chat model (answer). It cuts wait times, it's cheaper per ticket, and customers prefer it (arguments). Let me show you the numbers for each (evidence).”",
      },
    ],
    sections: [
      {
        id: "one-message",
        heading: "Start with one message",
        body: [
          "Ask yourself: if the audience remembers only one sentence, what should it be? Write it down. Every slide, story and number should support that sentence. If something doesn't, cut it or move it to an appendix.",
        ],
      },
      {
        id: "signposting",
        heading: "Signpost so people never get lost",
        body: [
          "Listeners can't scroll back. Help them with verbal signposts: “There are three reasons. The first…”, “That's the problem; now the solution”, “To sum up…”. Signalling the structure of material reliably improves how well people understand and remember it.",
        ],
      },
      {
        id: "slides",
        heading: "Slides that help, not compete",
        body: [
          "People can't read dense text and listen to you at the same time — the two channels compete. Research on multimedia learning shows people learn better when extraneous material is removed, and when narration is paired with graphics rather than with the same words on screen.",
        ],
        bullets: [
          "One idea per slide, with a headline that states the point (“Wait times halved after the change”), not a topic (“Wait times”).",
          "Prefer a chart, image or diagram over bullet points.",
          "Highlight the one number that matters instead of showing the whole table.",
          "Never read your slides aloud.",
        ],
      },
      {
        id: "delivery",
        heading: "Delivery essentials",
        body: [
          "Face the audience, not the screen. Pause when you change slides so people can look at the new one before you speak. Vary your pace and pitch — a flat delivery makes everything sound equally (un)important. Aim for a comfortable pace of roughly 120–160 words per minute.",
          "Rehearse out loud at least twice, including transitions between sections. Time yourself; most presentations run long.",
        ],
      },
      {
        id: "qa",
        heading: "Handling questions",
        body: [
          "Listen to the whole question, pause, and repeat or rephrase it so everyone hears it. Answer briefly, then check: “Does that answer your question?” If you don't know, say so and offer to follow up — it builds more trust than guessing.",
          "For hostile questions, find the reasonable concern underneath and answer that calmly.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Starting with the agenda slide and your bio", fix: "Start with why the topic matters to this audience." },
      { mistake: "Walls of text on slides", fix: "One idea per slide; put details in a handout." },
      { mistake: "Running over time", fix: "Rehearse with a timer and cut 10% before the day." },
      { mistake: "Ending on “Any questions?”", fix: "Take questions, then close with your one-sentence summary." },
    ],
    drills: [
      { name: "The elevator test", how: "Explain your whole presentation in 30 seconds. If you can't, your message isn't clear yet." },
      { name: "Headline-only run", how: "Present using only your slide headlines. If the story still makes sense, your structure works." },
      { name: "Explain it to a newcomer", how: "Explain a concept from your field to someone with no background (JobReady's presentation mode has topics for this)." },
    ],
    research: [
      { finding: "People learn better from presentations without extraneous words, pictures and sounds (coherence principle), and from graphics with narration rather than graphics with narration and identical on-screen text (redundancy principle).", source: "Mayer, R. E. (2009). Multimedia Learning (2nd ed.). Cambridge University Press." },
      { finding: "Highlighting the organisation of material (signalling) improves comprehension and transfer.", source: "Mayer, R. E. (2009), signalling principle; see also Mautone & Mayer (2001), Journal of Educational Psychology." },
      { finding: "Working memory is limited, and instruction that overloads it hinders learning — the basis of cognitive load theory.", source: "Sweller, J. (1988). Cognitive load during problem solving. Cognitive Science." },
      { finding: "Myth check: the popular claim that communication is “7% words, 38% tone, 55% body language” comes from narrow experiments about expressing feelings with single words; the researcher himself says it doesn't apply to ordinary communication.", source: "Mehrabian, A. (1971). Silent Messages, and the author's later clarifications." },
    ],
    faq: [
      { q: "How many slides should a 10-minute presentation have?", a: "There's no fixed rule, but 8–12 simple slides is common. Fewer, clearer slides beat many crowded ones." },
      { q: "How do I stop reading from my notes?", a: "Put only keywords on cards, rehearse out loud several times, and memorise just your first and last sentences." },
      { q: "How can I be less nervous before presenting?", a: "Rehearse aloud, arrive early, and try reframing nerves as excitement — telling yourself “I'm excited” has been shown to help performance." },
    ],
  },

  // ---------------------------------------------------------------- Debate
  {
    slug: "debate",
    mode: "debate",
    label: "Debate",
    title: "Debate Tips: How to Build an Argument and Win a Debate Respectfully",
    description:
      "Build arguments that hold up: claim–warrant–impact, four-step refutation, steelmanning, and staying calm and credible under pressure — with research on persuasion.",
    keywords: ["debate tips", "how to debate", "rebuttal", "four-step refutation", "argument structure"],
    readingMinutes: 8,
    accent: { tile: "bg-indigo-600", soft: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300" },
    intro: [
      "Debating well is less about talking over someone and more about clarity: making a claim, proving it, showing why it matters, and dealing fairly with the other side. Those same skills win arguments in meetings, negotiations and interviews.",
      "Here are the structures competitive debaters use, adapted for everyday practice.",
    ],
    takeaways: [
      "Every argument needs a claim, a reason (warrant) and an impact.",
      "Rebut the strongest version of the other side, not the weakest.",
      "Compare, don't just assert: explain why your side matters more.",
      "Calm beats loud. Credibility is your most valuable resource.",
    ],
    frameworks: [
      {
        name: "Claim – Warrant – Impact",
        summary: "The building block of any argument.",
        steps: [
          { label: "Claim", text: "What you're arguing, in one sentence." },
          { label: "Warrant", text: "Why it's true — the reasoning and evidence." },
          { label: "Impact", text: "Why it matters, and to whom." },
        ],
        example: "“Schools should teach financial literacy (claim), because most young adults make major money decisions — loans, rent, credit — with no training (warrant). Mistakes at that age can follow people for decades (impact).”",
      },
      {
        name: "Four-step refutation",
        summary: "A clear way to respond to an opponent's point.",
        steps: [
          { label: "They say…", text: "Summarise their argument fairly." },
          { label: "But…", text: "State your counter-claim." },
          { label: "Because…", text: "Give your reason or evidence." },
          { label: "Therefore…", text: "Explain why this means your side wins the point." },
        ],
      },
    ],
    sections: [
      {
        id: "choose-arguments",
        heading: "Choose two or three strong arguments",
        body: [
          "Brainstorm every argument for your side, then keep only the strongest two or three. Strength means: clear reasoning, evidence you can explain, and a real impact. Several weak arguments give your opponent several easy targets.",
        ],
      },
      {
        id: "steelman",
        heading: "Steelman the other side",
        body: [
          "Before you rebut, state the opposing view so well that its supporters would agree with your summary. It shows fairness, prevents you from attacking a straw man, and makes your rebuttal far more convincing to neutral listeners.",
        ],
      },
      {
        id: "weighing",
        heading: "Weigh and compare",
        body: [
          "Many debates are lost because each side just repeats its own points. Win by comparing: “Even if they're right that it costs more, our side protects more people, for longer.” Useful comparisons are scale (how many), probability (how likely), time (how soon, how long) and reversibility.",
        ],
      },
      {
        id: "composure",
        heading: "Stay composed",
        body: [
          "Keep your voice steady and your pace measured, especially when challenged. Concede small points gracefully (“That's a fair point, and…”) — it builds credibility for the points that matter. Avoid personal attacks; they convince no one who's undecided.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Attacking a weak version of the other argument", fix: "Steelman first, then respond." },
      { mistake: "Assertions without reasons", fix: "Add “because…” to every claim." },
      { mistake: "Ignoring the other side's best point", fix: "Address it head-on; silence looks like concession." },
      { mistake: "Getting louder when challenged", fix: "Slow down and lower your voice. Calm reads as confident." },
    ],
    drills: [
      { name: "Switch sides", how: "Argue one side for 90 seconds, then the other side on the same topic. JobReady's debate topics are built for this." },
      { name: "Rebuttal reps", how: "Write down one opposing claim and answer it using the four-step refutation in under 45 seconds." },
      { name: "Impact ladder", how: "Take a claim and keep asking “so what?” until you reach an impact your audience truly cares about." },
    ],
    research: [
      { finding: "Two-sided messages that refute the opposing view are more persuasive than one-sided ones.", source: "Allen, M. (1991). Western Journal of Speech Communication." },
      { finding: "Exposing people to weakened counterarguments in advance builds resistance to persuasion — prepare for your opponent's best points.", source: "McGuire, W. J. (1961) and subsequent inoculation-theory research." },
      { finding: "Arguments that are processed carefully produce more durable attitude change than those accepted because of surface cues like confidence.", source: "Petty, R. E. & Cacioppo, J. T. (1986). Elaboration Likelihood Model." },
    ],
    faq: [
      { q: "How do I win a debate if I'm not a confident speaker?", a: "Structure wins debates more often than style. Clear claims, reasons, comparisons and a calm voice will beat charisma without substance." },
      { q: "What should I do if I don't know the answer to a point?", a: "Acknowledge it, then pivot to why your strongest argument still outweighs it." },
      { q: "Is it OK to argue a side I don't agree with?", a: "Yes — it's one of the best exercises there is. It sharpens your reasoning and your understanding of other views." },
    ],
  },

  // ---------------------------------------------------------------- Pitch
  {
    slug: "elevator-pitch",
    mode: "pitch",
    label: "Elevator pitch",
    title: "How to Write and Deliver an Elevator Pitch (With Examples)",
    description:
      "Craft a 30–60 second elevator pitch that opens doors: a simple formula, examples for job seekers and founders, and why first impressions form so quickly.",
    keywords: ["elevator pitch", "elevator pitch examples", "how to pitch yourself", "60 second pitch", "personal pitch"],
    readingMinutes: 7,
    accent: { tile: "bg-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
    intro: [
      "An elevator pitch is a short, clear explanation of who you are, what you do and why it matters — delivered in the time of a short lift ride. Its goal isn't to close a deal; it's to earn the next conversation.",
      "Whether you're pitching yourself at a networking event, in an interview (“tell me about yourself”) or pitching an idea to an investor, the same principles apply.",
    ],
    takeaways: [
      "Aim for 30–60 seconds and around 100–150 words.",
      "Lead with the problem you solve, not your job title.",
      "Include one proof point: a result, number or example.",
      "End with a question or a clear next step.",
    ],
    frameworks: [
      {
        name: "Hook – Problem – Solution – Proof – Ask",
        summary: "A simple formula that works for people and products alike.",
        steps: [
          { label: "Hook", text: "One line that sparks interest." },
          { label: "Problem", text: "The problem you or your idea solves." },
          { label: "Solution", text: "What you do about it — in plain language." },
          { label: "Proof", text: "One concrete result, number or example." },
          { label: "Ask", text: "What you'd like next: a meeting, a referral, an introduction." },
        ],
        example: "“Most small clinics lose hours every week to missed appointments (problem). I'm a practice manager who fixes that with better booking systems (solution). At my last clinic, no-shows fell by a third in six months (proof). I'd love to hear how your team handles scheduling — do you have 15 minutes next week? (ask)”",
      },
      {
        name: "Present – Past – Future (for “tell me about yourself”)",
        summary: "The go-to structure for opening an interview.",
        steps: [
          { label: "Present", text: "What you do now and what you're good at." },
          { label: "Past", text: "The experience that got you here, with one highlight." },
          { label: "Future", text: "Why this role or opportunity is the natural next step." },
        ],
      },
    ],
    sections: [
      {
        id: "first-impression",
        heading: "First impressions form fast",
        body: [
          "Research on “thin slices” shows people form surprisingly consistent impressions from very brief exposure to someone's behaviour. You can't control everything in those seconds, but you can control a confident first sentence, a warm tone and eye contact.",
          "Beware the popular claim that people now have an “eight-second attention span, shorter than a goldfish” — it isn't backed by solid research. Attention depends on relevance: make your first line about something your listener cares about.",
        ],
      },
      {
        id: "plain-language",
        heading: "Use plain, specific language",
        body: [
          "Drop jargon and buzzwords (“synergistic”, “passionate go-getter”). Say what you actually do in words a friend would understand. Specific beats impressive: “I help nurses spend less time on paperwork” beats “I leverage healthcare technology solutions.”",
        ],
      },
      {
        id: "tailor",
        heading: "Tailor it to the listener",
        body: [
          "Have a core pitch, then adjust the hook and the ask for each audience: a recruiter, a potential client, a fellow attendee. The proof point you choose should be the one that matters most to them.",
        ],
      },
      {
        id: "deliver",
        heading: "Sound natural, not memorised",
        body: [
          "Know your pitch well enough to say it in different ways. Memorise the structure and the key phrases, not every word. Practise out loud until it feels like a conversation — then stop and listen to the other person.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Reciting your CV", fix: "Pick one highlight that matters to this listener." },
      { mistake: "Too long", fix: "Cut to 60 seconds; leave them wanting to ask more." },
      { mistake: "Jargon and buzzwords", fix: "Explain it as you would to a smart friend." },
      { mistake: "No ask", fix: "End with a question or a clear next step." },
    ],
    drills: [
      { name: "30-60-90", how: "Deliver your pitch in 90 seconds, then 60, then 30. The 30-second version shows you what really matters." },
      { name: "Three audiences", how: "Adapt the same pitch for a recruiter, a potential client and someone outside your industry." },
      { name: "Record and cut", how: "Record your pitch, transcribe it, and delete every word that doesn't add meaning. JobReady's pitch mode gives you fresh scenarios." },
    ],
    research: [
      { finding: "Observers' ratings of teachers based on silent video clips of 30 seconds or less predicted end-of-term student evaluations — impressions form quickly and tend to stick.", source: "Ambady, N. & Rosenthal, R. (1993). Half a minute: Predicting teacher evaluations from thin slices of nonverbal behavior. Journal of Personality and Social Psychology." },
      { finding: "People remember what comes first and last best, so your opening hook and final ask matter most.", source: "Murdock, B. B. (1962). The serial position effect of free recall." },
      { finding: "Concrete, imageable language is easier to remember than abstract language.", source: "Paivio, A. (1971). Imagery and Verbal Processes." },
    ],
    faq: [
      { q: "How long should an elevator pitch be?", a: "30 to 60 seconds, or roughly 100–150 words." },
      { q: "Should I memorise my elevator pitch?", a: "Memorise the structure and your first and last lines. Keep the middle flexible so it sounds natural." },
      { q: "Is “tell me about yourself” an elevator pitch?", a: "Essentially yes. Use Present–Past–Future and connect it to the role you're interviewing for." },
    ],
  },

  // ---------------------------------------------------------------- Interview
  {
    slug: "job-interview-answers",
    mode: null,
    label: "Job interview answers",
    title: "How to Answer Interview Questions: STAR Method and Expert Tips",
    description:
      "Answer interview questions with confidence: the STAR method with examples, how to handle common and tricky questions, and what research says interviewers value.",
    keywords: ["how to answer interview questions", "STAR method", "behavioral interview questions", "interview tips", "tell me about yourself"],
    readingMinutes: 9,
    accent: { tile: "bg-violet-600", soft: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300" },
    intro: [
      "A job interview is a structured conversation with one aim: helping the interviewer judge whether you can do the job and would do it well there. Your task is to make that judgement easy with clear, specific, honest evidence.",
      "Most interviewers now use structured, behavioural questions — “Tell me about a time when…” — because past behaviour is one of the better predictors of future performance. That's good news: it means preparation works.",
    ],
    takeaways: [
      "Use STAR for any “tell me about a time” question, and spend most of your time on the Action.",
      "Say “I”, not “we” — they're hiring you.",
      "Quantify results where you honestly can.",
      "Prepare 6–8 flexible stories that cover the job's key requirements.",
    ],
    frameworks: [
      {
        name: "The STAR method",
        summary: "The standard structure for behavioural interview answers.",
        steps: [
          { label: "Situation", text: "Brief context: where, when, what was going on (1–2 sentences)." },
          { label: "Task", text: "Your responsibility or the goal." },
          { label: "Action", text: "What you specifically did, step by step. This is the heart of the answer." },
          { label: "Result", text: "The outcome — with a number if possible — and what you learned." },
        ],
        example: "“Our clinic's patient waiting times had doubled over a winter (situation). As shift lead, I was asked to find a fix within a month (task). I mapped a week of appointments, found that two slots a day were double-booked by the old system, and worked with reception to set up a new booking rule and a daily check (action). Average waits fell from 40 to 18 minutes, and we kept the process after I moved teams (result).”",
      },
      {
        name: "CAR (Challenge – Action – Result)",
        summary: "A shorter STAR for quick answers or follow-up questions.",
        steps: [
          { label: "Challenge", text: "The problem you faced." },
          { label: "Action", text: "What you did." },
          { label: "Result", text: "What changed." },
        ],
      },
    ],
    sections: [
      {
        id: "prepare-stories",
        heading: "Prepare a story bank",
        body: [
          "Read the job description and list its five or six most important requirements. For each, prepare one real story using STAR. Many stories can be adapted to several questions — a project that went wrong can show problem-solving, resilience and teamwork.",
        ],
        bullets: [
          "A success you're proud of",
          "A mistake or failure and what you changed",
          "A conflict or disagreement you resolved",
          "A time you led or influenced others",
          "A time you learned something quickly",
          "A time you handled pressure or a deadline",
        ],
      },
      {
        id: "common-questions",
        heading: "Common questions and how to approach them",
        body: [
          "“Tell me about yourself”: use Present–Past–Future in about 60–90 seconds, ending with why this role fits.",
          "“What's your greatest weakness?”: pick a real, non-critical weakness and show what you're actively doing about it.",
          "“Why do you want to work here?”: be specific about the organisation — its work, values or customers — and connect it to your experience.",
          "“Where do you see yourself in five years?”: show ambition that fits the path this role offers.",
          "“Do you have any questions for us?”: always yes. Ask about the team, what success looks like in the first six months, or the biggest challenge in the role.",
        ],
      },
      {
        id: "length",
        heading: "Get the length right",
        body: [
          "Most answers land best at 60 seconds to two minutes. Shorter can feel thin; much longer loses the interviewer. Lead with the answer, give the evidence, and stop. If they want more, they'll ask — follow-up questions are a good sign.",
        ],
      },
      {
        id: "delivery",
        heading: "Delivery and body language",
        body: [
          "Pausing briefly before answering looks thoughtful. Keep a steady, natural eye line — looking away occasionally while thinking is normal, but frequent gaze aversion is often read less favourably. In video interviews, look at the camera when making key points and make sure your face is well lit and centred.",
        ],
      },
      {
        id: "honesty",
        heading: "Be honest and specific",
        body: [
          "Never invent experience or numbers. Interviewers probe details, and specificity is exactly what makes an answer credible. If you don't have direct experience, say so and describe the closest relevant example or how you'd approach it.",
        ],
      },
    ],
    mistakes: [
      { mistake: "Saying “we” throughout", fix: "Be clear about your own contribution." },
      { mistake: "Long situations, short actions", fix: "Keep context to two sentences; spend 60% of the answer on Action." },
      { mistake: "No result", fix: "Always finish with the outcome and what you learned." },
      { mistake: "Generic answers", fix: "Use real names of tools, numbers, and specific moments." },
    ],
    drills: [
      { name: "STAR in 90 seconds", how: "Answer one behavioural question out loud with a timer. Aim for 15 seconds of Situation/Task, 60 of Action, 15 of Result." },
      { name: "Role-matched practice", how: "Add a real job description to JobReady and practise interview questions generated from its requirements." },
      { name: "The follow-up drill", how: "After each answer, ask yourself “why?” and “how exactly?” — then answer those too. That's what good interviewers do." },
    ],
    research: [
      { finding: "Structured interviews — with consistent, job-related questions — predict job performance considerably better than unstructured ones.", source: "Schmidt, F. L. & Hunter, J. E. (1998). The validity and utility of selection methods in personnel psychology. Psychological Bulletin." },
      { finding: "Reviews of structured-interview research recommend behavioural and situational questions, which is why STAR-style preparation pays off.", source: "Levashina, J., Hartwell, C. J., Morgeson, F. P., & Campion, M. A. (2014). The structured employment interview. Personnel Psychology." },
      { finding: "In interview-style studies, speakers who averted their gaze were generally rated less favourably than those who kept a normal level of eye contact.", source: "Burgoon, J. K., Coker, D. A., & Coker, R. A. (1986). Communicative effects of gaze behavior. Human Communication Research." },
      { finding: "Reframing pre-interview nerves as excitement (“I'm excited”) improved performance in stressful speaking tasks.", source: "Brooks, A. W. (2014). Journal of Experimental Psychology: General." },
    ],
    faq: [
      { q: "How many STAR stories should I prepare?", a: "Six to eight flexible stories usually cover most behavioural questions for a role." },
      { q: "How long should an interview answer be?", a: "Usually 60 seconds to two minutes. Lead with your answer, then give your evidence." },
      { q: "What if I don't have work experience for a question?", a: "Use examples from study, volunteering or personal projects, and be clear about the context. Transferable examples count." },
    ],
  },
];

export const SPEECH_GUIDES = GUIDES.filter((g) => g.mode !== null);

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Evidence-based principles that apply to every kind of speaking (the /tips hub). */
export const UNIVERSAL_PRINCIPLES: { title: string; body: string }[] = [
  { title: "Know your one message", body: "Before anything else, write the one sentence you want people to remember. Everything you say should support it." },
  { title: "Structure is kindness", body: "Listeners can't re-read. Signposts (“three reasons… first…”) help them follow and remember." },
  { title: "Pause instead of filling", body: "A silent pause sounds confident. Frequent “um”s and “like”s make you sound unsure." },
  { title: "Vary your pace and pitch", body: "Slow down and lower your voice for key points. A monotone makes everything sound equally unimportant." },
  { title: "Be concrete", body: "Specific examples, names and numbers are easier to picture and remember than abstractions." },
  { title: "Open and close deliberately", body: "People remember beginnings and endings best. Plan your first and last sentences word for word." },
  { title: "Reframe nerves as excitement", body: "Nervousness and excitement feel similar in the body. Telling yourself “I'm excited” can improve performance." },
  { title: "Practise out loud, often", body: "Short, frequent spoken practice beats silent reading or one long rehearsal. Record yourself and listen back." },
];

export const HUB_RESEARCH: Research[] = [
  { finding: "Reappraising anxiety as excitement before a public speech improved speakers' performance ratings and made them feel more excited.", source: "Brooks, A. W. (2014). Journal of Experimental Psychology: General." },
  { finding: "When communication succeeds, the listener's brain activity couples with the speaker's; stronger coupling predicted better understanding.", source: "Stephens, Silbert & Hasson (2010). PNAS." },
  { finding: "Spreading practice over time produces better long-term retention than cramming the same amount into one session.", source: "Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin." },
  { finding: "Working memory holds only about four chunks at once — keep spoken points few and clearly grouped.", source: "Cowan, N. (2001). Behavioral and Brain Sciences." },
  { finding: "Myth: “93% of communication is non-verbal.” The 7-38-55 figures come from narrow studies of single words expressing feelings and don't apply to speeches or interviews.", source: "Mehrabian, A. (1971). Silent Messages, and later clarifications by the author." },
];
