import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, matchesQuery, readingMinutes, slugify } from '@/lib/utils';

describe('utils', () => {
  it('slugify produces safe slugs', () => {
    expect(slugify('Linear Algebra for ML!')).toBe('linear-algebra-for-ml');
    expect(slugify('  Big Data & Data Science  ')).toBe('big-data-and-data-science');
    expect(slugify('Café — naïve résumé')).toBe('cafe-naive-resume');
    expect(slugify('../../etc')).toBe('etc');
  });
  it('estimates reading time', () => {
    expect(readingMinutes('word '.repeat(10))).toBe(1);
    expect(readingMinutes('word '.repeat(2200))).toBe(10);
  });
  it('formats durations and sizes', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(null)).toBeNull();
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('matches multi-token, accent-insensitive queries', () => {
    expect(
      matchesQuery('Machine Learning Specialization — Stanford Online', 'stanford machine'),
    ).toBe(true);
    expect(matchesQuery('Résumé', 'resume')).toBe(true);
    expect(matchesQuery('NIELIT Kolkata', 'coursera')).toBe(false);
  });
});
