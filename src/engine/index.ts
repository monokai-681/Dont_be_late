/**
 * 引擎唯一对外出口 BARREL EXPORT
 * ---------------------------------------------------------------
 * ⚠️ CLI / UI 层只能从这里 import，禁止 `import from 'engine/xxx'` 直接碰内部文件。
 * ⚠️ 重构内部结构（重命名文件/拆文件等）只要不改这里导出，外面就不会编译错。
 * ---------------------------------------------------------------
 */

// ── 类型 ────────────────────────────────────────────────────────
export type {
  CommuteId,
  WeatherLogic,
  EventId,
  LoseReason,
  CommuteResult,
  Inventory,
  PendingArrivals,
  Action,
  ShopItemId,
  GameResult,
  DayRecord,
  GameState,
  EngineDeps,
} from './types';

// ── RNG 工具（顶层导出方便 CLI/UI 用）────────────────────────────
export { createRng, createRngFromString, rngInt, rngPickIndex } from './random';
export type { Rng } from './random';

// ── 锚点常量（只读，不要直接覆盖）────────────────────────────────
export {
  BEDTIME_MIN,
  CLOCKIN_DEADLINE,
  TARGET_SLEEP_MIN,
  ALARM_MIN,
  ALARM_MAX,
  ALARM_STEP,
  SOL_BASE,
  SOL_MIN,
  ROUTINE_BASE,
  SNOOZE_PER,
  SNOOZE_MAX,
  SNOOZE_GRADIENT,
  LAMP_MULTIPLIER,
  DEBT_DECAY,
  MAX_COMMUTE_BONUS,
  TOTAL_DAYS,
  WORK_DAY_COUNT,
  COMMUTE_OPTION_COUNT,
  SHOP_ITEM_COUNT,
  WEATHER_LOGIC_STATES,
  EVENT_POOL_SIZE,
  WORK_DAY_INDICES,
  WEEKEND_INDICES,
  FINAL_DAY_INDEX,
} from './constants';

// ── 平衡参数（允许模拟器扫描时直接修改导出的 let）───────────────
export * as Balance from './config/balance';
export { resetBalanceToDefaults } from './config/balance';

// ── 核心函数 ────────────────────────────────────────────────────
export { calculateSOL }                             from './sol';
export { rollSnoozeCount }                          from './snooze';
export { calculateCommute }                         from './commute';
export { rollWeather }                              from './weather';
export { rollEvent }                                from './events';
export type { RollEventResult }                     from './events';
// export { applyPendingArrivals, onBuyItem } from './shop';  // 阶段 1-3

// ── 状态机 ──────────────────────────────────────────────────────
// export { INITIAL_STATE }       from './engine';
// export { reducer }             from './engine';
