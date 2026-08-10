/**
 * 通勤结算（三档：地铁 / 快车 / 专车）
 * ---------------------------------------------------------------
 * 对齐 game_spec §4.5 + §5.1
 *
 * 关键设计点：
 * - 原型阶段移除「开车」选项，只剩 3 档
 * - 快车取消：最多发生 0 或 1 次，**绝不会取消第二次**（重新叫的第二辆必然成功）
 * - 专车：取消率 0%（从不取消），但**不免疫**天气 / 事件加时
 * - 地铁：信号故障机制暂时停用（保留代码与注入配置）
 * - 睡债 180~300 分钟时，地铁坐过站概率从 0% 线性增加到 100%
 * ---------------------------------------------------------------
 */

import type { CommuteId, CommuteResult } from './types';
import type { Rng } from './random';
import { MAX_COMMUTE_BONUS } from './constants';
import { assertBoolean, assertFiniteNonNegative, assertIntegerInRange, assertNever, assertOneOf } from './validation';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance';

const COMMUTE_IDS: readonly CommuteId[] = ['subway', 'express', 'premium'];

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
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  sleepDebt = 0,
): CommuteResult {
  assertOneOf(choice, COMMUTE_IDS, 'calculateCommute:choice');
  assertBoolean(isSnow, 'calculateCommute:isSnow');
  assertIntegerInRange(
    eventBonus,
    0,
    config.EVENT_HOLIDAY_BONUS_MIN,
    'calculateCommute:eventBonus',
  );
  assertFiniteNonNegative(sleepDebt, 'calculateCommute:sleepDebt');

  // 三档基础参数
  let baseMin: number;
  let baseCost: number;
  let cancelRate: number;  // 快车 30% / 专车 0% / 地铁另算故障
  let immune: boolean;     // 是否免疫天气和事件（地铁免疫）

  switch (choice) {
    case 'subway':
      baseMin  = config.COMMUTE_SUBWAY_MIN;
      baseCost = config.COMMUTE_SUBWAY_COST;
      cancelRate = 0;
      immune = true;
      break;
    case 'express':
      baseMin  = config.COMMUTE_EXPRESS_MIN;
      baseCost = config.COMMUTE_EXPRESS_COST;
      cancelRate = config.COMMUTE_EXPRESS_CANCEL_RATE;
      immune = false;
      break;
    case 'premium':
      baseMin  = config.COMMUTE_PREMIUM_MIN;
      baseCost = config.COMMUTE_PREMIUM_COST;
      cancelRate = 0;                  // 专车从不取消
      immune = false;
      break;
    default:
      assertNever(choice, 'calculateCommute:choice');
  }

  // Step 1: 天气 + 事件加时（仅非免疫交通）— 叠加后有硬上限（MAX_COMMUTE_BONUS=25，2026-08-05 机制简化）
  let bonusMin = 0;
  if (!immune) {
    if (isSnow) bonusMin += config.WEATHER_SNOW_BONUS_MIN;
    bonusMin += eventBonus;                          // 事件 +15/+20 或 0
    bonusMin = Math.max(0, Math.min(bonusMin, MAX_COMMUTE_BONUS)); // ⚠️ 双灾叠加硬上限 25 分钟
  }

  // Step 2: 快车取消 roll（只 roll 一次！取消最多 0 或 1 次，第二次必成功）
  const cancelled = choice === 'express' && rng() < cancelRate;
  const cancelMin = cancelled ? config.COMMUTE_EXPRESS_CANCEL_EXTRA_MIN : 0;

  // Step 3: 地铁风险 roll。坐过站优先，保证睡债到达 cap 时必定坐过站。
  // 故障机制默认停用；未来只需调高 rate 即可重新开启，但仍不会与坐过站同时发生。
  const missedStopRange = config.COMMUTE_SUBWAY_MISSED_STOP_DEBT_CAP
    - config.COMMUTE_SUBWAY_MISSED_STOP_DEBT_THRESHOLD;
  if (!Number.isFinite(missedStopRange) || missedStopRange <= 0) {
    throw new RangeError('calculateCommute:missed-stop debt cap must exceed threshold');
  }
  const missedStopRate = Math.max(0, Math.min(
    (sleepDebt - config.COMMUTE_SUBWAY_MISSED_STOP_DEBT_THRESHOLD) / missedStopRange,
    1,
  ));
  const subwayMissedStop = choice === 'subway'
    && missedStopRate > 0
    && rng() < missedStopRate;
  const subwayFailed = choice === 'subway'
    && !subwayMissedStop
    && config.COMMUTE_SUBWAY_FAILURE_RATE > 0
    && rng() < config.COMMUTE_SUBWAY_FAILURE_RATE;
  const subwayFailureMin = subwayFailed ? config.COMMUTE_SUBWAY_FAILURE_EXTRA_MIN : 0;
  const subwayMissedStopMin = subwayMissedStop
    ? config.COMMUTE_SUBWAY_MISSED_STOP_EXTRA_MIN
    : 0;

  // Step 4: 汇总
  return {
    commuteMin: baseMin + bonusMin + cancelMin + subwayFailureMin + subwayMissedStopMin,
    commuteCost: baseCost,
    cancelled,
    subwayFailed,
    subwayMissedStop,
  };
}
