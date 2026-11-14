import { describe, it, expect } from 'vitest';
import { parseDollarsToCents, formatCents } from './money.js';

describe('parseDollarsToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['0.01', 1],
    ['1234.56', 123456],
  ])('accepts valid dollar string "%s" and returns %d cents', (input, expected) => {
    expect(parseDollarsToCents(input)).toBe(expected);
  });

  it.each(['0', '-1', '12.345', 'abc', '', '   ', '0.00', '-12.50'])(
    'rejects invalid or non-positive input "%s"',
    (input) => {
      expect(parseDollarsToCents(input)).toBeNull();
    },
  );
});

describe('formatCents', () => {
  it('formats positive cents with dollar sign, comma separators, and two decimal places', () => {
    expect(formatCents(123450)).toBe('$1,234.50');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(50)).toBe('$0.50');
    expect(formatCents(100)).toBe('$1.00');
    expect(formatCents(100000)).toBe('$1,000.00');
    expect(formatCents(1500)).toBe('$15.00');
  });

  it('formats negative cents with negative sign', () => {
    expect(formatCents(-20000)).toMatch(/-\$200\.00|\$-200\.00/);
  });
});
