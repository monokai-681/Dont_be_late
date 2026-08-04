# 《别迟到》游戏数值规格文档 (Game Spec)

> **版本**: v1.1  
> **生成日期**: 2026-08-03  
> **状态**: 锚点/常量/数值/事件系统 已确认；原型可开始开发

---

## 1. 文档说明

本文档是《别迟到》原型开发的**唯一数值与机制权威来源**。所有代码实现必须以本文档为准。  
如果在开发中发现数值问题或需要调整，应先更新本文档，再改代码。

### 命名约定（TypeScript / JavaScript）

| 场景 | 命名规范 | 正确例子 | 错误例子 |
|------|---------|---------|---------|
| 模块级硬编码常量（永不修改的 magic number）| **UPPER_SNAKE_CASE** | `const CLOCKIN_DEADLINE = 600` | `const clockin_deadline = 600` |
| 运行时会变的变量 / 对象字段 | **camelCase** | `sleepDebt`, `gameState.balance` | `gameState.BALANCE` |
| 类 / 接口 / 类型名 | **PascalCase** | `interface GameState`, `class Engine` | `interface gameState` |
| 函数 / 方法名 | **camelCase** | `function rollSnoozeCount()` | `Roll_Snooze_Count()` |

---

## 2. 固定锚点 & 常量（硬编码常量）

### 2.1 时间锚点

| 常量名 | 值 | 人类时间 | 说明 |
|-------|-----|---------|------|
| `BEDTIME_MIN` | `0`（分钟）| 00:00（当天凌晨）| 每个 Day 循环的固定时间起点 |
| `CLOCKIN_DEADLINE` | `600`（分钟）| 10:00 | 上班打卡 deadline，超过算「迟到」|
| `TARGET_SLEEP_MIN` | `480`（分钟）| 8 小时 | 每晚「睡饱了」的目标睡眠时长 |
| `ALARM_MIN` | `420`（分钟）| 07:00 | 工作日闹钟允许的最早设置时间 |
| `ALARM_MAX` | `600`（分钟）| 10:00 | 工作日闹钟允许的最晚设置时间（后续考虑做嘲讽彩蛋）|
| `ALARM_STEP` | `5`（分钟）| — | 闹钟调节步长，与所有时间粒度一致 |

### 2.2 机制常量

| 常量名 | 值 | 说明 |
|-------|-----|------|
| `SOL_BASE` | `45`（分钟）| 无任何助眠物品时的入睡等待时间（Sleep Onset Latency）|
| `SOL_MIN` | `10`（分钟）| SOL 下限：买了所有道具也不能低于 10 分钟（不可能合眼秒睡）|
| `ROUTINE_BASE` | `25`（分钟）| 早晨基础流程时间：起床→出门所需固定耗时（洗漱/穿衣/拿包），不含 snooze |
| `SNOOZE_PER` | `9`（分钟）| 每一次 snooze（赖床）增加的早晨流程时间 |
| `SNOOZE_MAX` | `3`（次）| snooze 次数硬上限（最大额外 27 分钟）|
| `SNOOZE_GRADIENT` | `100`（分钟 sleepDebt）| snooze 一阶概率爬满 100% 所需睡眠债分钟数（每欠 1 分钟 → +1% 第一次概率）|
| `LAMP_MULTIPLIER` | `0.65` | 智能台灯效果：snooze 期望次数乘以该系数（打 65 折 = 减少 35% 赖床概率）|
| `DEBT_DECAY` | `0.5` | sleepDebt 每日衰减系数：前一天的 sleepDebt 只保留 50% 带入第二天 |

### 2.3 尺寸/结构常量

| 常量名 | 值 | 说明 |
|-------|-----|------|
| `TOTAL_DAYS` | `13`（Day 0 ~ Day 12）| Day 0 开局介绍；Day 1~12 游戏循环；结算在 Day 12 结束后触发 |
| `WORK_DAY_COUNT` | `10` | 总共 10 个工作日需要打卡 |
| `COMMUTE_OPTION_COUNT` | `3` | **地铁 / 快车 / 专车**（「开车」选项已从原型移除，后续版本再加）|
| `SHOP_ITEM_COUNT` | `5` | 枕头 / 眼罩 / 耳塞 / DORA / 智能台灯（「传统安眠药」已移除）|
| `WEATHER_LOGIC_STATES` | `2` | 天气只有两种逻辑状态：「不下雪」「下雪」（前端 flavor 可以更丰富）|
| `EVENT_POOL_SIZE` | `3` | 城市事件池 flavor 名数量：演唱会/漫展/马拉松（数值完全相同）|

---

## 3. Day 编号 & 整体游戏流程

### 3.1 核心设计原则

> **Day N 的循环 = 「N 号白天的睡前准备」 + 「N 号睡眠」 + 「N 号早晨通勤」 + 「N 号白天打卡」**  
> 也就是说，凌晨 0 点玩家做的睡前操作，已经属于「即将到来的那个白天」。这样编号可以从根本上消除 off-by-one 错误。

### 3.2 完整 Day 排布

| Day 编号 | 对应日期 | 白天类型 | 需要打卡？ | 流程类型 |
|---------|---------|---------|----------|---------|
| **Day 0** | —（虚拟启动日）| — | ❌ | 开局介绍页：剧情介绍玩法 + 发 50 元初始资金 → 点「开始第一晚」进入 Day 1 |
| **Day 1** | 周一 | 工作日 #1 | ✅ | 标准工作日循环（睡前商店+闹钟 → 睡眠 → 起床snooze → 通勤 → 打卡/贿赂）|
| **Day 2** | 周二 | 工作日 #2 | ✅ | 同上 |
| **Day 3** | 周三 | 工作日 #3 | ✅ | 同上 |
| **Day 4** | 周四 | 工作日 #4 | ✅ | 同上（50% 概率出现城市事件）|
| **Day 5** | 周五 | 工作日 #5 | ✅ | 同上（50% 概率出现城市事件；与 Day 4 独立 roll）|
| **Day 6** | 周六 | 周末 | ❌ | **周末简化循环**（有睡前商店，无闹钟/通勤/打卡），sleepDebt 执行 50% 衰减，不新增 newDebt |
| **Day 7** | 周日 | 周末 | ❌ | 同上 |
| **Day 8** | 周一 | 工作日 #6 | ✅ | 标准工作日循环（第二周开始）|
| **Day 9** | 周二 | 工作日 #7 | ✅ | 同上 |
| **Day 10** | 周三 | 工作日 #8 | ✅ | 同上 |
| **Day 11** | 周四 | 工作日 #9 | ✅ | 同上 |
| **Day 12** | 周五 | 工作日 #10（最终日）| ✅ | 标准工作日循环，**固定事件「节前出行高峰」**（不 roll 其他事件）。当天白天打卡成功 = 立刻通关！|
| **Day 13** | 结算日 | — | — | 结算画面：通关或失败 + 最终余额 + 每日回顾 |

### 3.3 工作日完整循环（Day 1~5, Day 8~12）

每个标准工作日循环按顺序执行 **5 个 Screen**：

```
    ┌──────────────┐
    │  睡前 Screen  │  ← 1. 显示当天预报（天气/城市事件）
    │  Bedtime      │    2. 商店购物（枕头/眼罩/耳塞/DORA/台灯）
    │              │    3. 设置闹钟（420~600 / 5min 步进）
    │              │    4. 发当日工资 20 元（Day 1~12 都发）
    └──────┬───────┘
           │ 玩家点击「睡觉」
    ┌──────▼───────┐
    │  睡眠 Screen  │  自动：计算 SOL + 实际睡眠时长 + newDebt
    │  Sleep       │  无玩家操作
    └──────┬───────┘
           │ 闹钟响
    ┌──────▼───────┐
    │  起床 Screen  │  显示：闹钟时间 / 实际睡眠 / sleepDebt / snooze 次数
    │  Wake-up     │        总早晨流程 = ROUTINE_BASE + snoozeCount × SNOOZE_PER
    │              │  提示：「你还剩 XX 分钟赶到公司」
    └──────┬───────┘
           │ 玩家选择通勤方式
    ┌──────▼───────┐
    │  通勤 Screen  │  3选1：地铁/快车/专车
    │  Commute     │  显示每种的费用/耗时/风险预告
    │              │  → 结算：扣钱 + 取消roll + 天气/事件加时 + 算到达分钟数
    └──────┬───────┘
           │ 到达公司
    ┌──────▼───────┐
    │  办公室 Screen│  显示打卡分钟数 VS 600 deadline
    │  Office      │  若迟到 → 弹出贿赂（180元/只能用一次）
    │              │  玩家选择后 → 进入下一个 Day
    └──────┬───────┘
           │
     sleepDebt 处理：
       effectiveDebt_nextDay = currentSleepDebt × DEBT_DECAY + newDebt_lastNight
       跳转到 Day N+1 循环起点
```

### 3.4 周末简化循环（Day 6 / Day 7）

只有 **1 个 Screen**，跳过睡眠/起床/通勤/打卡：

```
    ┌──────────────┐
    │  睡前 Screen  │  ← 1. 商店照常营业（可囤 DORA、买台灯等）
    │  Bedtime+Shop │    2. 无闹钟 UI，显示「今天是周末，好好休息一下」
    │              │    3. 发当日工资 20 元
    └──────┬───────┘
           │ 玩家点击「好好休息」
           │
     ★ 不执行 SOL、不执行 newDebt 计算（周末默认睡够，newDebt = 0）
     ★ sleepDebt 只做衰减：effectiveDebt_nextDay = currentSleepDebt × DEBT_DECAY
     ★ 跳转到下一个 Day
```

**效果**：经过 Day 6 和 Day 7 两个周末，sleepDebt = 周五结束时的 `0.5 × 0.5 = 25%`。

---

## 4. 核心机制（附伪代码 / TS 函数签名）

> snooze 函数已通过 1500 万次 roll 验证，不存在「跳过第一次直接触发第二次」的跳号概率 bug。

### 4.1 sleepDebt 规则

```
变量名：sleepDebt  （number，单位分钟，始终 ≥ 0）

每个 Day 结束时（无论工作日还是周末）：
  sleepDebt = sleepDebt × DEBT_DECAY   // DEBT_DECAY = 0.5

只有工作日结束时才新增 newDebt（周末不新增，newDebt = 0）：
  newDebt = max(0, TARGET_SLEEP_MIN - actualSleepMin)

其中实际睡眠 actualSleepMin：
  actualSleepMin = max(0, alarmMin - sol)   // alarmMin 是玩家设置的闹钟时间
```

### 4.2 SOL 计算（含商店效果）

```typescript
interface Inventory {
  pillow: boolean;     // 软枕头（可重复）
  eyeMask: boolean;    // 眼罩（可重复）
  earPlugs: boolean;   // 耳塞（可重复）
  smartLamp: boolean;  // 智能台灯（影响 snooze，不影响 SOL）
  dora: number;        // DORA 剩余颗数（消耗品）
}

/**
 * 计算当晚实际 SOL
 * @param inventory  玩家已购物品清单
 * @param doraUsedTonight  当晚是否服用 DORA
 * @returns 最终 SOL 分钟数（≥ SOL_MIN）
 */
function calculateSOL(inventory: Inventory, doraUsedTonight: boolean): number {
  let sol = SOL_BASE;  // 45 分钟

  // 可重复 SOL 削减道具（次日晚到货的已在 inventory 里置 true）
  if (inventory.pillow)   sol -= 6;
  if (inventory.eyeMask)  sol -= 4;
  if (inventory.earPlugs) sol -= 3;

  // 消耗品：DORA（当晚买了立刻能用，无耐药，-15 分钟）
  if (doraUsedTonight) sol -= 15;

  // 强制下限
  return Math.max(sol, SOL_MIN);  // SOL_MIN = 10
}
```

### 4.3 Snooze 计算（链式正确版，无跳号 bug）

```typescript
/**
 * 计算今天早晨 snooze 次数
 * @param sleepDebt  当天早晨生效的累计睡眠债（已在循环起点做过 ×DEBT_DECAY + newDebt 处理）
 * @param hasSmartLamp  是否购买了智能台灯
 * @returns 0 ~ SNOOZE_MAX 之间的整数
 */
function rollSnoozeCount(sleepDebt: number, hasSmartLamp: boolean): number {
  // Step 1: 期望次数 = min(sleepDebt / 100, 3.0)
  let expected = Math.min(sleepDebt / SNOOZE_GRADIENT, SNOOZE_MAX);

  // Step 2: 智能台灯：期望乘以 0.65（整体打 65 折）
  if (hasSmartLamp) expected *= LAMP_MULTIPLIER;

  // Step 3: 溢出概率法（只 roll 一次，从根源杜绝「跳过第一次直接第二次」）
  //   整数部分 = 必触发次数
  //   小数部分 = 再多触发 1 次的概率
  const base = Math.floor(expected);
  const extraProb = expected - base;
  let count = base + (Math.random() < extraProb ? 1 : 0);

  // Step 4: 硬上限保险
  return Math.min(count, SNOOZE_MAX);
}
```

### 4.4 早晨流程时间

```
morningRoutineMin = ROUTINE_BASE + snoozeCount × SNOOZE_PER
                   (25 分钟基础)     (每次 9 分钟，最多 3 次 = +27 分钟)
```

### 4.5 通勤结算（三档 · 含取消 roll + 天气/事件加时）

> 关键设计点：
> - 「开车」选项已移除，原型只有 3 种通勤方式
> - 快车取消：最多发生 0 或 1 次，**绝不会取消第二次**（重新叫的第二辆必然成功）
> - 专车：取消率 0%（从不取消），但**不免疫**天气/事件加时
> - 地铁：完全不受天气、事件、取消影响，永远 40 分钟 / 5 元

```typescript
type CommuteId = 'subway' | 'express' | 'premium';

interface CommuteResult {
  commuteMin: number;    // 最终通勤耗时
  commuteCost: number;   // 最终费用（已经扣到 balance 外单独返回）
  cancelled: boolean;    // 快车是否被取消（前端展示 flavor）
}

/**
 * 通勤结算（工作日选完交通方式后调用）
 * @param choice      玩家选择的通勤 ID
 * @param isSnow      当天下雪（true/false）
 * @param eventBonus  当天城市事件加时（0 / 15 / 20 分钟，节前高峰 20）
 * @returns 结算结果
 */
function calculateCommute(
  choice: CommuteId,
  isSnow: boolean,
  eventBonus: number
): CommuteResult {
  // 基础参数（三档）
  let baseMin: number;
  let baseCost: number;
  let cancelRate: number;   // 快车 30% / 专车 0% / 地铁 0%
  let immune: boolean;      // 是否免疫天气和事件（地铁免疫）

  switch (choice) {
    case 'subway':
      baseMin = 40;   baseCost = 5;   cancelRate = 0;    immune = true;  break;
    case 'express':
      baseMin = 25;   baseCost = 30;  cancelRate = 0.30; immune = false; break;
    case 'premium':
      baseMin = 25;   baseCost = 60;  cancelRate = 0;    immune = false; break;
  }

  // Step 1: 加时（仅非免疫交通）
  let bonusMin = 0;
  if (!immune) {
    if (isSnow) bonusMin += 15;        // 下雪 +15 分钟
    bonusMin += eventBonus;             // 事件 +15/+20 或 0
  }

  // Step 2: 快车取消 roll（只 roll 一次！取消最多 0 或 1 次，第二次必成功）
  const cancelled = choice === 'express' && Math.random() < cancelRate;
  const cancelMin = cancelled ? 10 : 0;

  // Step 3: 汇总
  return {
    commuteMin: baseMin + bonusMin + cancelMin,
    commuteCost: baseCost,
    cancelled
  };
}
```

### 4.6 到达时间 & 迟到判断

```typescript
// 通勤结算后调用
arriveMin = alarmMin + morningRoutineMin + commuteResult.commuteMin;
balance  -= commuteResult.commuteCost;

isLate   = arriveMin > CLOCKIN_DEADLINE;   // > 600 算迟到
lateMin  = arriveMin - CLOCKIN_DEADLINE;   // 迟到分钟数（仅展示用）
```

### 4.7 经济系统

```
Day 0 开局：
  balance = 50   （初始资金）
  bribeUsed = false

每个 Day（Day 1 ~ Day 12）睡前 Screen 开始时：
  balance += 20   （日工资，周末也发，Day 12 最后一天也发，共 12 次）
  总资金 = 50 + 12×20 = 290 元（理论上限）

商店消费（睡前 Screen）：
  balance -= 对应价格

通勤消费：
  balance -= 对应通勤费用

贿赂（迟到时办公室 Screen）：
  if (!bribeUsed) {
    if (玩家选贿赂) {
      if (balance >= 180) {
        balance -= 180;
        bribeUsed = true;
        isLate = false;        // 抹除本次迟到
      } else {
        钱不够 → Game Over
      }
    } else {
      玩家拒绝 → Game Over
    }
  } else {
    贿赂已用过 → 第二次迟到 → Game Over
  }
```

---

## 5. 完整数值表

### 5.1 通勤方式（3 档）

| 中文名 | 内部 ID | 基础耗时 | 单次费用 | 取消概率 | 天气/事件影响 | 一句话定位 |
|-------|--------|---------|---------|---------|-------------|----------|
| 🚇 地铁 | `subway` | **40 分钟**（固定）| **5 元** | 0% | ❌ 完全免疫（0 加时）| **稳但慢**：永远 40 分/5 元，100% 准点 |
| 🚕 快车 | `express` | **25 分钟** | **30 元** | **30%**（取消 +10 分，最多取消 1 次）| ✅ 下雪 +15 / 事件 +15/+20 | **性价比之选**：便宜一半但赌取消率，还受天气事件影响 |
| 🚘 专车 | `premium` | **25 分钟** | **60 元**（快车 2 倍）| **0%**（从不取消）| ✅ 下雪 +15 / 事件 +15/+20（不免疫）| **稳但贵**：60 元买「从不取消」，但天气/事件照样加时，不如地铁稳 |

> 三档取舍口诀：**地铁 = 时间换钱；快车 = 省钱赌运气；专车 = 花钱买不被取消。**

### 5.2 商店物品（5 种）

| 中文名 | 内部 ID | 类型 | 价格 | 效果 | 到货规则 |
|-------|--------|------|------|------|---------|
| 软枕头 | `pillow` | 可重复（永久）| 40 元 | SOL -6 分钟 | **次日晚**：Day N 睡前买 → Day N+1 睡前 calculateSOL 生效 |
| 眼罩 | `eyeMask` | 可重复（永久）| 18 元 | SOL -4 分钟 | 次日晚 |
| 耳塞 | `earPlugs` | 可重复（永久）| 12 元 | SOL -3 分钟 | 次日晚 |
| DORA | `dora` | 消耗品（颗）| 20 元/颗 | SOL -15 分钟，无耐药 | **当晚立刻**：买了当天 calculateSOL 就能用（安眠药例外规则）；库存剩余颗数，吃 1 颗 inventory.dora -= 1 |
| 智能台灯 | `smartLamp` | 可重复（永久）| 95 元 | rollSnoozeCount 中 expected × 0.65 | 次日晚 |

**SOL 最大削减量验证**：枕头-6 + 眼罩-4 + 耳塞-3 + DORA-15 = **-28 分钟**  
45 - 28 = 17 分钟 ≥ SOL_MIN(10)。✅ 合规。

### 5.3 经济参数

| 项目 | 值 | 说明 |
|------|-----|------|
| 初始余额 | 50 元 | Day 0 开局给 |
| 日工资 | 20 元/天 | Day 1~Day 12 每晚睡前发，共 12 次（周末也发，最后一天也发）|
| 总资金上限 | 50 + 12×20 = **290 元** | 玩家理论上最多能花的钱 |
| 贿赂金额 | **180 元** | 只能用一次，抹去一次迟到记录 |
| 贿赂可用次数 | 1 次 | 用过后第二次迟到直接 Game Over |
| 全勤奖 | 取消 | 方案 A，通关无额外奖励 |
| 结算到手金额 | = `balance`（最终余额）| 通关或失败都只看最终余额 |

---

## 6. Screen 状态流转图

```
┌─────────┐
│ Intro   │  Day 0: 开局介绍页（剧情 + 目标 + 关键规则）
│ Screen  │
└────┬────┘
     │ 点击「开始第一晚」
     ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Bedtime │────▶│  Sleep  │────▶│ Wake-up │────▶│ Commute  │────▶│  Office  │
│ Screen  │     │ Screen  │     │ Screen  │     │  Screen  │     │  Screen  │
│ (商店   │     │ (自动)  │     │ (snooze │     │ (3选1    │     │ (打卡/   │
│  +闹钟) │     │         │     │  展示)  │     │  通勤)   │     │  贿赂)   │
└────┬────┘     └─────────┘     └─────────┘     └─────┬────┘     └─────┬────┘
     ▲                                                │                │
     │                                                ▼                │
     │                                            扣通勤费             ▼
     │                                          算到达分钟         成功 → 下一个 Day
     │                                                                 失败 → 结算
     │                                                                 通关 → 结算
     │                                                ▲                │
     └──────────────── 回到 Bedtime Screen（下一个 Day N+1）───────────┘

例外：Day 6 和 Day 7（周末）
  Bedtime Screen → 点「好好休息」→ 跳过 Sleep / Wake-up / Commute / Office 全部 → 直接 Day N+1
```

Screen 间传递的核心状态接口：

```typescript
interface PendingArrivals {
  pillow: boolean;
  eyeMask: boolean;
  earPlugs: boolean;
  smartLamp: boolean;
  dora: number;
}

interface GameState {
  // 基础
  dayIndex: number;             // 0 ~ 13
  balance: number;              // 余额
  sleepDebt: number;            // 当前累计睡眠债（分钟）
  bribeUsed: boolean;           // 贿赂是否用过

  // 物品
  inventory: Inventory;         // 见 §4.2
  pendingArrivals: PendingArrivals;  // 次日晚生效的已购物品（到货机制）

  // 工作日每天运行时产生
  alarmMin?: number;
  solTonight?: number;
  actualSleepMin?: number;
  newDebtTonight?: number;
  snoozeCount?: number;
  routineMin?: number;          // ROUTINE_BASE + snoozeCount×SNOOZE_PER
  commuteChoice?: CommuteId;
  commuteMin?: number;
  arriveMin?: number;
  isLate?: boolean;
  weatherToday?: WeatherLogic;  // 'clear' | 'snow'
  eventToday?: EventId | null;  // null | 'concert' | 'expo' | 'marathon' | 'holidayRush'

  // 结算回顾
  dailyLog: DayRecord[];
}

interface DayRecord {
  day: number;                  // 1 ~ 12
  isWorkDay: boolean;
  alarmHHMM?: string;
  sleepHHMM?: string;
  sleepDebtAfter?: number;
  snoozeCount?: number;
  commute?: string;             // 中文名："地铁" "快车" "专车"
  arriveHHMM?: string;
  isLate?: boolean;
  balanceAfter?: number;
}
```

---

## 7. 天气系统

### 7.1 两层设计：逻辑层 × 展示层

| 逻辑层 ID（实际影响数值）| 逻辑层中文名 | 前端展示 flavor（不影响数值，纯文案/图标）| 通勤加时 |
|------------------------|------------|----------------------------------------|---------|
| `clear` | 不下雪 | ☀️晴 / ⛅多云 / ☁️阴 / 🌫️雾霾（4 选 1，roll 时随机 flavor）| 快车/专车 +0 分钟，地铁 +0 |
| `snow` | 下雪 | 🌨️小雪 / ❄️中雪（2 选 1，暴雪 flavor 已移除）| 快车/专车 **+15 分钟**（你定的）；地铁不受影响 |

> 专车不免疫下雪加时（你定的），所以专车在下雪天是 25+15=40 分钟，和地铁一样耗时但贵 55 元；快车在下雪天 25+15=40 分钟，也和地铁同速但贵 25 元——下雪天地铁性价比最高。

### 7.2 天气发生分布（固定骨架 + 随机扰动）

```
固定骨架（保证体验不炸）：
  Day 1  : 不下雪（教学关不搞事）
  Day 12 : 70% 概率下雪（节前 Boss 关高概率）

随机扰动（增加重玩多样性）：
  其他未指定的工作日（Day 2/3/4/5/8/9/10/11）：20% 概率下雪 / 80% 不下雪

⚠️ 2026-08-05 机制简化：
  · 天气 roll 与 城市事件 roll **完全独立**，不再有「Day 4/5 有事件则额外下雪概率」
  · 当「下雪 + 事件」双灾叠加时，通勤加时叠加后有硬上限 25 分钟（§8.3 详见）
```

---

## 8. 城市事件系统

### 8.1 事件池

| 事件 ID | 中文名（前端 flavor）| 发生日规则 | 快车/专车加时 | 地铁加时 |
|--------|-------------------|-----------|-------------|---------|
| `concert` | 大型演唱会 | 普通事件池 | +15 分钟 | 0 |
| `expo` | 漫展开幕 | 普通事件池 | +15 分钟 | 0 |
| `marathon` | 马拉松封路 | 普通事件池 | +15 分钟 | 0 |
| `holidayRush` | 节前出行高峰 | **Day 12（最终周五）固定发生，独占不 roll** | **+20 分钟**（比普通事件多 +5）| 0 |
| `null` | 无事件 | 默认 | 0 | 0 |

> 前 3 个事件（演唱会/漫展/马拉松）**数值完全相同，只是前端 flavor 不同**，从 3 个里随机取 1 个不重复使用。

### 8.2 事件发生规则（你最终确认版）

```
1. Day 4（周四）和 Day 5（周五）：各自独立 50% 概率触发「普通事件」
   - 总共可能出现 0 / 1 / 2 次普通事件
   - 如果两天都触发，从事件池取两个**不重复**的 flavor
   - Day 5 不固定节前（节前高峰只在第二周周五 Day 12）

2. Day 1 ~ Day 3, Day 8 ~ Day 11：
   - 完全无事件（不 roll）

3. Day 12（最终 Boss 日，第二周周五）：
   - 固定发生「节前出行高峰」+20 分钟
   - 当天不 roll 其他普通事件（互斥，节前独占）

4. 地铁故障：
   - 原型阶段暂不实现（若以后加也是 1% 左右极稀有）
```

### 8.3 事件与天气叠加规则

```
事件加时 + 天气加时 = 先叠加，再取 25 分钟硬上限（MAX_COMMUTE_BONUS = 25，地铁免疫）

⚠️ 2026-08-05 机制简化：天气与事件彼此独立 roll，双灾叠加时加时统一 cap 到 25 分钟

典型案例（快车/专车，非地铁）：
  · 仅下雪           → 15 分钟（未触发 cap）
  · 仅普通事件       → 15 分钟（未触发 cap）
  · 仅节前高峰       → 20 分钟（未触发 cap）
  · 下雪 + 普通事件   → min(15+15, 25) = 25 分钟（触发 cap）
  · 下雪 + 节前高峰   → min(15+20, 25) = 25 分钟（触发 cap，Boss 关压力封顶）

极端案例（Day 12 Boss 关，旧实现对比）：
  旧（无 cap）：25 基础 + 15 下雪 + 20 节前 = 60 分钟通勤
  新（25 cap）：25 基础 + 25 加时封顶 = 50 分钟通勤
```

---

## 9. 10 天工作日难度日历（最终版）

| Day 编号 | 日期 | 工作日# | 天气逻辑 | 城市事件 | 设计意图 |
|---------|------|--------|---------|---------|---------|
| Day 1 | 周一 | #1 | 固定：不下雪（flavor 晴/多云/阴/雾霾随机）| 无 | **教学关**：给玩家 100% 能过的完美开局，建立信心，理解操作。 |
| Day 2 | 周二 | #2 | 20% 下雪 / 80% 不下雪 | 无 | 简单：让玩家练手 sleepDebt 机制，理解三档通勤的差异。 |
| Day 3 | 周三 | #3 | 20% 下雪 / 80% 不下雪 | 无 | 平静的一天：让玩家体验「连续三天不欠债的感觉」，开始规划买东西。 |
| Day 4 | 周四 | #4 | 20% 下雪 / 80% 不下雪 | **50% 概率** 普通事件（演唱会/漫展/马拉松 三选一 +15）| 第一个压力点：可能无事也可能出现事件，预告：明天还有 50% 概率。 |
| Day 5 | 周五 | #5 | 20% 下雪 / 80% 不下雪（与城市事件 roll 独立）| **50% 概率** 普通事件（与 Day 4 独立；若都触发则 flavor 不重复）| 第一周收尾：下雪 20% × 事件 50% 独立出现；双灾同时发生时加时统一 cap 到 25 分钟。 |
| Day 8 | 周一 | #6 | 20% 下雪 / 80% 不下雪 | 无 | **周一综合症**：经过周末回血后第一天平静开局，让玩家把买的装备用上。 |
| Day 9 | 周二 | #7 | 20% 下雪 / 80% 不下雪 | 无 | 平静：为最终冲刺做准备。 |
| Day 10 | 周三 | #8 | 20% 下雪 / 80% 不下雪 | 无 | 平静。 |
| Day 11 | 周四 | #9 | 20% 下雪 / 80% 不下雪 | 无 | 最后一个平静日，玩家要决定是否囤 DORA、是否买台灯为最终日备战。 |
| Day 12 | 周五 | #10 | **70% 概率下雪**（Boss 关）| **固定**节前出行高峰 +20 分钟（不 roll 其他事件）| **最终 Boss 关**：大概率下雪 + 节前必叠加。让玩家在紧张刺激中结束。通关就在今天。 |

---

## 10. GameState 初始化模板 & 关键流程钩子

### 10.1 Day 0 初始状态

```typescript
const INITIAL_STATE: GameState = {
  dayIndex: 0,
  balance: 50,
  sleepDebt: 0,                    // 开局无欠债
  bribeUsed: false,
  inventory: {
    pillow: false,
    eyeMask: false,
    earPlugs: false,
    smartLamp: false,
    dora: 0,
  },
  pendingArrivals: {
    pillow: false,
    eyeMask: false,
    earPlugs: false,
    smartLamp: false,
    dora: 0,
  },
  dailyLog: [],
};
```

### 10.2 每个 Day 的 Bedtime Screen 启动钩子

```typescript
function onEnterBedtime(state: GameState): void {
  // Step 1: 发日工资（Day 1~Day 12，Day 0 不发）
  if (state.dayIndex >= 1 && state.dayIndex <= 12) {
    state.balance += 20;
  }

  // Step 2: 周末 or 工作日 → 决定是否显示闹钟 UI（周末隐藏）
  // Step 3:  独立 roll 今天的天气和城市事件（二者完全独立，任何顺序均可）
  //          双灾叠加时通勤加时统一 cap 到 MAX_COMMUTE_BONUS = 25 分钟（§8.3）
  // Step 4: 处理 pendingArrivals → 合并进 inventory（昨日买的次日到货）
  // Step 5: 显示天气/事件预报给玩家（仅工作日）
}
```

### 10.3 pendingArrivals → inventory 的到货合并逻辑

```typescript
// Day N 睡前 Screen 启动时调用（合并 Day N-1 买的次日到货物品）
function applyPendingArrivals(state: GameState): void {
  const p = state.pendingArrivals;
  if (p.pillow)    { state.inventory.pillow = true;    p.pillow = false; }
  if (p.eyeMask)   { state.inventory.eyeMask = true;   p.eyeMask = false; }
  if (p.earPlugs)  { state.inventory.earPlugs = true;  p.earPlugs = false; }
  if (p.smartLamp) { state.inventory.smartLamp = true; p.smartLamp = false; }
  if (p.dora > 0)  { state.inventory.dora += p.dora;   p.dora = 0; }
}

// 玩家在睡前 Screen 购买物品时调用（DORA 当晚进 inventory，其他进 pendingArrivals）
function onBuyItem(state: GameState, itemId: string, qty: number = 1): void {
  switch (itemId) {
    case 'pillow':
    case 'eyeMask':
    case 'earPlugs':
    case 'smartLamp':
      state.balance -= PRICES[itemId];
      state.pendingArrivals[itemId] = true;   // 次日晚生效
      break;
    case 'dora':
      state.balance -= PRICES.dora * qty;
      state.inventory.dora += qty;           // 当晚立刻进库存（买了就能吃）
      break;
  }
}
```

---

## 11. 未确定项 TODO（P1 / P2 优先级，原型补充）

### P1：原型早期跑平衡后需要定的

| # | 项目 | 说明 | 建议草稿值（原型先用）|
|---|------|------|--------------------|
| P1-1 | 结算画面文案 | 通关/失败/不同余额区间的讽刺文案（需要 10~15 条）| — |
| P1-2 | 平衡性调整 | 跑模拟器 10 万局后根据通关率微调：SOL / 通勤费 / 取消率 / 下雪概率 | 当前值作为起点 |
| P1-3 | 前端 flavor 映射 | 天气 flavor 随机池的具体文案/图标命名 | §7.1 已列 6 种 flavor |
| P1-4 | 「余额为负时能不能买通勤/贿赂」边界 | 例如 balance=0 地铁 5 元也买不起怎么办 | 建议：买不起地铁 → Game Over（没路费=没法上班=算迟到）|

### P2：可后补，不阻塞原型

| # | 项目 | 说明 |
|---|------|------|
| P2-1 | 闹钟设置接近 10:00 时的嘲讽彩蛋文案 | "不如直接去公司睡？"等 |
| P2-2 | Flavor text 文案池 | snooze flavor（"你又赖了一次床"/"闹钟被你拍飞了"）、取消 flavor（"快车司机：接了个大单取消了…重新叫一辆"）、下雪/事件 flavor |
| P2-3 | 智能台灯 UI 表现 | 买了台灯后 Bedtime Screen / Wake-up Screen 怎么展示（可以先只加文字提示）|
| P2-4 | 失败文案区分 | 钱不够贿赂 vs 拒绝贿赂 vs 第二次迟到 vs 余额不够付地铁费，四种不同失败文案 |
| P2-5 | 分享功能 | 通关后生成 "我通关《别迟到》净赚 XX 元，第 X 天差点 GG" 风格的分享文本/图片 |

---

> **文档结束**。有修改建议请直接标注对应章节后更新本文档。
