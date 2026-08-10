import type { BalanceConfig } from './config/balance';
import type { Rng } from './random';

export type CommuteId = 'subway' | 'express' | 'premium';
export type WeatherLogic = 'clear' | 'snow';
export type NormalEventId = 'concert' | 'expo' | 'marathon';
export type EventId = null | NormalEventId | 'holidayRush';

export type LoseReason =
  | 'CANNOT_AFFORD_BRIBE'
  | 'REFUSED_BRIBE'
  | 'SECOND_LATE'
  | 'CANNOT_AFFORD_COMMUTE';

export type ActionRejectedReason =
  | 'INVALID_ALARM'
  | 'ALARM_NOT_SET'
  | 'INSUFFICIENT_FUNDS'
  | 'ALREADY_OWNED'
  | 'ALREADY_PENDING'
  | 'INVALID_QUANTITY'
  | 'NO_DORA'
  | 'DORA_ALREADY_USED';

export interface CommuteResult {
  commuteMin: number;
  commuteCost: number;
  cancelled: boolean;
  subwayFailed: boolean;
  subwayMissedStop: boolean;
}

export interface Inventory {
  pillow: boolean;
  eyeMask: boolean;
  earPlugs: boolean;
  smartLamp: boolean;
  dora: number;
}

export interface PendingArrivals {
  pillow: boolean;
  eyeMask: boolean;
  earPlugs: boolean;
  smartLamp: boolean;
}

interface DayRecordBase {
  day: number;
  sleepDebtAfter: number;
  balanceAfter: number;
}

export interface WorkDayRecord extends DayRecordBase {
  isWorkDay: true;
  alarmHHMM: string;
  sleepHHMM: string;
  snoozeCount: number;
  commute?: string;
  commuteCancelled?: boolean;
  subwayFailed?: boolean;
  subwayMissedStop?: boolean;
  arriveHHMM?: string;
  isLate?: boolean;
}

export interface WeekendRecord extends DayRecordBase {
  isWorkDay: false;
}

export type DayRecord = WorkDayRecord | WeekendRecord;

export type TelemetryEvent =
  | { type: 'game_started'; day: 1 }
  | { type: 'item_bought'; day: number; itemId: ShopItemId; qty: number; balanceAfter: number }
  | { type: 'alarm_set'; day: number; alarmMin: number }
  | { type: 'dora_used'; day: number; remainingDora: number }
  | { type: 'sleep_resolved'; day: number; solMin: number; actualSleepMin: number; newDebtMin: number; sleepDebt: number; netSleepDebt: number }
  | { type: 'wakeup_resolved'; day: number; snoozeCount: number; routineMin: number }
  | { type: 'commute_resolved'; day: number; choice: CommuteId; commuteMin: number; cost: number; arriveMin: number; cancelled: boolean; subwayFailed: boolean; subwayMissedStop: boolean }
  | { type: 'weekend_completed'; day: number; sleepDebt: number; netSleepDebt: number }
  | { type: 'bribe_chosen'; day: number; accepted: boolean; balanceAfter: number };

export interface BaseGameState {
  dayIndex: number;
  balance: number;
  sleepDebt: number;
  /** Hidden cumulative sleep loss: never decays and is not shown to the player. */
  netSleepDebt: number;
  telemetry: TelemetryEvent[];
  bribeUsed: boolean;
  inventory: Inventory;
  pendingArrivals: PendingArrivals;
  usedEventFlavors: NormalEventId[];
  dailyLog: DayRecord[];
}

interface DayContext {
  isWorkDay: boolean;
  doraUsedTonight: boolean;
  weatherToday: WeatherLogic;
  eventToday: EventId;
  eventBonusMin: number;
}

interface SleepContext extends DayContext {
  alarmMin: number;
  solTonight: number;
  actualSleepMin: number;
  newDebtTonight: number;
}

interface WakeContext extends SleepContext {
  snoozeCount: number;
  routineMin: number;
}

interface CommuteResolutionContext extends WakeContext {
  commuteChoice: CommuteId;
  commuteMin: number;
  commuteCancelled: boolean;
  subwayFailed: boolean;
  subwayMissedStop: boolean;
  arriveMin: number;
}

export interface IntroState extends BaseGameState {
  phase: 'intro';
  dayIndex: 0;
}

export interface BedtimeState extends BaseGameState, DayContext {
  phase: 'bedtime';
  alarmMin?: number;
}

export interface SleepingState extends BaseGameState, SleepContext {
  phase: 'sleeping';
}

export interface WakeupState extends BaseGameState, WakeContext {
  phase: 'wakeup';
}

export interface CommuteState extends BaseGameState, WakeContext {
  phase: 'commute';
}

export interface OfficeState extends BaseGameState, CommuteResolutionContext {
  phase: 'office';
  isLate: false;
}

export interface BribeState extends BaseGameState, CommuteResolutionContext {
  phase: 'bribe';
  isLate: true;
}

export interface ResultState extends BaseGameState {
  phase: 'result';
  resultStatus: 'win' | 'lose';
  loseReason?: LoseReason;
}

export type ActiveGameState =
  | IntroState
  | BedtimeState
  | SleepingState
  | WakeupState
  | CommuteState
  | OfficeState
  | BribeState;

export type GameState = ActiveGameState | ResultState;

export type ShopItemId = 'pillow' | 'eyeMask' | 'earPlugs' | 'dora' | 'smartLamp';

export type Action =
  | { type: 'START_GAME' }
  | { type: 'SET_ALARM'; alarmMin: number }
  | { type: 'BUY_ITEM'; itemId: ShopItemId; qty?: number }
  | { type: 'USE_DORA_TONIGHT' }
  | { type: 'START_SLEEP' }
  | { type: 'WAKE_UP' }
  | { type: 'CONTINUE_TO_COMMUTE' }
  | { type: 'CHOOSE_COMMUTE'; choice: CommuteId }
  | { type: 'CONTINUE_TO_NEXT_DAY' }
  | { type: 'CHOOSE_BRIBE' }
  | { type: 'DECLINE_BRIBE' }
  | { type: 'PASS_WEEKEND' };

export type GameResult =
  | { status: 'playing'; state: ActiveGameState }
  | { status: 'rejected'; state: ActiveGameState; reason: ActionRejectedReason }
  | { status: 'win'; state: ResultState; finalBalance: number }
  | { status: 'lose'; state: ResultState; reason: LoseReason };

export interface EngineDeps {
  rng: Rng;
  balance?: BalanceConfig;
}
