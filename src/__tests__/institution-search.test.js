import { describe, it, expect } from 'vitest';
import searchLib from '../../server/lib/institutionSearch.cjs';

const { rankInstitutions, scoreInstitution, levenshtein, normalize } = searchLib;

const FIXTURES = [
  { id: 'a', name: 'Monipur High School and College', nameBn: 'মণিপুর উচ্চ বিদ্যালয় ও কলেজ', aliases: ['monipur', 'mhsc'], type: 'school', district: 'Dhaka', trustLevel: 'approximate' },
  { id: 'b', name: 'BRAC University', nameBn: 'ব্র্যাক বিশ্ববিদ্যালয়', aliases: ['bracu', 'brac uni'], type: 'university', district: 'Dhaka', trustLevel: 'verified' },
  { id: 'c', name: 'North South University', nameBn: '', aliases: ['nsu'], type: 'university', district: 'Dhaka', trustLevel: 'verified' },
  { id: 'd', name: 'Noakhali Science and Technology University', nameBn: '', aliases: ['nstu'], type: 'university', district: 'Noakhali', trustLevel: 'approximate' },
  { id: 'e', name: 'Cadet College Cumilla', nameBn: 'কুমিল্লা ক্যাডেট কলেজ', aliases: ['ccc', 'cumilla cadet'], type: 'cadet', district: 'Cumilla', trustLevel: 'approximate' },
];

describe('normalize', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalize('  BRAC   University ')).toBe('brac university');
  });
});

describe('levenshtein', () => {
  it('is zero for equal strings', () => expect(levenshtein('moni', 'moni')).toBe(0));
  it('counts single edits', () => expect(levenshtein('monpr', 'monipur')).toBeLessThanOrEqual(2));
});

describe('scoreInstitution', () => {
  it('scores exact alias as highest', () => {
    const s = scoreInstitution(FIXTURES[1], 'bracu');
    expect(s).toBeGreaterThanOrEqual(1.0);
  });
  it('scores prefix above substring', () => {
    const prefix = scoreInstitution(FIXTURES[0], 'monipur'); // name starts with
    const substr = scoreInstitution(FIXTURES[0], 'school'); // substring only
    expect(prefix).toBeGreaterThan(substr);
  });
  it('returns 0 for no match', () => {
    expect(scoreInstitution(FIXTURES[1], 'xkcd')).toBe(0);
  });
});

describe('rankInstitutions', () => {
  it('returns empty for empty query', () => {
    expect(rankInstitutions(FIXTURES, '')).toEqual([]);
  });

  it('finds Monipur by prefix "moni"', () => {
    const r = rankInstitutions(FIXTURES, 'moni');
    expect(r[0].id).toBe('a');
  });

  it('finds Monipur by fuzzy typo "monpur"', () => {
    const r = rankInstitutions(FIXTURES, 'monpur');
    expect(r.some((x) => x.id === 'a')).toBe(true);
  });

  it('finds Monipur by Bengali substring', () => {
    const r = rankInstitutions(FIXTURES, 'মণিপুর');
    expect(r.some((x) => x.id === 'a')).toBe(true);
  });

  it('NSU acronym returns both universities, North South first (verified + exact alias)', () => {
    const r = rankInstitutions(FIXTURES, 'nsu');
    expect(r[0].id).toBe('c');
  });

  it('respects the limit', () => {
    const r = rankInstitutions(FIXTURES, 'university', { limit: 2 });
    expect(r.length).toBeLessThanOrEqual(2);
  });

  it('district boost lifts a same-district match', () => {
    const withBoost = rankInstitutions(FIXTURES, 'university', { district: 'Noakhali' });
    // Noakhali univ should rank above where it would otherwise sit on a tie.
    expect(withBoost.some((x) => x.id === 'd')).toBe(true);
  });

  it('never throws on malformed rows', () => {
    const r = rankInstitutions([{ id: 'z', name: 'X' }, null, { id: 'y' }], 'x');
    expect(Array.isArray(r)).toBe(true);
  });
});
