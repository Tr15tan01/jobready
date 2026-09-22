export const locales = ["en", "ka", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "jobready_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Translations are hardcoded directly in this file rather than loaded
 * from external JSON dictionaries. Add a new key to every locale block
 * below at the same time so the three languages never drift apart.
 */
export const dictionaries = {
  en: {
    nav: {
      dashboard: "Dashboard",
      resume: "Resume",
      jobs: "Jobs",
      interview: "Interview Practice",
      progress: "Progress",
      learningPlan: "Learning Plan",
      settings: "Settings",
      login: "Log in",
      signup: "Sign up",
    },
    landing: {
      heroTitle: "Prepare smarter. Interview better. Get hired.",
      heroSubtitle:
        "JobReady analyzes your resume, matches it to real job descriptions, and coaches you through realistic AI-led practice interviews.",
      ctaPrimary: "Analyze my resume",
      ctaSecondary: "Practice an interview",
      howItWorks: "How it works",
      resumeOptimization: "Resume optimization",
      jobMatching: "Job matching",
      interviewPractice: "AI interview practice",
      videoCoaching: "Video coaching",
      speechCoaching: "Speech & language coaching",
      progressTracking: "Progress tracking",
      pricing: "Pricing",
      privacy: "Privacy",
      faq: "FAQ",
      finalCtaTitle: "Your next interview starts here.",
    },
    resume: {
      title: "Resume",
      upload: "Upload resume",
      uploadHint: "PDF, DOCX or TXT",
      improveWithAI: "Improve with AI",
      accept: "Accept",
      reject: "Reject",
      summary: "Summary",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
      versions: "Versions",
      tailorForJob: "Tailor for a job",
      informationNotProvided: "Information not provided.",
      noResumesYet: "No resumes yet. Upload one to get started.",
      makePrimary: "Make primary",
      primary: "Primary",
      delete: "Delete",
      uploading: "Uploading...",
    },
  },
  ka: {
    nav: {
      dashboard: "დაფა",
      resume: "რეზიუმე",
      jobs: "ვაკანსიები",
      interview: "გასაუბრების ვარჯიში",
      progress: "პროგრესი",
      learningPlan: "სასწავლო გეგმა",
      settings: "პარამეტრები",
      login: "შესვლა",
      signup: "რეგისტრაცია",
    },
    landing: {
      heroTitle: "მოემზადე ჭკვიანურად. გაიარე გასაუბრება წარმატებით.",
      heroSubtitle:
        "JobReady აანალიზებს თქვენს რეზიუმეს, შეუსაბამებს რეალურ ვაკანსიებს და გამოგიმუშავებთ AI-ზე დაფუძნებული პრაქტიკული გასაუბრებებით.",
      ctaPrimary: "გაანალიზე ჩემი რეზიუმე",
      ctaSecondary: "ივარჯიშე გასაუბრებაში",
      howItWorks: "როგორ მუშაობს",
      resumeOptimization: "რეზიუმეს ოპტიმიზაცია",
      jobMatching: "ვაკანსიის შესაბამისობა",
      interviewPractice: "AI გასაუბრების ვარჯიში",
      videoCoaching: "ვიდეო კოუჩინგი",
      speechCoaching: "მეტყველებისა და ენის კოუჩინგი",
      progressTracking: "პროგრესის თვალყურის დევნება",
      pricing: "ფასები",
      privacy: "კონფიდენციალურობა",
      faq: "ხშირად დასმული კითხვები",
      finalCtaTitle: "თქვენი შემდეგი გასაუბრება იწყება აქ.",
    },
    resume: {
      title: "რეზიუმე",
      upload: "რეზიუმეს ატვირთვა",
      uploadHint: "PDF, DOCX ან TXT",
      improveWithAI: "გაუმჯობესება AI-ით",
      accept: "მიღება",
      reject: "უარყოფა",
      summary: "შეჯამება",
      experience: "გამოცდილება",
      education: "განათლება",
      skills: "უნარები",
      versions: "ვერსიები",
      tailorForJob: "მორგება ვაკანსიაზე",
      informationNotProvided: "ინფორმაცია არ არის მოწოდებული.",
      noResumesYet: "ჯერ არ გაქვთ რეზიუმე. ატვირთეთ დასაწყებად.",
      makePrimary: "მთავარად დაყენება",
      primary: "მთავარი",
      delete: "წაშლა",
      uploading: "იტვირთება...",
    },
  },
  es: {
    nav: {
      dashboard: "Panel",
      resume: "Currículum",
      jobs: "Empleos",
      interview: "Práctica de entrevista",
      progress: "Progreso",
      learningPlan: "Plan de aprendizaje",
      settings: "Configuración",
      login: "Iniciar sesión",
      signup: "Registrarse",
    },
    landing: {
      heroTitle: "Prepárate mejor. Entrevista mejor. Consigue el empleo.",
      heroSubtitle:
        "JobReady analiza tu currículum, lo compara con ofertas de empleo reales y te prepara con entrevistas de práctica realistas guiadas por IA.",
      ctaPrimary: "Analizar mi currículum",
      ctaSecondary: "Practicar una entrevista",
      howItWorks: "Cómo funciona",
      resumeOptimization: "Optimización de currículum",
      jobMatching: "Coincidencia de empleo",
      interviewPractice: "Práctica de entrevista con IA",
      videoCoaching: "Coaching en video",
      speechCoaching: "Coaching de habla e idioma",
      progressTracking: "Seguimiento de progreso",
      pricing: "Precios",
      privacy: "Privacidad",
      faq: "Preguntas frecuentes",
      finalCtaTitle: "Tu próxima entrevista empieza aquí.",
    },
    resume: {
      title: "Currículum",
      upload: "Subir currículum",
      uploadHint: "PDF, DOCX o TXT",
      improveWithAI: "Mejorar con IA",
      accept: "Aceptar",
      reject: "Rechazar",
      summary: "Resumen",
      experience: "Experiencia",
      education: "Educación",
      skills: "Habilidades",
      versions: "Versiones",
      tailorForJob: "Adaptar a un empleo",
      informationNotProvided: "Información no proporcionada.",
      noResumesYet: "Aún no hay currículums. Sube uno para empezar.",
      makePrimary: "Marcar como principal",
      primary: "Principal",
      delete: "Eliminar",
      uploading: "Subiendo...",
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
