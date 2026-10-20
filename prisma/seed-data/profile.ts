// Verified facts from the owner's CV / brief. Everything here is editable in /admin.

export const profile = {
  name: 'Akash Roy',
  headline: 'AI Engineer · Full-Stack Developer · Machine Learning Enthusiast',
  tagline: 'I build systems. I study patterns.',
  subTagline: 'From mathematical foundations to intelligent software.',
  location: 'Kolkata, West Bengal, India',
  timezone: 'Asia/Kolkata',
  shortBio:
    'AI Engineer and full-stack developer from Kolkata. I design AI-powered products and production web platforms, and research time-series forecasting — built on a foundation in mathematics.',
  bio: `I came to software through mathematics. A B.Sc. in Mathematics (Honours) at Scottish Church College taught me to distrust results I could not derive, and that habit followed me into computer science, where I am completing a B.Tech in Computer Science & Engineering at the University of Calcutta.

Today I work across the stack. As Project Manager and full-stack developer at the **Institution's Innovation Council, University of Calcutta**, I designed and built the IIC-CU platform and lead its integration, release management and production testing. As a freelancer I built the MERN-based StudyHub Publication store.

On the research side, I spent the summer of 2026 as a research intern at the **Variable Energy Cyclotron Centre** (Department of Atomic Energy), building a NARX-based time-series modelling pipeline. I am also exploring forecasting and deep learning for quantitative finance.

I write notes for juniors because the best way to check that I understand something is to explain it from first principles.`,
  researchInterests: [
    'Time-series forecasting',
    'NARX and recurrent sequence models',
    'Retrieval-Augmented Generation (RAG)',
    'Deep learning for quantitative finance',
    'Applied machine learning systems',
  ],
  email: 'roy.akashcucse@gmail.com',
  githubUrl: 'https://github.com/akscse007',
  linkedinUrl: 'https://linkedin.com/in/akscse007',
  cvUrl: null,
  availabilityOn: false,
  availabilityLabel: null,
  showClock: true,
};

export const settings = {
  siteTitle: 'AKASH ROY — DIGITAL LAB',
  siteDescription:
    'Akash Roy — AI Engineer and Full-Stack Developer from Kolkata. Mathematics, intelligent software, research notes and proof of work.',
  siteUrl: null,
  twitterHandle: null,
  contactEnabled: true,
  contactAutoReply: false,
  footerNote: 'Designed and engineered in Kolkata.',
};

export const education = [
  {
    id: 'edu-btech',
    institution: 'University of Calcutta',
    credential: 'B.Tech in Computer Science & Engineering',
    period: '2024 — 2027',
    result: 'Average SGPA 7.84 / 10',
    note: null,
    order: 0,
  },
  {
    id: 'edu-bsc',
    institution: 'Scottish Church College, University of Calcutta',
    credential: 'B.Sc. Mathematics (Honours)',
    period: '2020 — 2023',
    result: 'CGPA 8.11 / 10',
    note: null,
    order: 1,
  },
  {
    id: 'edu-school',
    institution: 'Katwa Kashiram Das Institution',
    credential: 'Higher Secondary (WBCHSE) · Secondary (WBBSE)',
    period: '2018 — 2020',
    result: 'Higher Secondary 91.4% · Secondary 86.5%',
    note: null,
    order: 2,
  },
];

export const experience = [
  {
    id: 'exp-vecc',
    organization:
      'Variable Energy Cyclotron Centre (VECC), Department of Atomic Energy, Government of India',
    role: 'Research Intern',
    kind: 'RESEARCH' as const,
    location: 'Kolkata',
    period: 'Summer 2026',
    current: false,
    summary:
      'Time-series modelling research. Only details cleared for public disclosure are listed; no operational information, parameters or unpublished findings.',
    highlights: [
      'Developed a NARX-based time-series modelling pipeline using 11 EPICS process-variable datasets, integrating JSON extraction, temporal alignment and merging into a unified dataset of roughly 1.47 million rows.',
      'Conducted independent single-target and multi-target NARX studies using scheduled-sampling recursive training and experimental evaluation.',
    ],
    url: null,
    order: 0,
  },
  {
    id: 'exp-iic',
    organization: "Institution's Innovation Council (IIC), University of Calcutta",
    role: 'Project Manager & Full-Stack Developer',
    kind: 'WORK' as const,
    location: 'Kolkata',
    period: 'Sep 2025 — Present',
    current: true,
    summary:
      'Project Manager and senior technical lead for the IIC-CU platform, which I designed and developed.',
    highlights: [
      'Designed and developed the IIC-CU platform supporting university workflows, event-proposal management and internship-management workflows.',
      'Lead code integration, release management, merge reviews and final testing for production deployments.',
      'Manage university workflows and intern contributions.',
    ],
    url: 'https://iic-caluniv.in/',
    order: 1,
  },
  {
    id: 'exp-studyhub',
    organization: 'StudyHub Publication',
    role: 'Freelance Full-Stack Developer',
    kind: 'FREELANCE' as const,
    location: null,
    period: 'May 2026',
    current: false,
    summary: 'Freelance build of a MERN platform for online book sales.',
    highlights: [
      'Built a full-stack MERN platform enabling online book sales, inventory management and secure order processing.',
    ],
    url: 'https://www.study-hub.in/',
    order: 2,
  },
];

export const skills: { group: string; names: string[] }[] = [
  { group: 'Languages', names: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++'] },
  { group: 'Frontend', names: ['React', 'Next.js', 'Tailwind CSS', 'HTML5 / CSS3'] },
  { group: 'Backend', names: ['Node.js', 'Express', 'FastAPI', 'REST APIs'] },
  { group: 'Data', names: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'ChromaDB'] },
  {
    group: 'AI / ML',
    names: [
      'Machine Learning',
      'Generative AI',
      'RAG',
      'LangChain',
      'Sentence Transformers',
      'XGBoost',
      'LSTM',
      'Time-Series Forecasting',
      'NARX',
    ],
  },
  { group: 'DevOps & Tooling', names: ['Docker', 'Docker Compose', 'CI/CD', 'GitHub', 'Vercel'] },
];
