/**
 * SOL 计算（Sleep Onset Latency 入睡等待时间）
 * ---------------------------------------------------------------
 * 对齐 game_spec §4.2
 *
 * 基础 = SOL_BASE_MINUTES（默认 45 分钟）
 * 削减（负数相加）：枕头 -6 / 眼罩 -4 / 耳塞 -3 / DORA -15
 * 下限：SOL_MIN（10 分钟）
 * ---------------------------------------------------------------
 */

import type { Inventory } from './types';
import { SOL_MIN } from './constants';
import {
  SOL_BASE_MINUTES,
  SOL_PILLOW_REDUCTION,
  SOL_EYE_MASK_REDUCTION,
  SOL_EAR_PLUGS_REDUCTION,
  SOL_DORA_REDUCTION,
} from './config/balance';

/**
 * 计算当晚实际 SOL。
 * @param inventory        玩家已购物品清单
 * @param doraUsedTonight  当晚是否服用 DORA
 * @returns 最终 SOL 分钟数（≥ SOL_MIN）
 */
export function calculateSOL(inventory: Inventory, doraUsedTonight: boolean): number {
  let sol = SOL_BASE_MINUTES;

  // 可重复永久道具：次日晚到货的已在 inventory 里置 true
  if (inventory.pillow)   sol += SOL_PILLOW_REDUCTION;    // -6
  if (inventory.eyeMask)  sol += SOL_EYE_MASK_REDUCTION;  // -4
  if (inventory.earPlugs) sol += SOL_EAR_PLUGS_REDUCTION; // -3

  // 消耗品 DORA（当晚买了立刻能用，无耐药，-15）
  if (doraUsedTonight) sol += SOL_DORA_REDUCTION;         // -15

  // 强制下限：不可能合眼秒睡
  return Math.max(sol, SOL_MIN);
}
