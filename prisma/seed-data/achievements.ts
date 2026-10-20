// Achievement seed — metadata only, supported by the owner's CV/brief.
// No images, certificate IDs, issue dates or verification links are fabricated.
// Every record starts as a DRAFT and stays private until the owner reviews and publishes it.

type SeedAchievement = {
  slug: string;
  title: string;
  category:
    | 'PROFESSIONAL_CERTIFICATION'
    | 'COURSE_SPECIALIZATION'
    | 'ACADEMIC'
    | 'RESEARCH_INTERNSHIP'
    | 'AWARD_HONOUR'
    | 'HACKATHON_COMPETITION'
    | 'LEADERSHIP_VOLUNTEERING'
    | 'WORKSHOP_TRAINING'
    | 'SPORTS_EXTRACURRICULAR'
    | 'OTHER';
  issuer: string;
  dateLabel?: string;
  summary: string;
  context?: string;
  skillsCovered?: string[];
  featured?: boolean;
  order: number;
  projectSlugs?: string[];
};

export const achievements: SeedAchievement[] = [
  {
    slug: 'cuet-pg-mathematics-air-131',
    title: 'CUET PG Mathematics — All India Rank 131',
    category: 'ACADEMIC',
    issuer: 'Common University Entrance Test (PG), National Testing Agency',
    summary: 'Secured All India Rank 131 in the CUET PG Mathematics examination.',
    skillsCovered: ['Mathematics'],
    featured: true,
    order: 0,
  },
  {
    slug: 'regional-mathematical-olympiad',
    title: 'Regional Mathematical Olympiad (RMO) — Qualified',
    category: 'ACADEMIC',
    issuer: 'Regional Mathematical Olympiad',
    summary: 'Qualified for the Regional Mathematical Olympiad.',
    skillsCovered: ['Mathematics', 'Problem solving'],
    order: 1,
  },
  {
    slug: 'machine-learning-specialization',
    title: 'Machine Learning Specialization',
    category: 'COURSE_SPECIALIZATION',
    issuer: 'Stanford Online & DeepLearning.AI',
    dateLabel: '2026',
    summary:
      'Three-course specialization covering supervised learning, advanced learning algorithms, unsupervised learning, recommender systems and reinforcement learning.',
    skillsCovered: [
      'Machine Learning',
      'Neural networks',
      'Decision trees',
      'Recommender systems',
      'Reinforcement learning',
    ],
    featured: true,
    order: 2,
  },
  {
    slug: 'nielit-big-data-data-science-bootcamp',
    title: 'Bootcamp on Big Data & Data Science',
    category: 'WORKSHOP_TRAINING',
    issuer: 'NIELIT Kolkata',
    dateLabel: '2024',
    summary: 'Bootcamp on Big Data and Data Science conducted by NIELIT Kolkata.',
    skillsCovered: ['Big data', 'Data science'],
    order: 3,
  },
  {
    slug: 'outstanding-student-volunteer-award',
    title: 'Outstanding Student Volunteer Award',
    category: 'AWARD_HONOUR',
    issuer: "Institution's Innovation Council, University of Calcutta",
    dateLabel: '2025–26',
    summary:
      "Recognised as an Outstanding Student Volunteer for contributions to the Institution's Innovation Council.",
    featured: true,
    order: 4,
    projectSlugs: ['iic-cu-platform'],
  },
  {
    slug: 'vecc-research-internship',
    title: 'Research Internship — Variable Energy Cyclotron Centre',
    category: 'RESEARCH_INTERNSHIP',
    issuer: 'Variable Energy Cyclotron Centre, Department of Atomic Energy, Government of India',
    dateLabel: 'Summer 2026',
    summary: 'Research internship on NARX-based time-series modelling.',
    skillsCovered: ['Time-series forecasting', 'NARX', 'Data engineering'],
    featured: true,
    order: 5,
    projectSlugs: ['vecc-narx-research'],
  },
  {
    slug: 'google-agentic-ai-day-hackathon-recognition',
    title: 'Recognition — Google Agentic AI Day Hackathon',
    category: 'HACKATHON_COMPETITION',
    issuer: 'Google Agentic AI Day Hackathon',
    summary: 'MedAI Guardian earned recognition at the Google Agentic AI Day Hackathon.',
    order: 6,
    projectSlugs: ['medai-guardian'],
  },
  {
    slug: 'hostel-general-secretary',
    title: 'Hostel General Secretary',
    category: 'LEADERSHIP_VOLUNTEERING',
    issuer: 'Issuer to be confirmed by owner',
    summary: 'Served as Hostel General Secretary.',
    order: 7,
  },
  {
    slug: 'college-volleyball-captain',
    title: 'College Volleyball Captain',
    category: 'SPORTS_EXTRACURRICULAR',
    issuer: 'Issuer to be confirmed by owner',
    summary: 'Captained the college volleyball team.',
    order: 8,
  },
];
