import { rollEvent, type Rng } from '../engine';

function sequenceRng(...values: number[]): Rng {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('rollEvent', () => {
  test('Day 12 always returns the holiday rush without consuming RNG', () => {
    let calls = 0;
    const result = rollEvent(12, [], () => {
      calls += 1;
      return 0;
    });

    expect(result).toEqual({ eventId: 'holidayRush', bonusMin: 20 });
    expect(calls).toBe(0);
  });

  test.each([4, 5])('Day %i does not trigger at the 50%% boundary', dayIndex => {
    expect(rollEvent(dayIndex, [], () => 0.5)).toEqual({ eventId: null, bonusMin: 0 });
  });

  test('normal events exclude previously used flavors', () => {
    const result = rollEvent(4, ['concert'], sequenceRng(0.1, 0));

    expect(result).toEqual({
      eventId: 'expo',
      bonusMin: 15,
      newlyUsedFlavor: 'expo',
    });
  });

  test('the only unused normal flavor is selected deterministically', () => {
    const result = rollEvent(5, ['concert', 'expo'], sequenceRng(0.1, 0.999));

    expect(result).toEqual({
      eventId: 'marathon',
      bonusMin: 15,
      newlyUsedFlavor: 'marathon',
    });
  });

  test.each([0, 1, 2, 3, 6, 7, 8, 9, 10, 11])(
    'Day %i has no event and does not consume RNG',
    dayIndex => {
      let calls = 0;
      const result = rollEvent(dayIndex, [], () => {
        calls += 1;
        return 0;
      });

      expect(result).toEqual({ eventId: null, bonusMin: 0 });
      expect(calls).toBe(0);
    },
  );

  test.each([-1, 1.5, 13])('rejects invalid dayIndex %s', dayIndex => {
    expect(() => rollEvent(dayIndex, [], () => 0)).toThrow(RangeError);
  });
});
