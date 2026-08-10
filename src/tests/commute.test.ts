import {
  DEFAULT_BALANCE_CONFIG,
  calculateCommute,
  createRng,
} from '../engine';

describe('D-8 commute balance', () => {
  test.each([
    [false, 0],
    [false, 15],
    [false, 20],
    [true, 0],
    [true, 15],
    [true, 20],
  ])('subway ignores snow=%s and event bonus=%i', (isSnow, eventBonus) => {
    let rngCalls = 0;
    const result = calculateCommute('subway', isSnow, eventBonus, () => {
      rngCalls += 1;
      return 0.999999;
    });

    expect(result).toEqual({
      commuteMin: 60,
      commuteCost: 5,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(rngCalls).toBe(0);
  });

  test('rejects unsupported commute choices at runtime', () => {
    expect(() => calculateCommute('bike' as never, false, 0, () => 0)).toThrow(RangeError);
  });

  test.each([-1, 1.5, 21])('rejects invalid event bonus %s', eventBonus => {
    expect(() => calculateCommute('express', false, eventBonus, () => 0)).toThrow(RangeError);
  });

  test('rejects a non-boolean snow flag at runtime', () => {
    expect(() => calculateCommute('express', 'yes' as never, 0, () => 0)).toThrow(TypeError);
  });

  test('the immutable default config contains the subway risk values', () => {
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_MIN).toBe(60);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_COST).toBe(5);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_FAILURE_RATE).toBe(0);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_FAILURE_EXTRA_MIN).toBe(15);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_MISSED_STOP_DEBT_THRESHOLD).toBe(180);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_MISSED_STOP_DEBT_CAP).toBe(300);
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_MISSED_STOP_EXTRA_MIN).toBe(20);
    expect(Object.isFrozen(DEFAULT_BALANCE_CONFIG)).toBe(true);
  });

  test('accepts an isolated config copy without mutating defaults', () => {
    const config = {
      ...DEFAULT_BALANCE_CONFIG,
      COMMUTE_SUBWAY_MIN: 10,
      COMMUTE_SUBWAY_COST: 1,
      COMMUTE_SUBWAY_FAILURE_RATE: 0,
    };

    expect(calculateCommute('subway', false, 0, () => 0, config)).toEqual({
      commuteMin: 10,
      commuteCost: 1,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(DEFAULT_BALANCE_CONFIG.COMMUTE_SUBWAY_MIN).toBe(60);
  });

  test('express cancellation remains a single ten-minute penalty', () => {
    let rngCalls = 0;
    const result = calculateCommute('express', true, 15, () => {
      rngCalls += 1;
      return 0;
    });

    expect(result).toEqual({
      commuteMin: 60,
      commuteCost: 30,
      cancelled: true,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(rngCalls).toBe(1);
  });

  test('express cancellation threshold remains 30%', () => {
    expect(calculateCommute('express', false, 0, () => 0.299999)).toEqual({
      commuteMin: 35,
      commuteCost: 30,
      cancelled: true,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(calculateCommute('express', false, 0, () => 0.3)).toEqual({
      commuteMin: 25,
      commuteCost: 30,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: false,
    });
  });

  test('express cancellation distribution converges near 30%', () => {
    const samples = 100_000;
    const rng = createRng(30);
    let cancellations = 0;

    for (let i = 0; i < samples; i += 1) {
      if (calculateCommute('express', false, 0, rng).cancelled) {
        cancellations += 1;
      }
    }

    expect(cancellations / samples).toBeCloseTo(0.3, 2);
  });

  test('snow plus a normal event is capped before cancellation time', () => {
    expect(calculateCommute('express', true, 15, () => 0.9).commuteMin).toBe(50);
    expect(calculateCommute('express', true, 15, () => 0.1).commuteMin).toBe(60);
  });

  test('premium never cancels but still receives capped disruption time', () => {
    let rngCalls = 0;
    const result = calculateCommute('premium', true, 20, () => {
      rngCalls += 1;
      return 0;
    });

    expect(result).toEqual({
      commuteMin: 50,
      commuteCost: 60,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(rngCalls).toBe(0);
  });

  test('subway failure threshold adds exactly fifteen minutes', () => {
    const enabledFailure = { ...DEFAULT_BALANCE_CONFIG, COMMUTE_SUBWAY_FAILURE_RATE: 0.01 };
    expect(calculateCommute('subway', true, 20, () => 0.009999, enabledFailure)).toEqual({
      commuteMin: 75,
      commuteCost: 5,
      cancelled: false,
      subwayFailed: true,
      subwayMissedStop: false,
    });
    expect(calculateCommute('subway', true, 20, () => 0.01, enabledFailure)).toEqual({
      commuteMin: 60,
      commuteCost: 5,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: false,
    });
  });

  test('subway failure distribution converges near one percent', () => {
    const samples = 100_000;
    const rng = createRng(5);
    const enabledFailure = { ...DEFAULT_BALANCE_CONFIG, COMMUTE_SUBWAY_FAILURE_RATE: 0.01 };
    let failures = 0;

    for (let i = 0; i < samples; i += 1) {
      if (calculateCommute('subway', false, 0, rng, enabledFailure).subwayFailed) failures += 1;
    }

    expect(failures / samples).toBeCloseTo(0.01, 2);
  });

  test('sleep debt 240 has a 50% subway missed-stop probability', () => {
    expect(calculateCommute('subway', false, 0, () => 0.499999, DEFAULT_BALANCE_CONFIG, 240)).toEqual({
      commuteMin: 80,
      commuteCost: 5,
      cancelled: false,
      subwayFailed: false,
      subwayMissedStop: true,
    });
    expect(calculateCommute('subway', false, 0, () => 0.5, DEFAULT_BALANCE_CONFIG, 240)).toMatchObject({
      commuteMin: 60,
      subwayMissedStop: false,
    });
  });

  test('the missed-stop risk is disabled through 180 debt and guaranteed at 300 debt', () => {
    expect(calculateCommute('subway', false, 0, () => 0, DEFAULT_BALANCE_CONFIG, 180)).toMatchObject({
      commuteMin: 60,
      subwayFailed: false,
      subwayMissedStop: false,
    });
    expect(calculateCommute('subway', false, 0, () => 0.999999, DEFAULT_BALANCE_CONFIG, 300)).toMatchObject({
      commuteMin: 80,
      subwayFailed: false,
      subwayMissedStop: true,
    });
  });

  test('missed stop takes priority over an enabled subway failure', () => {
    const enabledFailure = { ...DEFAULT_BALANCE_CONFIG, COMMUTE_SUBWAY_FAILURE_RATE: 0.01 };
    const result = calculateCommute('subway', false, 0, () => 0, enabledFailure, 300);
    expect(result).toMatchObject({ commuteMin: 80, subwayFailed: false, subwayMissedStop: true });
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid sleep debt %s', sleepDebt => {
    expect(() => calculateCommute('subway', false, 0, () => 1, DEFAULT_BALANCE_CONFIG, sleepDebt)).toThrow();
  });
});
