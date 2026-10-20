import type { Station } from '@/components/home/Trajectory';

/** Narrative copy for the home-page trajectory. Facts mirror the editable seed data. */
export const STATIONS: Station[] = [
  {
    index: '01',
    kicker: 'Foundations',
    title: 'Mathematics',
    glyph: 'proof',
    body: 'B.Sc. Mathematics (Honours) at Scottish Church College, University of Calcutta. Proof, abstraction and the habit of asking why a method works before trusting it.',
    facts: [
      { label: 'CGPA 8.11 / 10', href: '/about#education' },
      { label: 'CUET PG Mathematics — AIR 131', href: '/achievements' },
      { label: 'RMO qualifier', href: '/achievements' },
    ],
  },
  {
    index: '02',
    kicker: 'Formalism',
    title: 'Computer Science',
    glyph: 'graph',
    body: 'B.Tech in Computer Science & Engineering at the University of Calcutta (2024–2027). Algorithms, systems and data — the machinery behind the mathematics.',
    facts: [
      { label: 'B.Tech CSE, 2024–27', href: '/about#education' },
      { label: 'Data structures & algorithms', href: '/topics/algorithms' },
    ],
  },
  {
    index: '03',
    kicker: 'Production',
    title: 'Software Engineering',
    glyph: 'stack',
    body: 'Designing and shipping real platforms: the IIC-CU university platform and the StudyHub Publication store — releases, reviews, testing and the unglamorous parts that keep software alive.',
    facts: [
      { label: 'IIC-CU platform', href: '/work/iic-cu-platform' },
      { label: 'StudyHub Publication', href: '/work/studyhub-publication' },
    ],
  },
  {
    index: '04',
    kicker: 'Inquiry',
    title: 'AI / ML Research',
    glyph: 'signal',
    body: 'Time-series modelling with NARX networks during a research internship at VECC (DAE), alongside forecasting experiments in quantitative finance.',
    facts: [
      { label: 'VECC research internship', href: '/research' },
      { label: 'NARX & recursive forecasting', href: '/research' },
      { label: 'Quant finance research', href: '/work/nifty-50-quant-research' },
    ],
  },
  {
    index: '05',
    kicker: 'Giving back',
    title: 'Knowledge Sharing',
    glyph: 'book',
    body: 'Notes for juniors on mathematics, computer science and machine learning — written the way I wish someone had explained them to me.',
    facts: [
      { label: 'Read the notes', href: '/blog' },
      { label: 'Interactive playground', href: '/playground' },
    ],
  },
];
