"""
Curated example job descriptions, so a new user's Jobs page isn't empty
and they can try matching without first hunting for a real posting.

Deliberately spans many professions, not just software — the matcher and
interviewer are profession-neutral, and the examples should show that.

Static data, not AI-generated: browsing costs nothing. AI only runs when
a user analyses one, and job extraction is cached by description hash,
so each example is only ever extracted once across ALL users.
"""

EXAMPLE_JOBS = [
    {
        "id": "swe-backend",
        "title": "Backend Software Engineer",
        "company": "Example Fintech Co.",
        "category": "Technology",
        "seniority": "Mid-level",
        "location": "Remote",
        "description": """We're hiring a Backend Software Engineer to build and scale our payments platform.

Responsibilities:
- Design, build and maintain REST APIs serving millions of requests per day
- Own services end-to-end, from design through deployment and on-call
- Collaborate with product and frontend engineers on new features
- Improve reliability, observability and performance of existing systems

Required:
- 3+ years of professional backend development experience
- Strong proficiency in Python or Node.js
- Experience with PostgreSQL or another relational database
- Solid understanding of REST API design

Preferred:
- Experience with Docker and Kubernetes
- Familiarity with AWS or GCP
- Background in payments or financial services""",
    },
    {
        "id": "clinical-psych",
        "title": "Clinical Psychologist",
        "company": "Example Community Health Centre",
        "category": "Healthcare",
        "seniority": "Mid-level",
        "location": "On-site",
        "description": """We are seeking a Clinical Psychologist to join our multidisciplinary mental health team.

Responsibilities:
- Conduct psychological assessments and diagnostic evaluations
- Deliver evidence-based individual and group therapy
- Develop and review treatment plans in collaboration with psychiatrists and social workers
- Carry out risk assessments and safety planning
- Maintain accurate, confidential clinical records

Required:
- Doctorate in Clinical Psychology
- Current licensure / registration to practise
- Experience delivering CBT and other evidence-based interventions
- Strong knowledge of DSM-5 diagnostic criteria

Preferred:
- Experience with trauma-informed care
- Clinical supervision experience
- Bilingual ability""",
    },
    {
        "id": "architect",
        "title": "Project Architect",
        "company": "Example Design Studio",
        "category": "Architecture & Design",
        "seniority": "Senior",
        "location": "Hybrid",
        "description": """Our studio is looking for a Project Architect to lead residential and mixed-use projects.

Responsibilities:
- Lead projects from concept design through construction administration
- Produce and coordinate construction documentation
- Ensure designs comply with building codes and zoning regulations
- Coordinate with engineers, consultants and contractors
- Present design proposals to clients

Required:
- Professional degree in Architecture
- 5+ years of practice experience
- Proficiency in Revit and AutoCAD
- Strong knowledge of building codes

Preferred:
- Licensed / registered architect
- LEED accreditation
- Experience with sustainable design""",
    },
    {
        "id": "product-manager",
        "title": "Product Manager",
        "company": "Example SaaS Startup",
        "category": "Product & Business",
        "seniority": "Mid-level",
        "location": "Remote",
        "description": """We're looking for a Product Manager to own our core collaboration features.

Responsibilities:
- Define product vision, strategy and roadmap for your area
- Gather and prioritise requirements from customers and stakeholders
- Work closely with engineering and design to ship features
- Define success metrics and analyse product performance
- Run user research and discovery

Required:
- 3+ years of product management experience
- Track record of shipping customer-facing products
- Strong analytical and communication skills
- Experience working with cross-functional teams

Preferred:
- Experience with B2B SaaS
- Familiarity with SQL or product analytics tools
- Technical background""",
    },
    {
        "id": "registered-nurse",
        "title": "Registered Nurse — Emergency Department",
        "company": "Example General Hospital",
        "category": "Healthcare",
        "seniority": "Mid-level",
        "location": "On-site",
        "description": """Join our Emergency Department as a Registered Nurse.

Responsibilities:
- Assess, triage and prioritise patients presenting to the emergency department
- Administer medications and treatments as prescribed
- Monitor patient condition and respond to deterioration
- Educate patients and families on care and discharge
- Work within a fast-paced multidisciplinary team

Required:
- Registered Nurse licence
- 2+ years of acute care experience
- BLS and ACLS certification
- Strong clinical assessment skills

Preferred:
- Emergency or critical care experience
- Trauma nursing certification
- Experience with electronic health record systems""",
    },
    {
        "id": "marketing-manager",
        "title": "Marketing Manager",
        "company": "Example Consumer Brand",
        "category": "Marketing & Sales",
        "seniority": "Mid-level",
        "location": "Hybrid",
        "description": """We're hiring a Marketing Manager to grow our direct-to-consumer brand.

Responsibilities:
- Plan and execute multi-channel marketing campaigns
- Manage paid social and search budgets
- Analyse campaign performance and optimise for ROI
- Collaborate with creative and content teams
- Manage relationships with agencies and partners

Required:
- 4+ years of marketing experience
- Hands-on experience with paid social and search advertising
- Strong analytical skills and comfort with marketing analytics tools
- Excellent written communication

Preferred:
- Direct-to-consumer or e-commerce experience
- Experience with marketing automation platforms
- Team management experience""",
    },
    {
        "id": "teacher",
        "title": "Secondary School Mathematics Teacher",
        "company": "Example Academy",
        "category": "Education",
        "seniority": "Entry to Mid-level",
        "location": "On-site",
        "description": """We are looking for an enthusiastic Mathematics Teacher for students aged 11–18.

Responsibilities:
- Plan and deliver engaging mathematics lessons across key stages
- Assess student progress and provide constructive feedback
- Differentiate instruction to support students of all abilities
- Communicate regularly with parents and guardians
- Contribute to the wider life of the school

Required:
- Degree in Mathematics or a closely related subject
- Recognised teaching qualification
- Strong subject knowledge and classroom management skills

Preferred:
- Experience teaching exam-level classes
- Experience supporting students with additional learning needs
- Ability to contribute to extracurricular activities""",
    },
    {
        "id": "data-analyst",
        "title": "Data Analyst",
        "company": "Example Retail Group",
        "category": "Technology",
        "seniority": "Entry to Mid-level",
        "location": "Hybrid",
        "description": """We're hiring a Data Analyst to turn sales and customer data into decisions.

Responsibilities:
- Build and maintain dashboards and recurring reports
- Analyse sales, customer and operational data to find trends
- Present findings and recommendations to non-technical stakeholders
- Ensure data accuracy and consistency across sources

Required:
- 1+ years of experience in a data or analytics role
- Strong SQL skills
- Experience with a BI tool such as Tableau or Power BI
- Excellent Excel skills

Preferred:
- Experience with Python or R
- Retail or e-commerce background
- Understanding of basic statistics""",
    },
]



def _job(id, title, company, category, seniority, location, intro, duties, required, preferred):
    """Builds a posting in the same shape as the ones above, so the
    requirement extractor sees a consistent structure."""
    bullets = lambda items: "\n".join(f"- {i}" for i in items)
    return {
        "id": id, "title": title, "company": company, "category": category,
        "seniority": seniority, "location": location,
        "description": f"{intro}\n\nResponsibilities:\n{bullets(duties)}\n\n"
                       f"Required:\n{bullets(required)}\n\nPreferred:\n{bullets(preferred)}",
    }


EXAMPLE_JOBS.extend([
    _job("frontend-dev", "Frontend Developer", "Example Media Co.", "Technology", "Mid-level", "Remote",
         "We're hiring a Frontend Developer to build fast, accessible web experiences.",
         ["Build responsive UI components in React and TypeScript", "Collaborate with designers on interaction details",
          "Improve performance and Core Web Vitals", "Write tests and review code"],
         ["3+ years building production web apps", "Strong React and TypeScript", "Solid HTML, CSS and accessibility knowledge"],
         ["Experience with Next.js", "Design system experience", "Testing with Playwright or Cypress"]),
    _job("devops", "DevOps Engineer", "Example Cloud Services", "Technology", "Senior", "Remote",
         "Join our platform team to keep our infrastructure reliable, secure and automated.",
         ["Maintain CI/CD pipelines", "Manage cloud infrastructure as code", "Own monitoring, alerting and incident response",
          "Improve deployment speed and reliability"],
         ["5+ years in DevOps or SRE roles", "Experience with AWS or GCP", "Terraform or similar IaC tools", "Linux and scripting skills"],
         ["Kubernetes in production", "Security or compliance background", "On-call leadership"]),
    _job("ux-designer", "UX/UI Designer", "Example Travel App", "Architecture & Design", "Mid-level", "Hybrid",
         "We're looking for a UX/UI Designer to shape how millions of travellers plan their trips.",
         ["Run user research and usability tests", "Create wireframes, prototypes and high-fidelity designs",
          "Maintain and extend our design system", "Partner with product and engineering through delivery"],
         ["3+ years of product design experience", "Strong portfolio of shipped work", "Proficiency in Figma"],
         ["Mobile app design experience", "Accessibility expertise", "Basic HTML/CSS knowledge"]),
    _job("accountant", "Staff Accountant", "Example Manufacturing Ltd", "Finance & Legal", "Entry to Mid-level", "On-site",
         "Our finance team needs a Staff Accountant to support month-end close and reporting.",
         ["Prepare journal entries and account reconciliations", "Support month-end and year-end close",
          "Assist with audits and tax filings", "Maintain accurate general ledger records"],
         ["Degree in Accounting or Finance", "1+ years of accounting experience", "Strong Excel skills", "Knowledge of GAAP or IFRS"],
         ["CPA or ACCA (or progressing)", "ERP experience such as SAP or NetSuite", "Manufacturing industry background"]),
    _job("financial-analyst", "Financial Analyst", "Example Investment Group", "Finance & Legal", "Mid-level", "Hybrid",
         "We're hiring a Financial Analyst to drive planning, forecasting and business insight.",
         ["Build and maintain financial models", "Lead budgeting and forecasting cycles",
          "Analyse variances and explain drivers to leadership", "Prepare board and management reports"],
         ["2+ years in FP&A or financial analysis", "Advanced Excel and financial modelling", "Strong communication skills"],
         ["CFA or MBA", "SQL or BI tool experience", "SaaS metrics knowledge"]),
    _job("paralegal", "Paralegal", "Example Law Partners", "Finance & Legal", "Entry to Mid-level", "On-site",
         "A busy litigation practice is seeking a detail-oriented Paralegal.",
         ["Draft and proofread legal documents", "Conduct legal research", "Organise case files and discovery materials",
          "Coordinate filings and court deadlines"],
         ["Paralegal certificate or relevant degree", "Excellent writing and organisation", "Confidentiality and attention to detail"],
         ["Litigation experience", "E-discovery software experience", "Second language"]),
    _job("hr-generalist", "HR Generalist", "Example Logistics Group", "Operations", "Mid-level", "Hybrid",
         "We're looking for an HR Generalist to support a growing workforce across several sites.",
         ["Manage the employee lifecycle from onboarding to exit", "Advise managers on employee relations",
          "Support recruitment and HR policy", "Maintain HR records and reporting"],
         ["3+ years in an HR role", "Knowledge of employment law", "Strong interpersonal skills"],
         ["HR certification (e.g. CIPD or SHRM)", "HRIS experience", "Multi-site experience"]),
    _job("project-manager", "Project Manager", "Example Construction Co.", "Operations", "Senior", "On-site",
         "Lead commercial construction projects from planning through handover.",
         ["Plan schedules, budgets and resources", "Coordinate subcontractors and suppliers",
          "Manage risks, changes and client communication", "Ensure safety and quality standards are met"],
         ["5+ years of project management experience", "Construction industry background", "Strong budgeting and scheduling skills"],
         ["PMP or PRINCE2 certification", "Experience with MS Project or Primavera", "Degree in engineering or construction management"]),
    _job("sales-rep", "Account Executive", "Example Software Inc.", "Marketing & Sales", "Mid-level", "Remote",
         "We're hiring an Account Executive to win new mid-market customers.",
         ["Run the full sales cycle from discovery to close", "Build and manage a healthy pipeline",
          "Deliver product demos tailored to buyer needs", "Forecast accurately in the CRM"],
         ["2+ years of B2B sales experience", "Track record of meeting quota", "Excellent communication and negotiation"],
         ["SaaS sales experience", "Salesforce or HubSpot experience", "Consultative selling training"]),
    _job("content-writer", "Content Writer", "Example Wellness Brand", "Marketing & Sales", "Entry to Mid-level", "Remote",
         "Join our content team to write articles, emails and campaigns people actually want to read.",
         ["Write blog posts, newsletters and web copy", "Research topics and interview subject experts",
          "Optimise content for search", "Edit and proofread team content"],
         ["Strong portfolio of published writing", "Excellent grammar and style", "Ability to meet deadlines"],
         ["SEO experience", "Health or wellness background", "CMS experience such as WordPress"]),
    _job("support-specialist", "Customer Support Specialist", "Example E-commerce Co.", "Customer Service", "Entry-level", "Remote",
         "Help our customers by resolving questions quickly and kindly.",
         ["Respond to customer enquiries by chat, email and phone", "Troubleshoot orders, payments and account issues",
          "Log feedback and escalate recurring problems", "Keep help articles up to date"],
         ["Excellent written and spoken communication", "Patience and a problem-solving mindset", "Comfort with help desk tools"],
         ["Previous customer service experience", "Zendesk or Intercom experience", "Additional languages"]),
    _job("pharmacist", "Community Pharmacist", "Example Pharmacy Chain", "Healthcare", "Mid-level", "On-site",
         "We're seeking a Community Pharmacist to deliver safe, patient-centred care.",
         ["Dispense medications accurately and safely", "Counsel patients on medicines and side effects",
          "Provide vaccinations and health checks", "Supervise pharmacy technicians"],
         ["Pharmacy degree and current registration", "Strong clinical knowledge", "Excellent patient communication"],
         ["Vaccination certification", "Community pharmacy experience", "Management experience"]),
    _job("physiotherapist", "Physiotherapist", "Example Sports Clinic", "Healthcare", "Mid-level", "On-site",
         "Join our clinic to help patients recover from injury and move better.",
         ["Assess and diagnose musculoskeletal conditions", "Design and deliver treatment plans",
          "Track patient progress and adjust care", "Educate patients on injury prevention"],
         ["Degree in Physiotherapy and current registration", "2+ years of clinical experience", "Strong assessment skills"],
         ["Sports injury experience", "Dry needling or manual therapy certification", "Experience with rehabilitation software"]),
    _job("civil-engineer", "Civil Engineer", "Example Infrastructure Group", "Architecture & Design", "Mid-level", "Hybrid",
         "We're hiring a Civil Engineer for road and drainage infrastructure projects.",
         ["Design civil infrastructure to relevant standards", "Prepare drawings, specifications and calculations",
          "Carry out site inspections", "Coordinate with contractors and local authorities"],
         ["Degree in Civil Engineering", "3+ years of design experience", "Proficiency in AutoCAD or Civil 3D"],
         ["Chartered or professional engineer status", "Drainage modelling experience", "Project management skills"]),
    _job("chef", "Sous Chef", "Example Restaurant Group", "Hospitality", "Mid-level", "On-site",
         "Our busy restaurant is looking for a Sous Chef to lead the kitchen alongside the Head Chef.",
         ["Run kitchen service and supervise the team", "Maintain food quality and presentation standards",
          "Manage ordering, stock and waste", "Uphold food safety and hygiene"],
         ["3+ years in a professional kitchen", "Supervisory experience", "Food safety certification"],
         ["Fine dining experience", "Menu development experience", "Culinary qualification"]),
    _job("social-worker", "Social Worker", "Example Family Services", "Healthcare", "Mid-level", "Hybrid",
         "Support children and families through assessment, planning and practical help.",
         ["Carry out family assessments", "Develop and review support plans", "Work with schools, health and police partners",
          "Keep thorough, timely case records"],
         ["Social Work degree and registration", "Understanding of safeguarding", "Strong communication and resilience"],
         ["Child protection experience", "Court report writing", "Driving licence"]),
])

# ---- More roles across fields (added in v24) --------------------------------
EXAMPLE_JOBS.extend([
    # Technology
    _job("data-engineer", "Data Engineer", "Example Retail Analytics", "Technology", "Mid-level", "Hybrid",
         "Build the pipelines that turn raw sales data into trusted reporting.",
         ["Design and maintain batch and streaming data pipelines", "Model data for analytics and reporting",
          "Monitor data quality and fix failures", "Partner with analysts on new data sources"],
         ["3+ years building data pipelines", "Strong SQL and Python", "Experience with a cloud data warehouse"],
         ["Airflow or dbt experience", "Streaming tools such as Kafka", "Retail domain knowledge"]),
    _job("mobile-dev", "Mobile Developer (iOS/Android)", "Example Fitness App", "Technology", "Mid-level", "Remote",
         "Help millions of people move more by building our mobile app.",
         ["Build features in React Native or native Swift/Kotlin", "Ship to the App Store and Google Play",
          "Improve performance and crash-free rates", "Work closely with design and product"],
         ["3+ years of mobile development", "A published app you contributed to", "Solid understanding of mobile UX"],
         ["Health or fitness app experience", "Offline-first architecture", "Automated testing on mobile"]),
    _job("it-support", "IT Support Technician", "Example Accounting Firm", "Technology", "Entry-level", "On-site",
         "Keep our 120 staff productive by solving their technology problems quickly and kindly.",
         ["Respond to helpdesk tickets by phone, chat and in person", "Set up laptops, accounts and phones for new starters",
          "Troubleshoot Windows, Microsoft 365 and printers", "Document fixes in the knowledge base"],
         ["1+ year in IT support or a relevant qualification", "Good Windows and Microsoft 365 knowledge", "Patient, clear communicator"],
         ["CompTIA A+ or similar", "Experience with Intune or Active Directory", "Basic networking knowledge"]),
    _job("security-analyst", "Cybersecurity Analyst", "Example Health Network", "Technology", "Mid-level", "Hybrid",
         "Protect patient data by detecting and responding to security threats.",
         ["Monitor alerts in our SIEM and investigate incidents", "Run vulnerability scans and track remediation",
          "Contribute to security awareness training", "Write clear incident reports"],
         ["2+ years in a security operations role", "Knowledge of common attack techniques", "Experience with SIEM tools"],
         ["Security+ or similar certification", "Healthcare compliance experience", "Scripting in Python or PowerShell"]),
    _job("qa-engineer", "QA Engineer", "Example Travel Platform", "Technology", "Mid-level", "Remote",
         "Make sure every release is something we're proud of.",
         ["Plan and run manual and automated tests", "Build and maintain end-to-end test suites",
          "Report bugs clearly and verify fixes", "Champion quality across the team"],
         ["2+ years in software testing", "Experience with an automation framework", "Strong attention to detail"],
         ["Playwright or Cypress", "API testing experience", "Performance testing"]),
    # Healthcare
    _job("medical-receptionist", "Medical Receptionist", "Example Family Practice", "Healthcare", "Entry-level", "On-site",
         "Be the welcoming first contact for patients at a busy family practice.",
         ["Greet patients and manage check-in", "Book and reschedule appointments", "Answer phone and email enquiries",
          "Keep patient records accurate and confidential"],
         ["Customer-facing experience", "Good computer skills", "Calm under pressure"],
         ["Medical practice software experience", "Knowledge of medical terminology", "A second language"]),
    _job("dental-hygienist", "Dental Hygienist", "Example Dental Studio", "Healthcare", "Mid-level", "On-site",
         "Help patients keep healthy smiles in a modern, friendly practice.",
         ["Carry out cleanings and periodontal assessments", "Take and review dental X-rays",
          "Educate patients on oral hygiene", "Keep accurate clinical notes"],
         ["Dental hygiene qualification and registration", "Clinical experience", "Excellent patient care skills"],
         ["Experience with nervous patients", "Whitening or orthodontic hygiene experience", "Practice software knowledge"]),
    _job("paramedic", "Paramedic", "Example Ambulance Service", "Healthcare", "Mid-level", "On-site",
         "Deliver emergency care where it's needed most.",
         ["Respond to emergency calls and assess patients", "Provide advanced life support and treatment",
          "Make safe decisions on transport and referral", "Hand over clearly to hospital teams"],
         ["Paramedic qualification and registration", "Full driving licence", "Resilience in high-pressure situations"],
         ["Critical care experience", "Mentoring student paramedics", "Major incident training"]),
    _job("care-assistant", "Care Assistant", "Example Care Homes", "Healthcare", "Entry-level", "On-site",
         "Make a real difference to older people's daily lives. Full training provided.",
         ["Support residents with personal care and daily activities", "Help at mealtimes and with mobility",
          "Notice and report changes in residents' wellbeing", "Keep care records up to date"],
         ["Kindness, patience and reliability", "Willingness to work shifts", "Good spoken and written communication"],
         ["Care certificate or NVQ", "Dementia care experience", "First aid training"]),
    _job("occupational-therapist", "Occupational Therapist", "Example Rehabilitation Hospital", "Healthcare", "Mid-level", "On-site",
         "Help patients regain independence after illness or injury.",
         ["Assess patients' daily living and functional needs", "Design and deliver therapy programmes",
          "Recommend equipment and home adaptations", "Plan safe discharges with the team"],
         ["Occupational therapy degree and registration", "Clinical placement or work experience", "Strong assessment skills"],
         ["Neurological rehabilitation experience", "Home visit experience", "Driving licence"]),
    # Education
    _job("early-years", "Early Years Teacher", "Example Nursery School", "Education", "Mid-level", "On-site",
         "Inspire curiosity in children aged 3–5 through play-based learning.",
         ["Plan and deliver play-based activities", "Observe and record each child's progress",
          "Build warm relationships with families", "Keep a safe, stimulating environment"],
         ["Early years teaching qualification", "Safeguarding knowledge", "Creativity and patience"],
         ["Special educational needs experience", "Outdoor learning experience", "A second language"]),
    _job("university-lecturer", "University Lecturer in Business", "Example University", "Education", "Senior", "Hybrid",
         "Teach and research in our growing business school.",
         ["Design and deliver undergraduate and postgraduate modules", "Supervise student projects and dissertations",
          "Publish research in your field", "Contribute to curriculum development"],
         ["PhD (or near completion) in a business discipline", "Teaching experience in higher education", "A research track record"],
         ["Industry experience", "Online teaching experience", "Success winning research funding"]),
    _job("tutor", "Maths and Science Tutor", "Example Learning Centre", "Education", "Entry to Mid-level", "Hybrid",
         "Help students aged 11–18 build confidence and exam results in maths and science.",
         ["Run one-to-one and small-group sessions", "Assess students' gaps and set goals",
          "Prepare practice materials", "Report progress to parents"],
         ["Degree in a STEM subject", "Strong explaining skills", "Reliability and patience"],
         ["Tutoring or teaching experience", "Exam board knowledge", "Online tutoring tools"]),
    _job("instructional-designer", "Instructional Designer", "Example Corporate Academy", "Education", "Mid-level", "Remote",
         "Design online training that people actually finish and remember.",
         ["Work with experts to define learning goals", "Script and build e-learning modules",
          "Measure course effectiveness", "Keep content accessible and up to date"],
         ["2+ years in instructional or learning design", "Experience with an authoring tool", "Clear writing"],
         ["Articulate Storyline or Rise", "Video editing", "Learning analytics"]),
    # Finance & Legal
    _job("bookkeeper", "Bookkeeper", "Example Small Business Services", "Finance & Legal", "Entry to Mid-level", "Hybrid",
         "Keep the books accurate for a portfolio of small business clients.",
         ["Record transactions and reconcile bank accounts", "Process invoices and payroll",
          "Prepare VAT/sales tax returns", "Answer client questions on their accounts"],
         ["Bookkeeping experience", "Confidence with accounting software", "Accuracy and organisation"],
         ["Bookkeeping qualification", "Payroll experience", "Experience with Xero or QuickBooks"]),
    _job("compliance-officer", "Compliance Officer", "Example Digital Bank", "Finance & Legal", "Mid-level", "Hybrid",
         "Help us grow safely by keeping the bank compliant with financial regulations.",
         ["Monitor regulatory changes and assess impact", "Review policies and controls",
          "Investigate compliance issues", "Train colleagues on compliance topics"],
         ["3+ years in financial services compliance", "Knowledge of AML and KYC rules", "Strong analytical writing"],
         ["Compliance qualification", "Fintech experience", "Experience with regulators"]),
    _job("legal-counsel", "Legal Counsel", "Example Technology Group", "Finance & Legal", "Senior", "Hybrid",
         "Advise the business on contracts, data protection and commercial risk.",
         ["Draft and negotiate commercial contracts", "Advise on data protection and privacy",
          "Manage legal risk across the business", "Work with external counsel when needed"],
         ["Qualified lawyer with 4+ years' experience", "Commercial contracts expertise", "Clear, practical advice style"],
         ["In-house experience", "Technology sector experience", "Data protection certification"]),
    # Marketing & Sales
    _job("digital-marketer", "Digital Marketing Specialist", "Example Outdoor Gear", "Marketing & Sales", "Mid-level", "Hybrid",
         "Grow our online sales through paid, social and email marketing.",
         ["Plan and run paid search and social campaigns", "Build email journeys and newsletters",
          "Report on performance and optimise spend", "Work with the creative team on content"],
         ["2+ years in digital marketing", "Hands-on experience with ad platforms", "Comfortable with analytics tools"],
         ["E-commerce experience", "SEO knowledge", "Marketing automation tools"]),
    _job("social-media", "Social Media Manager", "Example Food Brand", "Marketing & Sales", "Mid-level", "Remote",
         "Give our brand a voice people want to follow.",
         ["Plan and publish content across social channels", "Grow and engage our community",
          "Work with creators and partners", "Track what works and share insights"],
         ["2+ years managing brand social accounts", "Strong writing and visual sense", "Social analytics experience"],
         ["Short-form video skills", "Influencer campaign experience", "Paid social experience"]),
    _job("retail-manager", "Retail Store Manager", "Example Fashion Retailer", "Marketing & Sales", "Mid-level", "On-site",
         "Lead a store team to great customer service and strong sales.",
         ["Lead, coach and schedule the store team", "Hit sales and service targets",
          "Manage stock, visual merchandising and store standards", "Handle customer escalations"],
         ["Retail supervisory or management experience", "Commercial awareness", "Leadership and coaching skills"],
         ["Fashion retail experience", "Recruitment experience", "Loss prevention knowledge"]),
    _job("real-estate-agent", "Real Estate Agent", "Example Property Group", "Marketing & Sales", "Entry to Mid-level", "On-site",
         "Help people buy, sell and rent the homes that fit their lives.",
         ["Value and market properties", "Conduct viewings and negotiate offers",
          "Build relationships with buyers, sellers and landlords", "Keep sales progressing to completion"],
         ["Excellent communication and negotiation", "Driving licence", "Self-motivated and target-driven"],
         ["Property sales experience", "Local market knowledge", "Real estate licence where required"]),
    # Operations & trades
    _job("logistics-coordinator", "Logistics Coordinator", "Example Distribution Co.", "Operations", "Entry to Mid-level", "On-site",
         "Keep shipments moving on time from warehouse to customer.",
         ["Schedule inbound and outbound deliveries", "Track shipments and resolve delays",
          "Liaise with carriers and warehouse teams", "Maintain accurate shipping records"],
         ["Organised, with strong attention to detail", "Good Excel skills", "Clear communication under pressure"],
         ["Freight or logistics experience", "Warehouse management systems", "Customs documentation knowledge"]),
    _job("electrician", "Electrician", "Example Building Services", "Trades & Engineering", "Mid-level", "On-site",
         "Install and maintain electrical systems in commercial buildings.",
         ["Install wiring, lighting and power systems", "Fault-find and repair electrical issues",
          "Test and certify installations", "Work safely to regulations"],
         ["Qualified electrician", "Knowledge of current wiring regulations", "Driving licence"],
         ["Commercial or industrial experience", "Fire alarm or data cabling experience", "Inspection and testing qualification"]),
    _job("mechanical-engineer", "Mechanical Engineer", "Example Manufacturing Group", "Trades & Engineering", "Mid-level", "On-site",
         "Design and improve the equipment on our production lines.",
         ["Design mechanical components and assemblies", "Improve reliability of production equipment",
          "Run root-cause analysis on failures", "Support new product introduction"],
         ["Degree in Mechanical Engineering", "3D CAD experience", "Problem-solving mindset"],
         ["Lean or Six Sigma training", "FEA experience", "Manufacturing environment experience"]),
    _job("maintenance-tech", "Maintenance Technician", "Example Food Factory", "Trades & Engineering", "Entry to Mid-level", "On-site",
         "Keep our production lines running safely and smoothly.",
         ["Carry out planned and reactive maintenance", "Diagnose mechanical and electrical faults",
          "Record work in the maintenance system", "Suggest improvements to reduce downtime"],
         ["Mechanical or electrical qualification", "Maintenance experience", "Willingness to work shifts"],
         ["Food industry experience", "PLC knowledge", "Pneumatics and hydraulics"]),
    _job("plumber", "Plumber", "Example Home Services", "Trades & Engineering", "Mid-level", "On-site",
         "Install and repair plumbing and heating for homes in the area.",
         ["Install and repair pipework, fixtures and boilers", "Diagnose leaks and heating faults",
          "Give clear quotes and explanations to customers", "Leave every job clean and safe"],
         ["Plumbing qualification", "Domestic plumbing experience", "Driving licence"],
         ["Gas safety registration", "Renewable heating experience", "Customer service skills"]),
    # Creative & media
    _job("graphic-designer", "Graphic Designer", "Example Creative Agency", "Creative & Media", "Mid-level", "Hybrid",
         "Create brand, print and digital work for a wide mix of clients.",
         ["Design brand identities, campaigns and layouts", "Prepare files for print and digital",
          "Present ideas to clients and take feedback", "Keep work on brand and on time"],
         ["A strong portfolio", "Expert with Adobe Creative Suite or Figma", "Typography and layout skills"],
         ["Motion graphics", "Packaging design", "Agency experience"]),
    _job("video-editor", "Video Editor", "Example Online Media", "Creative & Media", "Mid-level", "Remote",
         "Edit engaging short and long-form video for our channels.",
         ["Edit footage into polished videos", "Add graphics, captions and sound", "Adapt content for each platform",
          "Keep a fast, reliable turnaround"],
         ["2+ years editing video professionally", "Premiere Pro, Final Cut or DaVinci Resolve", "A strong reel"],
         ["Motion graphics in After Effects", "Colour grading", "Audio mixing"]),
    _job("journalist", "Reporter", "Example City News", "Creative & Media", "Entry to Mid-level", "Hybrid",
         "Find and tell the stories that matter to our city.",
         ["Research, report and write news stories", "Interview sources and verify facts",
          "Produce content for web and social", "Meet daily deadlines"],
         ["Excellent writing and fact-checking", "Curiosity and persistence", "Journalism qualification or experience"],
         ["Data journalism skills", "Video or podcast experience", "Shorthand"]),
    _job("photographer", "Photographer", "Example Events Company", "Creative & Media", "Mid-level", "On-site",
         "Capture events, portraits and products for our clients.",
         ["Shoot events, portraits and products", "Edit and deliver images to deadline",
          "Direct people so they look relaxed on camera", "Manage and maintain equipment"],
         ["A professional portfolio", "Lightroom and Photoshop skills", "Confident with people"],
         ["Studio lighting experience", "Drone licence", "Video skills"]),
    # Public sector & nonprofit
    _job("policy-officer", "Policy Officer", "Example City Council", "Public Sector & Nonprofit", "Mid-level", "Hybrid",
         "Shape policies that improve local services.",
         ["Research and analyse policy options", "Write clear briefings and reports",
          "Consult residents and partners", "Track the impact of policy changes"],
         ["Degree or equivalent experience", "Strong research and writing skills", "Ability to explain complex issues simply"],
         ["Local government experience", "Data analysis skills", "Consultation or engagement experience"]),
    _job("fundraiser", "Fundraising Officer", "Example Children's Charity", "Public Sector & Nonprofit", "Entry to Mid-level", "Hybrid",
         "Raise the money that funds our work with children and families.",
         ["Build relationships with donors and supporters", "Write funding applications",
          "Plan and run fundraising events", "Report on income and impact"],
         ["Excellent written and spoken communication", "Organised and target-aware", "Passion for the cause"],
         ["Fundraising experience", "CRM database experience", "Grant writing success"]),
    _job("community-manager", "Community Outreach Coordinator", "Example Food Bank", "Public Sector & Nonprofit", "Entry-level", "On-site",
         "Connect people in need with food and support services.",
         ["Coordinate volunteers and distribution days", "Build partnerships with local organisations",
          "Talk with clients warmly and without judgement", "Keep simple records of services provided"],
         ["People skills and empathy", "Organisation", "Comfort speaking to groups"],
         ["Volunteer management experience", "A second language", "Driving licence"]),
    # Science & research
    _job("lab-technician", "Laboratory Technician", "Example Biotech", "Science & Research", "Entry-level", "On-site",
         "Support our research team with accurate, well-documented lab work.",
         ["Prepare samples, solutions and equipment", "Run standard assays and record results",
          "Maintain lab stock and safety", "Follow and improve lab procedures"],
         ["Degree in a life science", "Careful, methodical working style", "Good record keeping"],
         ["PCR or cell culture experience", "GLP knowledge", "LIMS experience"]),
    _job("research-scientist", "Research Scientist (Materials)", "Example Energy Lab", "Science & Research", "Senior", "On-site",
         "Develop new materials for next-generation batteries.",
         ["Design and run experiments", "Analyse and interpret results", "Publish and present findings",
          "Collaborate with engineering on scale-up"],
         ["PhD in materials science, chemistry or physics", "Hands-on characterisation experience", "Publication record"],
         ["Battery research experience", "Grant writing", "Industry collaboration experience"]),
    _job("environmental-consultant", "Environmental Consultant", "Example Green Consulting", "Science & Research", "Mid-level", "Hybrid",
         "Help organisations understand and reduce their environmental impact.",
         ["Carry out environmental assessments and site surveys", "Analyse data and write reports",
          "Advise clients on regulations", "Manage small projects and budgets"],
         ["Degree in environmental science or similar", "Report writing experience", "Driving licence"],
         ["Carbon footprinting", "GIS skills", "Chartered status"]),
    # Hospitality & customer service
    _job("hotel-front-desk", "Hotel Front Desk Agent", "Example Boutique Hotel", "Hospitality", "Entry-level", "On-site",
         "Make every guest's arrival and stay feel special.",
         ["Check guests in and out", "Handle reservations and payments", "Answer questions and give local tips",
          "Resolve issues quickly and politely"],
         ["Friendly, professional manner", "Customer service experience", "Willingness to work shifts"],
         ["Hotel booking system experience", "A second language", "Hospitality qualification"]),
    _job("event-planner", "Event Planner", "Example Events Agency", "Hospitality", "Mid-level", "Hybrid",
         "Plan and deliver conferences, launches and celebrations people remember.",
         ["Plan events from brief to delivery", "Manage venues, suppliers and budgets",
          "Run events on the day", "Gather feedback and report results"],
         ["Event planning experience", "Budget management", "Calm problem-solving"],
         ["Corporate events experience", "Event management software", "Sustainability in events"]),
    _job("call-centre", "Call Centre Advisor", "Example Energy Supplier", "Customer Service", "Entry-level", "Hybrid",
         "Help customers with billing, moving home and energy questions.",
         ["Answer customer calls and chats", "Solve billing and account questions", "Record interactions accurately",
          "Escalate complex cases appropriately"],
         ["Clear, friendly phone manner", "Basic computer skills", "Patience with frustrated customers"],
         ["Call centre experience", "Utilities or billing experience", "A second language"]),
])


def list_examples() -> list[dict]:
    """Summaries for browsing — omits the full description to keep the
    list response small."""
    return [
        {k: v for k, v in job.items() if k != "description"}
        | {"preview": job["description"].split("\n")[0]}
        for job in EXAMPLE_JOBS
    ]


def get_example(example_id: str) -> dict | None:
    return next((j for j in EXAMPLE_JOBS if j["id"] == example_id), None)
