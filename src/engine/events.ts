/**
 * 城市事件 Roll
 * ---------------------------------------------------------------
 * 对齐 game_spec §8.2 事件发生规则
 *
 * 发生规则（最终确认版）：
 * 1. Day4（周四）和 Day5（周五）：各自独立 50% 概率触发「普通事件」
 *    - 总共可能出现 0 / 1 / 2 次普通事件
 *    - 如果两天都触发，从 3 个 flavor 里取**不重复**的
 *    - Day5 不是节前，节前高峰只在第二周周五 Day12
 * 2. Day1~3, Day8~11：完全无事件（不 roll）
 * 3. Day12（最终 Boss 日，第二周周五）：固定发生「节前出行高峰」+20 分钟
 *    - 当天不 roll 其他普通事件（互斥，节前独占）
 * 4. 地铁自身的 5% 故障在 commute.ts 中独立结算，不属于城市事件。
 *
 * 普通事件 flavor 池：演唱会 / 漫展 / 马拉松 —— 数值完全相同（+15 分钟），
 * 只是前端 flavor 不同。从 3 个里随机取 1 个不重复使用。
 * ---------------------------------------------------------------
 */

import type { EventId, NormalEventId } from './types';
import { rngPickIndex, type Rng } from './random';
import { FINAL_DAY_INDEX } from './constants';
import { assertIntegerInRange } from './validation';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance';

const NORMAL_EVENT_FLAVORS: readonly NormalEventId[] = [
  'concert',
  'expo',
  'marathon',
];

/**
 * 取一个未使用过的普通事件 flavor。如果全部用完就 fallback 到第一个（极端情形）。
 */
function pickUnusedFlavor(usedFlavors: readonly string[], rng: Rng): NormalEventId {
  const remaining = NORMAL_EVENT_FLAVORS.filter(f => !usedFlavors.includes(f));
  if (remaining.length === 0) return NORMAL_EVENT_FLAVORS[0]; // 兜底（理论不会触发，需要 3 天以上事件才会用光）
  const idx = rngPickIndex(rng, remaining);
  return remaining[idx];
}

export interface RollEventResult {
  eventId: EventId;           // null | 'concert' | 'expo' | 'marathon' | 'holidayRush'
  bonusMin: number;           // 通勤加时：0 / 15 / 20
  newlyUsedFlavor?: NormalEventId; // 如果触发了普通事件，把 flavor 返回，调用方要写进 usedEventFlavors
}

/**
 * Roll 当天城市事件。
 * @param dayIndex          当前 dayIndex（0~12）
 * @param usedEventFlavors  已用掉的普通事件 flavor（避免 Day4/Day5 重复）
 * @param rng               可复现随机数发生器
 */
export function rollEvent(
  dayIndex: number,
  usedEventFlavors: readonly string[],
  rng: Rng,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): RollEventResult {
  assertIntegerInRange(dayIndex, 0, FINAL_DAY_INDEX, 'rollEvent:dayIndex');

  // 规则 3：Day12 固定节前出行高峰，独占不 roll 其他
  if (dayIndex === FINAL_DAY_INDEX) {
    return { eventId: 'holidayRush', bonusMin: config.EVENT_HOLIDAY_BONUS_MIN };
  }

  // 规则 1：Day4 和 Day5 各自独立 50% 概率触发普通事件
  if (dayIndex === 4 || dayIndex === 5) {
    if (rng() < config.EVENT_NORMAL_TRIGGER_RATE) {
      const flavor = pickUnusedFlavor(usedEventFlavors, rng);
      return {
        eventId: flavor,
        bonusMin: config.EVENT_NORMAL_BONUS_MIN,
        newlyUsedFlavor: flavor,
      };
    }
  }

  // 规则 2：其他工作日 / 周末 —— 无事件
  return { eventId: null, bonusMin: 0 };
}
