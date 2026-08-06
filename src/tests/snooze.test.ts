import {
  ALARM_MIN,
  CLOCKIN_DEADLINE,
  DEFAULT_BALANCE_CONFIG,
  ROUTINE_BASE,
  SNOOZE_MAX,
  SNOOZE_PER,
  createRng,
  rollSnoozeCount,
} from '../engine';

describe('D-8 snooze balance', () => {
  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid sleep debt %s',
    sleepDebt => {
      expect(() => rollSnoozeCount(sleepDebt, false, () => 0)).toThrow(RangeError);
    },
  );

  test('locks the 09:00 deadline and six-snooze cap', () => {
    expect(CLOCKIN_DEADLINE).toBe(540);
    expect(SNOOZE_MAX).toBe(6);
    expect(SNOOZE_PER).toBe(9);
    expect(DEFAULT_BALANCE_CONFIG.WORKDAY_DEBT_CARRY).toBe(0.5);
    expect(DEFAULT_BALANCE_CONFIG.WEEKEND_DEBT_DECAY).toBe(0.5);
    expect(DEFAULT_BALANCE_CONFIG.SNOOZE_GRADIENT).toBe(60);
  });

  test('caps high sleep debt at six snoozes', () => {
    expect(rollSnoozeCount(360, false, () => 0)).toBe(6);
    expect(rollSnoozeCount(10_000, false, () => 0.999)).toBe(6);
  });

  test('zero sleep debt never produces a snooze', () => {
    const rng = createRng(0);
    let maxObserved = 0;

    for (let i = 0; i < 1_000_000; i += 1) {
      maxObserved = Math.max(maxObserved, rollSnoozeCount(0, false, rng));
    }

    expect(maxObserved).toBe(0);
  });

  test('60 minutes of debt with a lamp snoozes about 65% of mornings', () => {
    const samples = 100_000;
    const rng = createRng(100);
    let snoozed = 0;

    for (let i = 0; i < samples; i += 1) {
      snoozed += rollSnoozeCount(60, true, rng);
    }

    expect(snoozed / samples).toBeCloseTo(0.65, 2);
  });

  test.each([
    [50, [0, 1]],
    [90, [1, 2]],
    [150, [2, 3]],
    [330, [5, 6]],
  ])('debt=%i only produces adjacent counts %j', (debt, allowed) => {
    const rng = createRng(debt);
    const observed = new Set<number>();

    for (let i = 0; i < 10_000; i += 1) {
      observed.add(rollSnoozeCount(debt, false, rng));
    }

    expect([...observed].sort((a, b) => a - b)).toEqual(allowed);
  });

  test('smart lamp keeps the expected snooze count near 65%', () => {
    const samples = 100_000;
    const withoutLampRng = createRng(20260806);
    const withLampRng = createRng(20260806);
    let withoutLampTotal = 0;
    let withLampTotal = 0;

    for (let i = 0; i < samples; i += 1) {
      withoutLampTotal += rollSnoozeCount(350, false, withoutLampRng);
      withLampTotal += rollSnoozeCount(350, true, withLampRng);
    }

    expect(withLampTotal / withoutLampTotal).toBeCloseTo(0.65, 2);
  });

  test('the gradient is injectable for parameter scans', () => {
    const config = { ...DEFAULT_BALANCE_CONFIG, SNOOZE_GRADIENT: 100 };
    expect(rollSnoozeCount(150, false, () => 0.25, config)).toBe(2);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid gradient %s',
    gradient => {
      const config = { ...DEFAULT_BALANCE_CONFIG, SNOOZE_GRADIENT: gradient };
      expect(() => rollSnoozeCount(100, false, () => 0, config)).toThrow(RangeError);
    },
  );

  test('07:00 plus subway is on time for 0-3 snoozes and late for 4-6', () => {
    const subwayMin = 60;

    for (let count = 0; count <= SNOOZE_MAX; count += 1) {
      const arrival = ALARM_MIN + ROUTINE_BASE + count * SNOOZE_PER + subwayMin;
      expect(arrival <= CLOCKIN_DEADLINE).toBe(count <= 3);
    }
  });
});
