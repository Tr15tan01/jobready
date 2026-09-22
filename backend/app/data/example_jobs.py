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
