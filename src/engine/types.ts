/**
 * 类型定义 TYPES (PascalCase)
 * ---------------------------------------------------------------
 * 对齐 game_spec §6 Screen 状态流转图 + GameState 初始化模板。
 * 任何接口改动必须同步更新 kanban.md 待做区的类型清单。
 * ---------------------------------------------------------------
 */

import type { Rng } from './random';

// ── 枚举型别名 Union（字符串/字面量，避免 as const 噪音）───────────
export type CommuteId = 'subway' | 'express' | 'premium';

export type WeatherLogic =
  | 'clear'   // 不下雪（展示层 flavor：晴/多云/阴/雾霾）
  | 'snow';   // 下雪（展示层 flavor：小雪/中雪）

export type EventId =
  | null          // 无事件
  | 'concert'     // 大型演唱会（flavor，数值与 expo/marathon 相同）
  | 'expo'        // 漫展开幕
  | 'marathon'    // 马拉松封路
  | 'holidayRush'; // 节前出行高峰（Day12 固定发生，+20 比普通事件多 5）

/** 4 种 Game Over 原因（UI 层可 switch 展示不同文案） */
export type LoseReason =
  | 'CANNOT_AFFORD_BRIBE'     // 第一次迟到但余额 < 180
  | 'REFUSED_BRIBE'           // 玩家拒绝贿赂
  | 'SECOND_LATE'             // 贿赂已用过，第二次迟到
  | 'CANNOT_AFFORD_COMMUTE';  // 余额不够买任何通勤方式（含地铁 5 元）

/** 通勤结算返回 */
export interface CommuteResult {
  commuteMin: number;    // 最终通勤耗时（分钟）
  commuteCost: number;   // 最终费用（单独返回，不扣 balance）
  cancelled: boolean;    // 快车是否被取消（前端展示 flavor）
}

// ── 玩家物品清单 ────────────────────────────────────────────────
export interface Inventory {
  pillow: boolean;     // 软枕头（永久，SOL -6）
  eyeMask: boolean;    // 眼罩（永久，SOL -4）
  earPlugs: boolean;   // 耳塞（永久，SOL -3）
  smartLamp: boolean;  // 智能台灯（永久，snooze 期望 ×0.65）
  dora: number;        // DORA 剩余颗数（消耗品，每颗 SOL -15）
}

/** 次日到货清单（仅 4 种永久道具：枕头/眼罩/耳塞/台灯；DORA 当晚进 inventory，从不在此队列） */
export interface PendingArrivals {
  pillow: boolean;
  eyeMask: boolean;
  earPlugs: boolean;
  smartLamp: boolean;
}

// ── Action 类型（reducer 输入）───────────────────────────────────
export type Action =
  | { type: 'SET_ALARM';           alarmMin: number }
  | { type: 'BUY_ITEM';            itemId: ShopItemId; qty?: number }
  | { type: 'USE_DORA_TONIGHT' }
  | { type: 'CHOOSE_COMMUTE';      choice: CommuteId }
  | { type: 'CHOOSE_BRIBE' }
  | { type: 'DECLINE_BRIBE' }
  | { type: 'PASS_WEEKEND' };

export type ShopItemId = 'pillow' | 'eyeMask' | 'earPlugs' | 'dora' | 'smartLamp';

// ── GameResult（reducer 输出）────────────────────────────────────
export type GameResult =
  | { status: 'playing'; state: GameState }
  | { status: 'win';     state: GameState; finalBalance: number }
  | { status: 'lose';    state: GameState; reason: LoseReason };

// ── 每日回顾记录 ────────────────────────────────────────────────
export interface DayRecord {
  day: number;                  // 1 ~ 12；Result 不生成 DayRecord
  isWorkDay: boolean;
  alarmHHMM?: string;           // 工作日才有
  sleepHHMM?: string;           // "实际睡眠 6h35m" 风格，工作日才有
  sleepDebtAfter?: number;      // day advance 后的 sleepDebt
  snoozeCount?: number;         // 工作日才有
  commute?: string;             // 中文名："地铁" "快车" "专车"，工作日才有
  arriveHHMM?: string;          // 工作日才有
  isLate?: boolean;             // 工作日才有（贿赂成功后会是 false）
  balanceAfter?: number;        // 当天结束后的余额
}

// ── 核心：整局游戏状态 ──────────────────────────────────────────
export interface GameState {
  // ── 基础计数 ───────────────────────────────────────────────
  dayIndex: number;             // 0 ~ 12（Day0=开局介绍，Day1~12=游戏循环；Result 不占 Day 编号）
  balance: number;              // 当前余额（元）
  sleepDebt: number;            // 当前累计睡眠债（分钟，始终 ≥ 0）
  bribeUsed: boolean;           // 贿赂是否已使用

  // ── 物品 / 到货 ─────────────────────────────────────────────
  inventory: Inventory;
  pendingArrivals: PendingArrivals;

  // ── 城市事件 flavor 不重复池 ────────────────────────────────
  usedEventFlavors: string[];   // 已用过的普通事件 flavor，下次取时排除（Day0 初始 [], 全生命周期不 reset）

  // ── 工作日运行时临时状态（每个工作日循环后被覆盖）────────────
  alarmMin?: number;            // 玩家设置的闹钟分钟数（420~600）
  doraUsedTonight?: boolean;    // 今晚是否吃了 DORA
  solTonight?: number;          // 今晚实际 SOL
  actualSleepMin?: number;      // 今晚实际睡眠时长
  newDebtTonight?: number;      // 今晚新增 sleepDebt（= max(0, 480 - actualSleepMin)）
  snoozeCount?: number;         // 今早 snooze 次数
  routineMin?: number;          // 今早总流程时间 = ROUTINE_BASE + snoozeCount × SNOOZE_PER
  commuteChoice?: CommuteId;    // 玩家选的通勤方式
  commuteMin?: number;          // 通勤结算出的耗时
  commuteCancelled?: boolean;   // 快车被取消了吗（前端 flavor 用）
  arriveMin?: number;           // 到达分钟数（>540 迟到）
  isLate?: boolean;             // 今日是否迟到（注意：贿赂成功后会被置回 false）
  weatherToday?: WeatherLogic;  // 今日天气逻辑层
  eventToday?: EventId;         // 今日城市事件

  // ── 每日回顾日志 ───────────────────────────────────────────
  dailyLog: DayRecord[];        // 只记录已结束的 Day1~12；Result 不写入日志
}

// ── 依赖注入（reducer/deps）─────────────────────────────────────
export interface EngineDeps {
  rng: Rng;                     // 可复现随机数发生器
  now?: () => number;           // 预留：真实时间（暂时不用，可传 Date.now）
}
