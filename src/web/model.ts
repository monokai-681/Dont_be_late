import type { ActiveGameState, GameState } from '../engine';

export type MechanicId = 'sleepDebt' | 'delivery' | 'dora' | 'weather' | 'event' | 'bribe';

export const WEEKDAYS: Record<number, string> = {
  1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五',
  6: '周六', 7: '周日', 8: '周一', 9: '周二', 10: '周三', 11: '周四', 12: '周五',
};

export const WORKDAY_NUMBER: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10,
};

export function weekAndWeekday(dayIndex: number): string {
  return `第${dayIndex <= 7 ? '一' : '二'}周·${WEEKDAYS[dayIndex]}`;
}

export function statusDayLabel(dayIndex: number): string {
  const completedWorkdays = dayIndex <= 5 ? dayIndex : dayIndex <= 7 ? 5 : dayIndex - 2;
  return `${WEEKDAYS[dayIndex]} ${completedWorkdays}/10`;
}

export function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} 小时 ${minutes} 分钟`;
}

export function currentTime(state: GameState): string {
  switch (state.phase) {
    case 'intro': return '--:--';
    case 'bedtime': return '00:00';
    case 'sleeping': return formatClock(state.alarmMin);
    case 'wakeup': return formatClock(state.alarmMin + state.snoozeCount * 9);
    case 'commute': return formatClock(state.alarmMin + state.routineMin);
    case 'office':
    case 'bribe': return formatClock(state.arriveMin);
    case 'result': return '--:--';
  }
}

export function progressText(state: GameState): string {
  if (state.dayIndex === 0) return '尚未开始';
  const workday = WORKDAY_NUMBER[state.dayIndex];
  return workday ? `工作日 ${workday} / 10` : '周末恢复';
}

export function discoveriesForState(state: ActiveGameState): MechanicId[] {
  const discoveries: MechanicId[] = [];
  if (
    state.sleepDebt > 0
    && ['wakeup', 'commute', 'office', 'bribe'].includes(state.phase)
  ) discoveries.push('sleepDebt');
  if (Object.values(state.pendingArrivals).some(Boolean)) discoveries.push('delivery');
  if (state.inventory.dora > 0 || ('doraUsedTonight' in state && state.doraUsedTonight)) discoveries.push('dora');
  if ('weatherToday' in state && state.weatherToday === 'snow') discoveries.push('weather');
  if ('eventToday' in state && state.eventToday !== null) discoveries.push('event');
  if (state.phase === 'bribe' || state.bribeUsed) discoveries.push('bribe');
  return discoveries;
}
