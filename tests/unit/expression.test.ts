import { describe, expect, it } from 'vitest';
import { compile, parseExpression, ParseError } from '@/lib/math/expression';

const f = (src: string, x = 0) => compile(src)(x);

describe('restricted expression parser', () => {
  it('respects precedence and associativity', () => {
    expect(f('1 + 2 * 3')).toBe(7);
    expect(f('(1 + 2) * 3')).toBe(9);
    expect(f('2 ^ 3 ^ 2')).toBe(512); // right-associative
    expect(f('-2 ^ 2')).toBe(-4);
    expect(f('10 / 4 / 5')).toBeCloseTo(0.5);
  });

  it('supports implicit multiplication', () => {
    expect(f('2x', 3)).toBe(6);
    expect(f('2sin(x)', Math.PI / 2)).toBeCloseTo(2);
    expect(f('(x+1)(x-1)', 3)).toBe(8);
  });

  it('supports constants, functions and absolute value bars', () => {
    expect(f('pi')).toBeCloseTo(Math.PI);
    expect(f('e')).toBeCloseTo(Math.E);
    expect(f('sqrt(16) + abs(-2) + |x - 5|', 1)).toBe(10);
    expect(f('sigmoid(0)')).toBe(0.5);
    expect(f('relu(x)', -3)).toBe(0);
  });

  it('rejects unknown identifiers (no access to globals)', () => {
    for (const bad of [
      'constructor',
      'process',
      'window',
      'alert(1)',
      'y + 1',
      'Math.sin(x)',
      'this',
    ]) {
      expect(() => parseExpression(bad)).toThrow(ParseError);
    }
  });

  it('rejects code-like input and malformed expressions', () => {
    for (const bad of ['', '1 +', '(1 + 2', 'x;', '"x"', '`x`', 'x = 1', '1 2 +', 'sin x', '[]']) {
      expect(() => parseExpression(bad)).toThrow(ParseError);
    }
  });

  it('limits length and nesting depth', () => {
    expect(() => parseExpression('x+'.repeat(100) + 'x')).toThrow(/longer/);
    expect(() => parseExpression('('.repeat(60) + 'x' + ')'.repeat(60))).toThrow(ParseError);
  });

  it('returns non-finite values instead of throwing for domain errors', () => {
    expect(f('ln(x)', -1)).toBeNaN();
    expect(f('1 / x', 0)).toBe(Infinity);
  });
});
