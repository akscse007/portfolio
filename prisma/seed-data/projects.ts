// Project seed. Only facts supported by the owner's CV/brief are stated; empty case-study
// sections are hidden on the public page until the owner writes them in /admin.

type SeedProject = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: 'Full Stack' | 'AI/ML' | 'Research' | 'FinTech' | 'Developer Tools';
  stage: 'LIVE' | 'IN_PROGRESS' | 'RESEARCH' | 'PROTOTYPE' | 'ARCHIVED';
  stageNote?: string;
  role: string;
  period: string;
  problem?: string;
  solution?: string;
  architecture?: string;
  contribution?: string;
  decisions?: string;
  challenges?: string;
  lessons?: string;
  liveUrl?: string;
  repoUrl?: string;
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  order: number;
  skills: string[];
  tags: string[];
};

export const projects: SeedProject[] = [
  {
    slug: 'iic-cu-platform',
    title: 'IIC-CU Platform',
    subtitle: "Digital platform for the Institution's Innovation Council, University of Calcutta",
    summary:
      'A production platform for university innovation workflows — event proposals, internship management and day-to-day council operations — which I designed, developed and now manage.',
    category: 'Full Stack',
    stage: 'LIVE',
    role: 'Project Manager · Senior Technical Lead · Full-Stack Developer',
    period: 'Sep 2025 — Present',
    problem:
      'University innovation activities involve many hands — students, faculty coordinators and interns — and many workflows, from proposing events to managing internships. The council needed a single platform to run these processes reliably.',
    solution:
      'I designed and developed the IIC-CU platform to support university workflows, including **event-proposal management** and **internship-management workflows**, and it is live at [iic-caluniv.in](https://iic-caluniv.in/).',
    contribution: `- Designed and developed the platform.
- Serve as Project Manager and senior technical lead.
- Lead code integration, release management and merge reviews.
- Run final testing for production deployments.
- Manage university workflows and intern contributions.`,
    liveUrl: 'https://iic-caluniv.in/',
    status: 'PUBLISHED',
    featured: true,
    order: 0,
    skills: [],
    tags: ['University', 'Workflow systems', 'Release management'],
  },
  {
    slug: 'studyhub-publication',
    title: 'StudyHub Publication',
    subtitle: 'MERN book-sales platform',
    summary:
      'A freelance full-stack build: an online store for a publisher with book sales, inventory management and secure order processing.',
    category: 'Full Stack',
    stage: 'LIVE',
    role: 'Freelance Full-Stack Developer',
    period: 'May 2026',
    problem:
      'StudyHub Publication needed to sell its books online and keep inventory and orders under control.',
    solution:
      'A full-stack **MERN** platform (MongoDB, Express, React, Node.js) enabling online book sales, inventory management and secure order processing. Live at [study-hub.in](https://www.study-hub.in/).',
    contribution: '- Built the platform end-to-end as a freelance developer.',
    liveUrl: 'https://www.study-hub.in/',
    status: 'PUBLISHED',
    featured: true,
    order: 1,
    skills: ['MongoDB', 'Express', 'React', 'Node.js'],
    tags: ['E-commerce', 'MERN'],
  },
  {
    slug: 'medai-guardian',
    title: 'MedAI Guardian',
    subtitle: 'AI smart-healthcare platform for Primary Health Centres',
    summary:
      'An AI-powered platform that forecasts patient footfall, medicine demand and bed occupancy so Primary Health Centres can plan resources from data.',
    category: 'AI/ML',
    stage: 'PROTOTYPE',
    stageNote: 'Hackathon project',
    role: 'Developer',
    period: '',
    problem:
      'Primary Health Centres must plan staff, medicines and beds ahead of demand. Without forecasts, planning is reactive.',
    solution:
      'An AI-powered platform that forecasts **patient footfall**, **medicine demand** and **bed occupancy** for data-driven resource planning, built on ML-based forecasting and analytics pipelines.',
    contribution: `- Developed the platform.
- Built the ML-based forecasting and analytics pipelines.
- The project earned recognition at the Google Agentic AI Day Hackathon.`,
    liveUrl: 'https://med-ai-guardian.vercel.app/',
    status: 'PUBLISHED',
    featured: true,
    order: 2,
    skills: ['Machine Learning', 'Time-Series Forecasting'],
    tags: ['Healthcare', 'Forecasting', 'Hackathon'],
  },
  {
    slug: 'smartspend-ai',
    title: 'SmartSpend AI',
    subtitle: 'Intelligent financial-planning platform',
    summary:
      'An AI-powered fintech platform for automated expense categorisation, spending analysis and personalised savings recommendations.',
    category: 'FinTech',
    stage: 'LIVE',
    role: 'Developer',
    period: '',
    problem:
      'Personal finance tools often stop at recording transactions. Useful planning needs categorisation, analysis and forward-looking insight.',
    solution:
      'An AI-powered platform for **automated expense categorisation**, **spending analysis** and **personalised savings recommendations**, using **xLSTM** and regression-based forecasting to generate data-driven financial-planning insights.',
    liveUrl: 'https://smartspend-ai-henna.vercel.app/',
    status: 'PUBLISHED',
    featured: true,
    order: 3,
    skills: ['LSTM', 'Machine Learning', 'Time-Series Forecasting'],
    tags: ['FinTech', 'Forecasting'],
  },
  {
    slug: 'qa-forge',
    title: 'QA-Forge',
    subtitle: 'AI-powered test-case generation from SRS documents',
    summary:
      'A Retrieval-Augmented Generation platform that analyses Software Requirements Specification documents and generates structured software test cases.',
    category: 'Developer Tools',
    stage: 'PROTOTYPE',
    stageNote: 'Demo',
    role: 'Developer',
    period: '',
    problem:
      'Turning a long SRS document into a complete, structured set of test cases is slow and easy to get wrong by hand.',
    solution:
      'A **RAG** platform that analyses SRS documents and automatically generates structured software test cases. A recorded demo is available on [LinkedIn](https://www.linkedin.com/posts/akscse007_ai-generativeai-rag-activity-7474171003359727616-8Xmb).',
    architecture:
      'A semantic document-processing pipeline built with **Sentence Transformers** for embeddings, **LangChain** for orchestration and **ChromaDB** as the vector store, packaged with **Docker Compose**.',
    status: 'PUBLISHED',
    featured: true,
    order: 4,
    skills: [
      'RAG',
      'LangChain',
      'Sentence Transformers',
      'ChromaDB',
      'Docker Compose',
      'Generative AI',
    ],
    tags: ['RAG', 'Testing', 'LLM'],
  },
  {
    slug: 'vecc-narx-research',
    title: 'VECC NARX Research',
    subtitle: 'Time-series modelling with NARX networks — research internship',
    summary:
      'A NARX-based time-series modelling pipeline built from 11 EPICS process-variable datasets, with single- and multi-target studies using scheduled-sampling recursive training.',
    category: 'Research',
    stage: 'RESEARCH',
    stageNote: 'Public summary only',
    role: 'Research Intern',
    period: 'Summer 2026',
    problem:
      'Modelling the dynamic behaviour of a process from historical process-variable data, so that its response can be studied offline.',
    solution:
      'A NARX (Nonlinear AutoRegressive with eXogenous inputs) modelling pipeline. Data from 11 EPICS process-variable datasets was extracted from JSON, temporally aligned and merged into a unified dataset of roughly **1.47 million rows**.',
    architecture: `1. **Extraction** — JSON exports of process variables parsed into tabular series.
2. **Alignment** — independent time bases aligned onto a common timeline.
3. **Merge** — a single unified dataset (~1.47M rows).
4. **Modelling** — NARX networks trained with *scheduled sampling*, gradually replacing ground-truth feedback with the model's own predictions so it learns to forecast recursively.
5. **Evaluation** — single-target and multi-target experiments.`,
    contribution:
      '- Conducted independent single-target and multi-target NARX studies using scheduled-sampling recursive training and experimental evaluation.',
    lessons:
      'Only details authorised for public disclosure are presented here. Operational information, parameters, internal infrastructure and unpublished findings are intentionally omitted.',
    status: 'PUBLISHED',
    featured: false,
    order: 5,
    skills: ['NARX', 'Time-Series Forecasting', 'Machine Learning'],
    tags: ['Research', 'Time series', 'EPICS'],
  },
  {
    slug: 'nifty-50-quant-research',
    title: 'NIFTY 50 — Quantitative Finance Research',
    subtitle: 'Time-series forecasting and deep learning for markets',
    summary:
      'Ongoing research into time-series forecasting and deep learning for quantitative finance using NIFTY 50 data.',
    category: 'Research',
    stage: 'IN_PROGRESS',
    stageNote: 'Work in progress',
    role: 'Independent research',
    period: '',
    status: 'DRAFT',
    featured: false,
    order: 6,
    skills: ['Time-Series Forecasting'],
    tags: ['Quant finance', 'Time series'],
  },
];
