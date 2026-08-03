/**
 * 天气 Roll（逻辑层 2 态：clear / snow）
 * ---------------------------------------------------------------
 * 对齐 game_spec §7.2 天气发生分布
 *
 * 固定骨架（保证体验不炸）：
 *   Day 1  : 强制 clear（教学关不搞事）
 *   Day 12 : 70% 概率 snow（Boss 关高概率）
 *   Day 4/5: 有城市事件叠加时 → 独立再 roll 30% snow
 *
 * 随机扰动（增加重玩多样性）：
 *   其他未指定的工作日（Day 2/3/8/9/10/11）：20% snow / 80% clear
 *
 * 注意：
 * - 只返回逻辑层 clear/snow，展示层 flavor（晴/多云/阴/雾霾/小雪/中雪）
 *   交给 UI 层自己随机，不进入引擎状态。
 * - 周末（Day6/7）不需要 roll 天气（无通勤），但 reducer 调了也没事返回 clear。
 * ---------------------------------------------------------------
 */

import type { WeatherLogic } from './types';
import type { Rng } from './random';
import { FINAL_DAY_INDEX } from './constants';
import {
  WEATHER_SNOW_RATE_NORMAL_DAY,
  WEATHER_SNOW_RATE_FINAL_DAY,
  WEATHER_SNOW_RATE_EVENT_DAY,
} from './config/balance';

/**
 * 根据 Day 编号 roll 今日天气逻辑层。
 * @param dayIndex         当前 dayIndex（0~12）
 * @param hasEventToday    当天是否有城市事件（Day4/5 有事件时叠加 roll）
 * @param rng              可复现随机数发生器
 */
export function rollWeather(
  dayIndex: number,
  hasEventToday: boolean,
  rng: Rng,
): WeatherLogic {
  // 固定骨架 1：Day1 教学关不下雪
  if (dayIndex === 1) return 'clear';

  // 固定骨架 2：Day12 Boss 关 70% 下雪
  if (dayIndex === FINAL_DAY_INDEX) {
    return rng() < WEATHER_SNOW_RATE_FINAL_DAY ? 'snow' : 'clear';
  }

  // 固定骨架 3：Day4 / Day5 有事件时，独立再 roll 一次 30% 下雪
  if ((dayIndex === 4 || dayIndex === 5) && hasEventToday) {
    if (rng() < WEATHER_SNOW_RATE_EVENT_DAY) return 'snow';
  }

  // 随机扰动：普通工作日 20% 下雪
  const isWorkDay =
    dayIndex === 1 || dayIndex === 2 || dayIndex === 3 || dayIndex === 4 || dayIndex === 5 ||
    dayIndex === 8 || dayIndex === 9 || dayIndex === 10 || dayIndex === 11 || dayIndex === 12;

  if (isWorkDay) {
    return rng() < WEATHER_SNOW_RATE_NORMAL_DAY ? 'snow' : 'clear';
  }

  // 周末（Day6/7）：默认不下雪（无通勤，不影响数值）
  return 'clear';
}
