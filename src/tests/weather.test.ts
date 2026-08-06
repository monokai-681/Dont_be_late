import { rollWeather } from '../engine';

describe('rollWeather', () => {
  test('Day 1 is always clear without consuming RNG', () => {
    let calls = 0;
    const weather = rollWeather(1, () => {
      calls += 1;
      return 0;
    });

    expect(weather).toBe('clear');
    expect(calls).toBe(0);
  });

  test('Day 12 uses the 70% snow threshold', () => {
    expect(rollWeather(12, () => 0.699999)).toBe('snow');
    expect(rollWeather(12, () => 0.7)).toBe('clear');
  });

  test.each([2, 3, 4, 5, 8, 9, 10, 11])(
    'Day %i uses the normal 20%% snow threshold',
    dayIndex => {
      expect(rollWeather(dayIndex, () => 0.199999)).toBe('snow');
      expect(rollWeather(dayIndex, () => 0.2)).toBe('clear');
    },
  );

  test.each([0, 6, 7])('non-commute Day %i is clear without consuming RNG', dayIndex => {
    let calls = 0;
    const weather = rollWeather(dayIndex, () => {
      calls += 1;
      return 0;
    });

    expect(weather).toBe('clear');
    expect(calls).toBe(0);
  });

  test.each([-1, 1.5, 13])('rejects invalid dayIndex %s', dayIndex => {
    expect(() => rollWeather(dayIndex, () => 0)).toThrow(RangeError);
  });
});
