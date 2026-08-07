import { createInitialState, type BedtimeState, type WakeupState } from '../engine';
import { currentTime, discoveriesForState, progressText } from '../web/model';

describe('web presentation model', () => {
  test('derives the limited status-bar times from engine phases', () => {
    const bedtime: BedtimeState = {
      ...createInitialState(), phase: 'bedtime', dayIndex: 1, isWorkDay: true,
      doraUsedTonight: false, weatherToday: 'clear', eventToday: null, eventBonusMin: 0,
    };
    const wakeup: WakeupState = {
      ...bedtime, phase: 'wakeup', alarmMin: 420, solTonight: 45, actualSleepMin: 375,
      newDebtTonight: 105, sleepDebt: 105, snoozeCount: 2, routineMin: 43,
    };
    expect(currentTime(bedtime)).toBe('00:00');
    expect(currentTime(wakeup)).toBe('07:18');
    expect(progressText(wakeup)).toBe('工作日 1 / 10');
  });

  test('discovers sleep debt only after it has affected the first morning', () => {
    const wakeup = {
      ...createInitialState(), phase: 'wakeup' as const, dayIndex: 1, isWorkDay: true,
      doraUsedTonight: false, weatherToday: 'clear' as const, eventToday: null, eventBonusMin: 0,
      alarmMin: 420, solTonight: 45, actualSleepMin: 375, newDebtTonight: 105,
      sleepDebt: 105, snoozeCount: 2, routineMin: 43,
    };
    expect(discoveriesForState(wakeup)).toContain('sleepDebt');
  });
});
