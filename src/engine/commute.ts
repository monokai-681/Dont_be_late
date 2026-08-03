/**
 * 通勤结算（三档：地铁 / 快车 / 专车）
 * ---------------------------------------------------------------
 * 对齐 game_spec §4.5 + §5.1
 *
 * 关键设计点：
 * - 原型阶段移除「开车」选项，只剩 3 档
 * - 快车取消：最多发生 0 或 1 次，**绝不会取消第二次**（重新叫的第二辆必然成功）
 * - 专车：取消率 0%（从不取消），但**不免疫**天气 / 事件加时
 * - 地铁：完全不受天气、事件、取消影响，永远 40 分钟 / 5 元
 * ---------------------------------------------------------------
 */

import type { CommuteId, CommuteResult } from './types';
import type { Rng } from './random';
import {
  COMMUTE_SUBWAY_MIN,   COMMUTE_SUBWAY_COST,
  COMMUTE_EXPRESS_MIN,  COMMUTE_EXPRESS_COST,  COMMUTE_EXPRESS_CANCEL_RATE,  COMMUTE_EXPRESS_CANCEL_EXTRA_MIN,
  COMMUTE_PREMIUM_MIN,  COMMUTE_PREMIUM_COST,
  WEATHER_SNOW_BONUS_MIN,
} from './config/balance';

/**
 * 通勤结算（工作日选完交通方式后调用）
 * @param choice      玩家选择的通勤 ID
 * @param isSnow      当天下雪（true/false）
 * @param eventBonus  当天城市事件加时（0 / 15 / 20 分钟，节前高峰 20）
 * @param rng         可复现随机数发生器（快车取消 roll 用）
 * @returns 结算结果
 */
export function calculateCommute(
  choice: CommuteId,
  isSnow: boolean,
  eventBonus: number,
  rng: Rng,
): CommuteResult {
  // 三档基础参数
  let baseMin: number;
  let baseCost: number;
  let cancelRate: number;  // 快车 30% / 专车 0% / 地铁 0%
  let immune: boolean;     // 是否免疫天气和事件（地铁免疫）

  switch (choice) {
    case 'subway':
      baseMin  = COMMUTE_SUBWAY_MIN;   // 40
      baseCost = COMMUTE_SUBWAY_COST;  // 5
      cancelRate = 0;
      immune = true;
      break;
    case 'express':
      baseMin  = COMMUTE_EXPRESS_MIN;  // 25
      baseCost = COMMUTE_EXPRESS_COST; // 30
      cancelRate = COMMUTE_EXPRESS_CANCEL_RATE; // 0.30
      immune = false;
      break;
    case 'premium':
      baseMin  = COMMUTE_PREMIUM_MIN;  // 25
      baseCost = COMMUTE_PREMIUM_COST; // 60
      cancelRate = 0;                  // 专车从不取消
      immune = false;
      break;
  }

  // Step 1: 天气 + 事件加时（仅非免疫交通）
  let bonusMin = 0;
  if (!immune) {
    if (isSnow) bonusMin += WEATHER_SNOW_BONUS_MIN; // 下雪 +15
    bonusMin += eventBonus;                          // 事件 +15/+20 或 0
  }

  // Step 2: 快车取消 roll（只 roll 一次！取消最多 0 或 1 次，第二次必成功）
  const cancelled = choice === 'express' && rng() < cancelRate;
  const cancelMin = cancelled ? COMMUTE_EXPRESS_CANCEL_EXTRA_MIN : 0; // 取消 +10

  // Step 3: 汇总
  return {
    commuteMin: baseMin + bonusMin + cancelMin,
    commuteCost: baseCost,
    cancelled,
  };
}
