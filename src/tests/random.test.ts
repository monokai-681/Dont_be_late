import {
  createRng,
  createRngFromString,
  rngInt,
  rngPickIndex,
} from '../engine';

describe('random utilities', () => {
  test('the same numeric seed reproduces the same sequence', () => {
    const first = createRng(12345);
    const second = createRng(12345);

    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
  });

  test('the same string seed reproduces the same sequence', () => {
    const first = createRngFromString('player-1');
    const second = createRngFromString('player-1');

    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
  });

  test('rngInt includes both endpoints', () => {
    expect(rngInt(() => 0, 2, 5)).toBe(2);
    expect(rngInt(() => 0.999999, 2, 5)).toBe(5);
    expect(rngInt(() => 0.5, 3, 3)).toBe(3);
  });

  test.each([
    [1.5, 3],
    [1, 3.5],
  ])('rngInt rejects non-integer bounds %s and %s', (min, max) => {
    expect(() => rngInt(() => 0, min, max)).toThrow(TypeError);
  });

  test('rngInt rejects reversed bounds', () => {
    expect(() => rngInt(() => 0, 5, 2)).toThrow(RangeError);
  });

  test('rngPickIndex selects a valid index and rejects an empty array', () => {
    expect(rngPickIndex(() => 0, ['a', 'b', 'c'])).toBe(0);
    expect(rngPickIndex(() => 0.999999, ['a', 'b', 'c'])).toBe(2);
    expect(() => rngPickIndex(() => 0, [])).toThrow('rngPickIndex: empty array');
  });
});
