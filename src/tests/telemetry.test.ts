import {
  createInitialState,
  createTelemetryReport,
  DEFAULT_BALANCE_CONFIG,
  type ResultState,
} from '../engine';

describe('telemetry reports', () => {
  test('serializes replay data and the hidden net sleep debt without personal data', () => {
    const state: ResultState = {
      ...createInitialState(),
      phase: 'result',
      resultStatus: 'lose',
      loseReason: 'REFUSED_BRIBE',
      dayIndex: 3,
      netSleepDebt: 315,
      telemetry: [{ type: 'alarm_set', day: 1, alarmMin: 420 }],
    };

    expect(createTelemetryReport(state, 'test-seed', DEFAULT_BALANCE_CONFIG)).toMatchObject({
      schemaVersion: 1,
      gameVersion: '0.1.0',
      seed: 'test-seed',
      outcome: { status: 'lose', loseReason: 'REFUSED_BRIBE', netSleepDebt: 315 },
      events: [{ type: 'alarm_set', day: 1, alarmMin: 420 }],
    });
  });
});
