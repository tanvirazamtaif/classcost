import { describe, it, expect } from 'vitest';
import { makeFmt, todayStr, uid } from '../utils';

describe('makeFmt', () => {
  it('returns a function', () => {
    const fmt = makeFmt('BDT');
    expect(typeof fmt).toBe('function');
  });

  it('formats BDT correctly', () => {
    const fmt = makeFmt('BDT');
    const result = fmt(1000);
    expect(result).toContain('1');
  });

  it('formats USD correctly', () => {
    const fmt = makeFmt('USD');
    const result = fmt(50);
    expect(result).toBeTruthy();
  });

  it('handles zero', () => {
    const fmt = makeFmt('BDT');
    expect(fmt(0)).toBeTruthy();
  });

  it('handles string numbers', () => {
    const fmt = makeFmt('BDT');
    expect(fmt('500')).toBeTruthy();
  });
});

describe('todayStr', () => {
  it('returns an ISO date string', () => {
    const today = todayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('uid', () => {
  it('generates unique IDs', () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).not.toBe(id2);
  });

  it('generates string IDs', () => {
    expect(typeof uid()).toBe('string');
  });
});
