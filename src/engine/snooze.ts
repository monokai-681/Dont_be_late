/**
 * Snooze 次数计算（溢出概率法单 roll，链式正确，不跳号）
 * ---------------------------------------------------------------
 * 对齐 game_spec §4.3
 *
 * 核心算法（溢出概率法）：
 *   期望次数 = min(sleepDebt / SNOOZE_GRADIENT, 6.0) × (有灯 ? 0.65 : 1)
 *   整数部分 = 必触发次数
 *   小数部分 = 再多触发 1 次的概率（只 roll 一次 → 从根源杜绝跳号）
 *
 * 最后硬上限 SNOOZE_MAX（6 次）做保险。
 *
 * 回归测试会覆盖相邻整数结果集合，防止出现「跳号」bug。
 * ---------------------------------------------------------------
 */

import type { Rng } from './random';
import { SNOOZE_MAX, LAMP_MULTIPLIER } from './constants';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance';
import { assertFiniteNonNegative } from './validation';

/**
 * 计算今天早晨 snooze 次数。
 * @param sleepDebt     当天早晨生效的累计睡眠债（已做过工作日结转 + newDebt 处理）
 * @param hasSmartLamp  是否购买了智能台灯
 * @param rng           可复现随机数发生器（注入）
 * @returns 0 ~ SNOOZE_MAX 之间的整数
 */
export function rollSnoozeCount(
  sleepDebt: number,
  hasSmartLamp: boolean,
  rng: Rng,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): number {
  assertFiniteNonNegative(sleepDebt, 'rollSnoozeCount:sleepDebt');
  if (!Number.isFinite(config.SNOOZE_GRADIENT) || config.SNOOZE_GRADIENT <= 0) {
    throw new RangeError('rollSnoozeCount:SNOOZE_GRADIENT must be a finite number greater than 0');
  }

  // Step 1: 期望次数
  let expected = Math.min(sleepDebt / config.SNOOZE_GRADIENT, SNOOZE_MAX);

  // Step 2: 智能台灯 —— snooze 期望打 65 折（减少 35% 赖床）
  if (hasSmartLamp) expected *= LAMP_MULTIPLIER;

  // Step 3: 溢出概率法（只 roll 一次 → 从根源杜绝跳过第一次直接第二次）
  const base      = Math.floor(expected);
  const extraProb = expected - base;
  let count = base + (rng() < extraProb ? 1 : 0);

  // Step 4: 硬上限保险
  return Math.min(count, SNOOZE_MAX);
}
