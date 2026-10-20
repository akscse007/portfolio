export const topics: { name: string; slug: string; group: string; description: string }[] = [
  {
    name: 'Linear Algebra',
    slug: 'linear-algebra',
    group: 'Mathematics',
    description: 'Vectors, matrices and decompositions — the language of machine learning.',
  },
  {
    name: 'Calculus',
    slug: 'calculus',
    group: 'Mathematics',
    description: 'Derivatives, gradients and optimisation.',
  },
  {
    name: 'Probability',
    slug: 'probability',
    group: 'Mathematics',
    description: 'Random variables, distributions and likelihood.',
  },
  {
    name: 'Statistics',
    slug: 'statistics',
    group: 'Mathematics',
    description: 'Estimation, inference and honest evaluation.',
  },
  {
    name: 'Discrete Mathematics',
    slug: 'discrete-mathematics',
    group: 'Mathematics',
    description: 'Logic, combinatorics, graphs and proof.',
  },
  {
    name: 'Data Structures',
    slug: 'data-structures',
    group: 'Computer Science',
    description: 'How to organise data so algorithms can be fast.',
  },
  {
    name: 'Algorithms',
    slug: 'algorithms',
    group: 'Computer Science',
    description: 'Design and analysis of algorithms.',
  },
  {
    name: 'Operating Systems',
    slug: 'operating-systems',
    group: 'Computer Science',
    description: 'Processes, memory, scheduling and concurrency.',
  },
  {
    name: 'Computer Networks',
    slug: 'computer-networks',
    group: 'Computer Science',
    description: 'From packets to protocols to the web.',
  },
  {
    name: 'Database Systems',
    slug: 'database-systems',
    group: 'Computer Science',
    description: 'Relational modelling, SQL, indexing and transactions.',
  },
  {
    name: 'Compiler Design',
    slug: 'compiler-design',
    group: 'Computer Science',
    description: 'Lexing, parsing, semantic analysis and code generation.',
  },
  {
    name: 'Machine Learning',
    slug: 'machine-learning',
    group: 'AI / ML',
    description: 'Learning from data: models, losses and optimisation.',
  },
  {
    name: 'Deep Learning',
    slug: 'deep-learning',
    group: 'AI / ML',
    description: 'Neural networks, backpropagation and architectures.',
  },
  {
    name: 'LLMs',
    slug: 'llms',
    group: 'AI / ML',
    description: 'How large language models work and how to use them well.',
  },
  {
    name: 'RAG',
    slug: 'rag',
    group: 'AI / ML',
    description: 'Retrieval-Augmented Generation pipelines.',
  },
  {
    name: 'Time-Series Forecasting',
    slug: 'time-series-forecasting',
    group: 'AI / ML',
    description: 'Sequence models, NARX and recursive forecasting.',
  },
  {
    name: 'Quantitative Finance',
    slug: 'quantitative-finance',
    group: 'AI / ML',
    description: 'Data-driven approaches to financial markets.',
  },
  {
    name: 'Full-Stack Engineering',
    slug: 'full-stack-engineering',
    group: 'Engineering',
    description: 'Building and shipping web applications end to end.',
  },
  {
    name: 'System Design',
    slug: 'system-design',
    group: 'Engineering',
    description: 'Designing reliable, scalable systems.',
  },
  {
    name: 'Research Notes',
    slug: 'research-notes',
    group: 'Research',
    description: 'Working notes from research and reading.',
  },
];

export const series = [
  {
    slug: 'mathematics-for-machine-learning',
    title: 'Mathematics for Machine Learning',
    description: 'A first-principles path from linear algebra to backpropagation.',
    topicSlug: 'machine-learning',
  },
];

export const posts: {
  slug: string;
  title: string;
  excerpt: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topicSlug: string;
  seriesSlug?: string;
  seriesOrder?: number;
  tags: string[];
  featured?: boolean;
  projectSlugs?: string[];
}[] = [
  {
    slug: 'linear-algebra-for-machine-learning',
    title: 'Linear Algebra for Machine Learning',
    excerpt:
      'Vectors, matrices as functions, dot products as similarity and the SVD — the four ideas behind most ML notation.',
    difficulty: 'BEGINNER',
    topicSlug: 'linear-algebra',
    seriesSlug: 'mathematics-for-machine-learning',
    seriesOrder: 1,
    tags: ['linear algebra', 'numpy', 'pca'],
    featured: true,
  },
  {
    slug: 'gradient-descent-from-first-principles',
    title: 'Gradient Descent from First Principles',
    excerpt:
      'Derive gradient descent from the definition of a derivative, implement it, and understand learning rates, momentum and Adam.',
    difficulty: 'BEGINNER',
    topicSlug: 'calculus',
    seriesSlug: 'mathematics-for-machine-learning',
    seriesOrder: 2,
    tags: ['optimisation', 'calculus', 'numpy'],
    featured: true,
  },
  {
    slug: 'probability-distributions-for-ml-engineers',
    title: 'Probability Distributions for ML Engineers',
    excerpt:
      'Why MSE assumes Gaussian noise and cross-entropy assumes a categorical outcome — a practical tour of the distributions behind loss functions.',
    difficulty: 'INTERMEDIATE',
    topicSlug: 'probability',
    seriesSlug: 'mathematics-for-machine-learning',
    seriesOrder: 3,
    tags: ['probability', 'loss functions'],
  },
  {
    slug: 'understanding-backpropagation',
    title: 'Understanding Backpropagation',
    excerpt:
      'Backprop is the chain rule plus caching. Derive it by hand for a two-layer network, then see how autodiff automates it.',
    difficulty: 'INTERMEDIATE',
    topicSlug: 'deep-learning',
    seriesSlug: 'mathematics-for-machine-learning',
    seriesOrder: 4,
    tags: ['neural networks', 'calculus', 'pytorch'],
  },
  {
    slug: 'how-retrieval-augmented-generation-works',
    title: 'How Retrieval-Augmented Generation Works',
    excerpt:
      'Chunking, embeddings, vector stores, retrieval and grounded generation — and how to evaluate each stage.',
    difficulty: 'INTERMEDIATE',
    topicSlug: 'rag',
    tags: ['rag', 'llm', 'embeddings', 'chromadb'],
    featured: true,
    projectSlugs: ['qa-forge'],
  },
  {
    slug: 'rest-api-design-and-validation',
    title: 'REST API Design and Validation',
    excerpt:
      'Predictable resources, honest status codes, strict validation at the boundary and errors clients can act on.',
    difficulty: 'BEGINNER',
    topicSlug: 'full-stack-engineering',
    tags: ['api', 'validation', 'security'],
  },
  {
    slug: 'database-indexing-and-query-optimization',
    title: 'Database Indexing and Query Optimization',
    excerpt:
      'What an index really is, how to read a query plan, composite index ordering and the N+1 problem.',
    difficulty: 'INTERMEDIATE',
    topicSlug: 'database-systems',
    tags: ['sql', 'postgresql', 'performance'],
  },
  {
    slug: 'narx-models-and-recursive-forecasting',
    title: 'NARX Models and Recursive Forecasting',
    excerpt:
      'Lagged features, open- versus closed-loop forecasting, exposure bias and scheduled sampling.',
    difficulty: 'ADVANCED',
    topicSlug: 'time-series-forecasting',
    tags: ['time series', 'narx', 'forecasting'],
    projectSlugs: ['vecc-narx-research'],
  },
];
