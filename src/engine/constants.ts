/**
 * 硬锚点 HARD ANCHORS
 * ---------------------------------------------------------------
 * 这里的常量属于「改了会出 bug」的魔法数字，
 * 全部 UPPER_SNAKE_CASE，与 game_spec §2.1 / §2.2 / §2.3 一一对应。
 *
 * ⚠️ 调难度不要改这里！改 `config/balance.ts`。
 * ⚠️ 修改这里前必须同步更新 game_spec §2。
 * ---------------------------------------------------------------
 */

// §2.1 时间锚点（分钟整数模型：0 = 当天 00:00）
export const BEDTIME_MIN: number        = 0;     // 每个 Day 循环的固定时间起点
export const CLOCKIN_DEADLINE: number   = 600;   // 10:00 — 超过算「迟到」
export const TARGET_SLEEP_MIN: number   = 480;   // 8 小时 — 每晚「睡饱了」的目标
export const ALARM_MIN: number          = 420;   // 07:00 — 闹钟最早设置时间
export const ALARM_MAX: number          = 600;   // 10:00 — 闹钟最晚设置时间
export const ALARM_STEP: number         = 5;     // 闹钟调节步长（与所有时间粒度一致）

// §2.2 机制常量
export const SOL_BASE: number           = 45;    // game_spec §2.2 锚点默认值；调难度/参数扫描时覆盖 balance.ts SOL_BASE_OVERRIDE（=number 时生效，=null 时用本锚点）
export const SOL_MIN: number            = 10;    // SOL 下限：不可能合眼秒睡
export const ROUTINE_BASE: number       = 25;    // 早晨基础流程（洗漱穿衣拿包）不含 snooze
export const SNOOZE_PER: number         = 9;     // 每一次 snooze 增加的早晨流程时间
export const SNOOZE_MAX: number         = 3;     // snooze 次数硬上限（最大额外 27 分钟）
export const SNOOZE_GRADIENT: number    = 100;   // 欠 1 分钟 sleepDebt → +1% 第一次 snooze 概率
export const LAMP_MULTIPLIER: number    = 0.65;  // 智能台灯：snooze 期望打 65 折
export const DEBT_DECAY: number         = 0.5;   // sleepDebt 每日衰减系数：保留 50%
export const MAX_COMMUTE_BONUS: number  = 25;    // 快车/专车 天气+事件叠加加时的硬上限（2026-08-05 机制简化：天气/事件独立，极端双灾压到 25 分）

// §2.3 尺寸 / 结构常量
export const TOTAL_DAYS: number         = 13;    // Day 0 ~ Day 12
export const WORK_DAY_COUNT: number     = 10;    // 总共 10 个工作日
export const COMMUTE_OPTION_COUNT: number = 3;   // 地铁 / 快车 / 专车
export const SHOP_ITEM_COUNT: number    = 5;     // 枕头/眼罩/耳塞/DORA/台灯
export const WEATHER_LOGIC_STATES: number = 2;   // 不下雪 / 下雪
export const EVENT_POOL_SIZE: number    = 3;     // 演唱会/漫展/马拉松 flavor 数量

// 工作日（dayIndex）集合，用于 reducer 判断是否需要通勤/打卡
export const WORK_DAY_INDICES: readonly number[] = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12];
export const WEEKEND_INDICES: readonly number[]   = [6, 7];
export const FINAL_DAY_INDEX: number   = 12;    // Boss 关 Day12
