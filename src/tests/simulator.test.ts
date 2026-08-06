import { formatSimulationReport, runSimulation } from '../simulator';

describe('multi-strategy simulator', () => {
  test('runs all three strategies and keeps every outcome accounted for', () => {
    const report = runSimulation({ games: 100, seed: 123 });

    expect(report.strategies.map(strategy => strategy.id)).toEqual([
      'fixed',
      'adaptive',
      'safe',
    ]);
    for (const strategy of report.strategies) {
      const losses = Object.values(strategy.failures).reduce((sum, count) => sum + count, 0);
      const attributed = Object.values(strategy.attribution).reduce((sum, count) => sum + count, 0);
      expect(strategy.wins + losses).toBe(100);
      expect(attributed).toBe(losses);
      expect(strategy.winRate).toBeGreaterThanOrEqual(0);
      expect(strategy.winRate).toBeLessThanOrEqual(1);
    }
    expect(report.strategies.find(strategy => strategy.id === 'fixed')?.winRate).toBeLessThan(1);
  });

  test('is reproducible for the same seed', () => {
    const first = runSimulation({ games: 50, seed: 456 });
    const second = runSimulation({ games: 50, seed: 456 });
    expect(second).toEqual(first);
  });

  test('can run a selected strategy only', () => {
    const report = runSimulation({ games: 20, seed: 789, strategyIds: ['safe'] });
    expect(report.strategies).toHaveLength(1);
    expect(report.strategies[0].id).toBe('safe');
    expect(report.d9.safePureRngFailureRate).toBeCloseTo(
      1 - report.strategies[0].winRate,
    );
  });

  test('formats a human-readable report with D-9 status', () => {
    const text = formatSimulationReport(runSimulation({ games: 5, seed: 1 }), 12);
    expect(text).toContain('固定 07:00 地铁');
    expect(text).toContain('普通自适应');
    expect(text).toContain('安全参考');
    expect(text).toContain('D-9');
    expect(text).toContain('用时 12 ms');
  });

  test.each([0, -1, 1.5])('rejects invalid game count %s', games => {
    expect(() => runSimulation({ games })).toThrow(RangeError);
  });

  test('rejects a non-integer seed', () => {
    expect(() => runSimulation({ games: 1, seed: 1.5 })).toThrow(TypeError);
  });
});
