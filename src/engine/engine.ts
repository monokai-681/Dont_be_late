import {
  ALARM_MAX,
  ALARM_MIN,
  ALARM_STEP,
  CLOCKIN_DEADLINE,
  DEBT_DECAY,
  FINAL_DAY_INDEX,
  ROUTINE_BASE,
  SNOOZE_PER,
  TARGET_SLEEP_MIN,
  WEEKEND_INDICES,
  WORK_DAY_INDICES,
} from './constants';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance';
import { calculateCommute } from './commute';
import { rollEvent } from './events';
import { applyPendingArrivals, onBuyItem } from './shop';
import { rollSnoozeCount } from './snooze';
import { calculateSOL } from './sol';
import type {
  Action,
  ActionRejectedReason,
  ActiveGameState,
  BaseGameState,
  BedtimeState,
  BribeState,
  CommuteId,
  CommuteState,
  DayRecord,
  EngineDeps,
  GameResult,
  IntroState,
  LoseReason,
  OfficeState,
  ResultState,
  SleepingState,
  WakeupState,
  WorkDayRecord,
} from './types';
import { assertFiniteNonNegative, assertNever } from './validation';
import { rollWeather } from './weather';

export class InvalidActionError extends Error {
  constructor(phase: string, actionType: string) {
    super(`Action ${actionType} is not valid during phase ${phase}`);
    this.name = 'InvalidActionError';
  }
}

export function createInitialState(
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): IntroState {
  return {
    phase: 'intro',
    dayIndex: 0,
    balance: config.INITIAL_BALANCE,
    sleepDebt: 0,
    bribeUsed: false,
    inventory: {
      pillow: false,
      eyeMask: false,
      earPlugs: false,
      smartLamp: false,
      dora: 0,
    },
    pendingArrivals: {
      pillow: false,
      eyeMask: false,
      earPlugs: false,
      smartLamp: false,
    },
    usedEventFlavors: [],
    dailyLog: [],
  };
}

export const INITIAL_STATE: IntroState = createInitialState();

export function calculateArrivalMinutes(
  alarmMin: number,
  routineMin: number,
  commuteMin: number,
): number {
  assertFiniteNonNegative(alarmMin, 'calculateArrivalMinutes:alarmMin');
  assertFiniteNonNegative(routineMin, 'calculateArrivalMinutes:routineMin');
  assertFiniteNonNegative(commuteMin, 'calculateArrivalMinutes:commuteMin');
  return alarmMin + routineMin + commuteMin;
}

function playing(state: ActiveGameState): GameResult {
  return { status: 'playing', state };
}

function rejected(
  state: ActiveGameState,
  reason: ActionRejectedReason,
): GameResult {
  return { status: 'rejected', state, reason };
}

function invalidAction(state: ActiveGameState | ResultState, action: Action): never {
  throw new InvalidActionError(state.phase, action.type);
}

function commonState(state: BaseGameState): BaseGameState {
  return {
    dayIndex: state.dayIndex,
    balance: state.balance,
    sleepDebt: state.sleepDebt,
    bribeUsed: state.bribeUsed,
    inventory: state.inventory,
    pendingArrivals: state.pendingArrivals,
    usedEventFlavors: state.usedEventFlavors,
    dailyLog: state.dailyLog,
  };
}

function enterDay(
  state: BaseGameState,
  dayIndex: number,
  deps: EngineDeps,
  dailyLog = state.dailyLog,
): BedtimeState {
  const config = deps.balance ?? DEFAULT_BALANCE_CONFIG;
  const withArrivals = applyPendingArrivals({ ...commonState(state), dailyLog });
  const weatherToday = rollWeather(dayIndex, deps.rng, config);
  const event = rollEvent(dayIndex, withArrivals.usedEventFlavors, deps.rng, config);
  const usedEventFlavors = event.newlyUsedFlavor
    ? [...withArrivals.usedEventFlavors, event.newlyUsedFlavor]
    : withArrivals.usedEventFlavors;

  return {
    ...withArrivals,
    phase: 'bedtime',
    dayIndex,
    balance: withArrivals.balance + config.DAILY_SALARY,
    isWorkDay: WORK_DAY_INDICES.includes(dayIndex),
    doraUsedTonight: false,
    weatherToday,
    eventToday: event.eventId,
    eventBonusMin: event.bonusMin,
    usedEventFlavors,
  };
}

function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDuration(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60}m`;
}

function commuteName(choice: CommuteId): string {
  switch (choice) {
    case 'subway':
      return '地铁';
    case 'express':
      return '快车';
    case 'premium':
      return '专车';
    default:
      return assertNever(choice, 'commuteName:choice');
  }
}

type WorkDayProgress = SleepingState | WakeupState | CommuteState | OfficeState | BribeState;

function workDayRecord(state: WorkDayProgress): WorkDayRecord {
  const record: WorkDayRecord = {
    day: state.dayIndex,
    isWorkDay: true,
    alarmHHMM: formatClock(state.alarmMin),
    sleepHHMM: formatDuration(state.actualSleepMin),
    sleepDebtAfter: state.sleepDebt,
    snoozeCount: 'snoozeCount' in state ? state.snoozeCount : 0,
    balanceAfter: state.balance,
  };

  if ('commuteChoice' in state) {
    record.commute = commuteName(state.commuteChoice);
    record.commuteCancelled = state.commuteCancelled;
    record.arriveHHMM = formatClock(state.arriveMin);
    record.isLate = state.isLate;
  }

  return record;
}

function resultState(
  state: BaseGameState,
  resultStatus: 'win' | 'lose',
  dailyLog: DayRecord[],
  loseReason?: LoseReason,
): ResultState {
  return {
    ...commonState(state),
    phase: 'result',
    resultStatus,
    loseReason,
    dailyLog,
  };
}

function lose(
  state: CommuteState | BribeState,
  reason: LoseReason,
): GameResult {
  const dailyLog = [...state.dailyLog, workDayRecord(state)];
  return { status: 'lose', state: resultState(state, 'lose', dailyLog, reason), reason };
}

function commuteCost(choice: CommuteId, config: BalanceConfig): number {
  switch (choice) {
    case 'subway':
      return config.COMMUTE_SUBWAY_COST;
    case 'express':
      return config.COMMUTE_EXPRESS_COST;
    case 'premium':
      return config.COMMUTE_PREMIUM_COST;
    default:
      return assertNever(choice, 'commuteCost:choice');
  }
}

function reduceBedtime(
  state: BedtimeState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  const config = deps.balance ?? DEFAULT_BALANCE_CONFIG;

  switch (action.type) {
    case 'BUY_ITEM': {
      const purchase = onBuyItem(state, action.itemId, action.qty, config);
      return purchase.ok ? playing(purchase.state) : rejected(state, purchase.reason);
    }
    case 'SET_ALARM':
      if (!state.isWorkDay) return invalidAction(state, action);
      if (
        !Number.isInteger(action.alarmMin)
        || action.alarmMin < ALARM_MIN
        || action.alarmMin > ALARM_MAX
        || action.alarmMin % ALARM_STEP !== 0
      ) {
        return rejected(state, 'INVALID_ALARM');
      }
      return playing({ ...state, alarmMin: action.alarmMin });
    case 'USE_DORA_TONIGHT':
      if (!state.isWorkDay) return invalidAction(state, action);
      if (state.doraUsedTonight) return rejected(state, 'DORA_ALREADY_USED');
      if (state.inventory.dora <= 0) return rejected(state, 'NO_DORA');
      return playing({
        ...state,
        doraUsedTonight: true,
        inventory: { ...state.inventory, dora: state.inventory.dora - 1 },
      });
    case 'START_SLEEP': {
      if (!state.isWorkDay) return invalidAction(state, action);
      if (state.alarmMin === undefined) return rejected(state, 'ALARM_NOT_SET');
      const solTonight = calculateSOL(state.inventory, state.doraUsedTonight, config);
      const actualSleepMin = Math.max(0, state.alarmMin - solTonight);
      const newDebtTonight = Math.max(0, TARGET_SLEEP_MIN - actualSleepMin);
      const sleepingState: SleepingState = {
        ...state,
        phase: 'sleeping',
        isWorkDay: true,
        alarmMin: state.alarmMin,
        solTonight,
        actualSleepMin,
        newDebtTonight,
        sleepDebt: state.sleepDebt * DEBT_DECAY + newDebtTonight,
      };
      return playing(sleepingState);
    }
    case 'PASS_WEEKEND': {
      if (!WEEKEND_INDICES.includes(state.dayIndex)) return invalidAction(state, action);
      const sleepDebt = state.sleepDebt * DEBT_DECAY;
      const dailyLog: DayRecord[] = [
        ...state.dailyLog,
        {
          day: state.dayIndex,
          isWorkDay: false,
          sleepDebtAfter: sleepDebt,
          balanceAfter: state.balance,
        },
      ];
      return playing(enterDay({ ...state, sleepDebt }, state.dayIndex + 1, deps, dailyLog));
    }
    default:
      return invalidAction(state, action);
  }
}

function reduceSleeping(
  state: SleepingState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  if (action.type !== 'WAKE_UP') return invalidAction(state, action);

  const snoozeCount = rollSnoozeCount(state.sleepDebt, state.inventory.smartLamp, deps.rng);
  const wakeupState: WakeupState = {
    ...state,
    phase: 'wakeup',
    snoozeCount,
    routineMin: ROUTINE_BASE + snoozeCount * SNOOZE_PER,
  };
  return playing(wakeupState);
}

function reduceWakeup(state: WakeupState, action: Action): GameResult {
  if (action.type !== 'CONTINUE_TO_COMMUTE') return invalidAction(state, action);
  return playing({ ...state, phase: 'commute' });
}

function reduceCommute(
  state: CommuteState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  if (action.type !== 'CHOOSE_COMMUTE') return invalidAction(state, action);
  const config = deps.balance ?? DEFAULT_BALANCE_CONFIG;
  const selectedCost = commuteCost(action.choice, config);
  const cheapestCost = Math.min(
    config.COMMUTE_SUBWAY_COST,
    config.COMMUTE_EXPRESS_COST,
    config.COMMUTE_PREMIUM_COST,
  );
  if (state.balance < cheapestCost) return lose(state, 'CANNOT_AFFORD_COMMUTE');

  if (state.balance < selectedCost) return rejected(state, 'INSUFFICIENT_FUNDS');

  const commute = calculateCommute(
    action.choice,
    state.weatherToday === 'snow',
    state.eventBonusMin,
    deps.rng,
    config,
  );
  const arriveMin = calculateArrivalMinutes(state.alarmMin, state.routineMin, commute.commuteMin);
  const balance = state.balance - commute.commuteCost;
  const resolved = {
    ...state,
    balance,
    commuteChoice: action.choice,
    commuteMin: commute.commuteMin,
    commuteCancelled: commute.cancelled,
    arriveMin,
  };

  if (arriveMin > CLOCKIN_DEADLINE) {
    const bribeState: BribeState = { ...resolved, phase: 'bribe', isLate: true };
    return state.bribeUsed ? lose(bribeState, 'SECOND_LATE') : playing(bribeState);
  }

  const officeState: OfficeState = { ...resolved, phase: 'office', isLate: false };
  return playing(officeState);
}

function reduceOffice(
  state: OfficeState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  if (action.type !== 'CONTINUE_TO_NEXT_DAY') return invalidAction(state, action);
  const dailyLog = [...state.dailyLog, workDayRecord(state)];

  if (state.dayIndex === FINAL_DAY_INDEX) {
    const finalState = resultState(state, 'win', dailyLog);
    return { status: 'win', state: finalState, finalBalance: finalState.balance };
  }

  return playing(enterDay(state, state.dayIndex + 1, deps, dailyLog));
}

function reduceBribe(
  state: BribeState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  const config = deps.balance ?? DEFAULT_BALANCE_CONFIG;

  switch (action.type) {
    case 'CHOOSE_BRIBE':
      if (state.balance < config.BRIBE_COST) return lose(state, 'CANNOT_AFFORD_BRIBE');
      return playing({
        ...state,
        phase: 'office',
        balance: state.balance - config.BRIBE_COST,
        bribeUsed: true,
        isLate: false,
      });
    case 'DECLINE_BRIBE':
      return lose(state, 'REFUSED_BRIBE');
    default:
      return invalidAction(state, action);
  }
}

export function reducer(
  state: ActiveGameState | ResultState,
  action: Action,
  deps: EngineDeps,
): GameResult {
  switch (state.phase) {
    case 'intro':
      return action.type === 'START_GAME'
        ? playing(enterDay(state, 1, deps))
        : invalidAction(state, action);
    case 'bedtime':
      return reduceBedtime(state, action, deps);
    case 'sleeping':
      return reduceSleeping(state, action, deps);
    case 'wakeup':
      return reduceWakeup(state, action);
    case 'commute':
      return reduceCommute(state, action, deps);
    case 'office':
      return reduceOffice(state, action, deps);
    case 'bribe':
      return reduceBribe(state, action, deps);
    case 'result':
      return invalidAction(state, action);
    default:
      return assertNever(state, 'reducer:state');
  }
}
