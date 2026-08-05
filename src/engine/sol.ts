/**
 * SOL 计算（Sleep Onset Latency 入睡等待时间）
 * ---------------------------------------------------------------
 * 对齐 game_spec §4.2
 *
 * 基础值（C-7 方案 A：锚点权威 + 覆盖层）：
 *   若 SOL_BASE_OVERRIDE !== null → 用覆盖层（提供给模拟器参数扫描时临时覆盖）
 *   若 SOL_BASE_OVERRIDE === null → 用 constants.ts 硬锚点 SOL_BASE = 45
 *
 * 削减（负数相加）：枕头 -6 / 眼罩 -4 / 耳塞 -3 / DORA -15
 * 下限：SOL_MIN（10 分钟）
 * ---------------------------------------------------------------
 */

import type { Inventory } from './types';
import { SOL_MIN, SOL_BASE } from './constants';
import {
  SOL_BASE_OVERRIDE,
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
  // C-7 方案 A：锚点 SOL_BASE 权威，balance 覆盖层仅在非 null 时生效
  const base = SOL_BASE_OVERRIDE ?? SOL_BASE;
  let sol = base;

  // 可重复永久道具：次日晚到货的已在 inventory 里置 true
  if (inventory.pillow)   sol += SOL_PILLOW_REDUCTION;    // -6
  if (inventory.eyeMask)  sol += SOL_EYE_MASK_REDUCTION;  // -4
  if (inventory.earPlugs) sol += SOL_EAR_PLUGS_REDUCTION; // -3

  // 消耗品 DORA（当晚买了立刻能用，无耐药，-15）
  if (doraUsedTonight) sol += SOL_DORA_REDUCTION;         // -15

  // 强制下限：不可能合眼秒睡
  return Math.max(sol, SOL_MIN);
}
