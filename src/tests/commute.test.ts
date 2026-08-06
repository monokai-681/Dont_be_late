import {
  Balance,
  calculateCommute,
  createRng,
  resetBalanceToDefaults,
} from '../engine';

describe('D-8 commute balance', () => {
  beforeEach(() => {
    resetBalanceToDefaults();
  });

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
      return 0;
    });

    expect(result).toEqual({
      commuteMin: 60,
      commuteCost: 5,
      cancelled: false,
    });
    expect(rngCalls).toBe(0);
  });

  test('reset restores the D-8 subway defaults', () => {
    Balance.COMMUTE_SUBWAY_MIN = 1;
    Balance.COMMUTE_SUBWAY_COST = 1;

    resetBalanceToDefaults();

    expect(Balance.COMMUTE_SUBWAY_MIN).toBe(60);
    expect(Balance.COMMUTE_SUBWAY_COST).toBe(5);
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
    });
    expect(rngCalls).toBe(1);
  });

  test('express cancellation threshold remains 30%', () => {
    expect(calculateCommute('express', false, 0, () => 0.299999)).toEqual({
      commuteMin: 35,
      commuteCost: 30,
      cancelled: true,
    });
    expect(calculateCommute('express', false, 0, () => 0.3)).toEqual({
      commuteMin: 25,
      commuteCost: 30,
      cancelled: false,
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
    });
    expect(rngCalls).toBe(0);
  });
});
