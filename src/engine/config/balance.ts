/**
 * 平衡参数 BALANCE CONFIG
 * ---------------------------------------------------------------
 * 这里的数值属于「调难度时只改这个文件」的参数，
 * 全部导出为 let（而不是 const），方便模拟器跑参数扫描时动态覆盖。
 *
 * 改这里不需要同步更新 game_spec（除非想把某组参数固定下来）。
 * 调参目标：10 万局通关率在 30%~50% 区间。
 * ---------------------------------------------------------------
 */

// ── SOL / SNOOZE 调参 ─────────────────────────────────────────
export let SOL_BASE_MINUTES         = 45;   // SOL 基础值（constants.SOL_BASE__MIN 引用这个）
export let SOL_PILLOW_REDUCTION     = -6;   // 枕头削减 SOL（负数）
export let SOL_EYE_MASK_REDUCTION   = -4;   // 眼罩削减 SOL
export let SOL_EAR_PLUGS_REDUCTION  = -3;   // 耳塞削减 SOL
export let SOL_DORA_REDUCTION       = -15;  // DORA 单颗削减 SOL

// ── 通勤调参 ───────────────────────────────────────────────────
export let COMMUTE_SUBWAY_MIN       = 40;
export let COMMUTE_SUBWAY_COST      = 5;

export let COMMUTE_EXPRESS_MIN      = 25;
export let COMMUTE_EXPRESS_COST     = 30;
export let COMMUTE_EXPRESS_CANCEL_RATE = 0.30; // 30%
export let COMMUTE_EXPRESS_CANCEL_EXTRA_MIN = 10; // 取消后重新叫车的加时

export let COMMUTE_PREMIUM_MIN      = 25;
export let COMMUTE_PREMIUM_COST     = 60;

// ── 天气 / 事件 加时调参 ───────────────────────────────────────
export let WEATHER_SNOW_BONUS_MIN   = 15;   // 下雪时快车/专车加时
export let EVENT_NORMAL_BONUS_MIN   = 15;   // 普通事件（演唱会等）加时
export let EVENT_HOLIDAY_BONUS_MIN  = 20;   // 节前出行高峰加时

// ── 天气发生分布 ───────────────────────────────────────────────
export let WEATHER_SNOW_RATE_NORMAL_DAY = 0.20; // 普通工作日（Day2/3/8/9/10/11）下雪概率
export let WEATHER_SNOW_RATE_FINAL_DAY  = 0.70; // Boss 关 Day12 下雪概率
export let WEATHER_SNOW_RATE_EVENT_DAY  = 0.30; // Day4/5 有事件叠加时的额外下雪概率（叠在 normal 之上？——按 spec §7.2：有事件时独立再 roll 一次 30%）

// ── 城市事件发生分布 ───────────────────────────────────────────
export let EVENT_NORMAL_TRIGGER_RATE = 0.50; // Day4 和 Day5 各自独立触发普通事件的概率

// ── 经济调参 ───────────────────────────────────────────────────
export let INITIAL_BALANCE          = 50;   // Day0 开局资金
export let DAILY_SALARY             = 20;   // Day1~12 每晚睡前发（含周末）
export let BRIBE_COST               = 180;  // 贿赂金额（限 1 次）

// ── 商店价格 ───────────────────────────────────────────────────
export let SHOP_PRICE_PILLOW        = 40;   // 枕头（次日晚到货，永久）
export let SHOP_PRICE_EYE_MASK      = 18;   // 眼罩（次日晚到货，永久）
export let SHOP_PRICE_EAR_PLUGS     = 12;   // 耳塞（次日晚到货，永久）
export let SHOP_PRICE_DORA_PER_PILL = 20;   // DORA（当晚生效，消耗品/颗）
export let SHOP_PRICE_SMART_LAMP    = 95;   // 智能台灯（次日晚到货，永久）

// ── 辅助：参数扫描工具用的 reset ────────────────────────────────
export function resetBalanceToDefaults(): void {
  SOL_BASE_MINUTES = 45;
  SOL_PILLOW_REDUCTION = -6; SOL_EYE_MASK_REDUCTION = -4; SOL_EAR_PLUGS_REDUCTION = -3; SOL_DORA_REDUCTION = -15;
  COMMUTE_SUBWAY_MIN = 40; COMMUTE_SUBWAY_COST = 5;
  COMMUTE_EXPRESS_MIN = 25; COMMUTE_EXPRESS_COST = 30; COMMUTE_EXPRESS_CANCEL_RATE = 0.30; COMMUTE_EXPRESS_CANCEL_EXTRA_MIN = 10;
  COMMUTE_PREMIUM_MIN = 25; COMMUTE_PREMIUM_COST = 60;
  WEATHER_SNOW_BONUS_MIN = 15; EVENT_NORMAL_BONUS_MIN = 15; EVENT_HOLIDAY_BONUS_MIN = 20;
  WEATHER_SNOW_RATE_NORMAL_DAY = 0.20; WEATHER_SNOW_RATE_FINAL_DAY = 0.70; WEATHER_SNOW_RATE_EVENT_DAY = 0.30;
  EVENT_NORMAL_TRIGGER_RATE = 0.50;
  INITIAL_BALANCE = 50; DAILY_SALARY = 20; BRIBE_COST = 180;
  SHOP_PRICE_PILLOW = 40; SHOP_PRICE_EYE_MASK = 18; SHOP_PRICE_EAR_PLUGS = 12; SHOP_PRICE_DORA_PER_PILL = 20; SHOP_PRICE_SMART_LAMP = 95;
}
