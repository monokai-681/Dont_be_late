# 《别迟到》游戏数值规格文档 (Game Spec)

> **版本**: v1.6
> **生成日期**: 2026-08-03
> **最后更新**: 2026-08-07
> **状态**: takeover 与 Phase 1 已结束；D-8 第二轮参数已验证，D-10 待决

---

## 1. 文档说明

本文档是《别迟到》原型开发的**唯一数值、机制、状态流与边界规则权威来源**。所有代码实现必须以本文档为准。
如果在开发中发现数值问题或需要调整，应先更新本文档，再改代码。

文档职责固定如下：

- `game_spec.md`：机制、数值、状态流与边界规则；变更先在此定稿。
- `kanban.md`：进度、任务、风险和待决事项，只引用本规格，不重复定义冲突规则。
- `README.md`：项目入口和摘要。
- `design_backup_old.md`：**已作废的历史文件，不得引用、采用或更新。**

### 命名约定（TypeScript / JavaScript）

| 场景 | 命名规范 | 正确例子 | 错误例子 |
|------|---------|---------|---------|
| 模块级硬编码常量（永不修改的 magic number）| **UPPER_SNAKE_CASE** | `const CLOCKIN_DEADLINE = 540` | `const clockin_deadline = 540` |
| 运行时会变的变量 / 对象字段 | **camelCase** | `sleepDebt`, `gameState.balance` | `gameState.BALANCE` |
| 类 / 接口 / 类型名 | **PascalCase** | `interface GameState`, `class Engine` | `interface gameState` |
| 函数 / 方法名 | **camelCase** | `function rollSnoozeCount()` | `Roll_Snooze_Count()` |

### 公共函数输入契约

- 引擎从 `src/engine/index.ts` 暴露的公共计算函数必须在入口校验运行时输入，不能只依赖 TypeScript 静态类型。
- 非整数或越界的 `dayIndex`、负数或非有限的 `sleepDebt`、非法通勤 ID、非布尔天气标记以及越界的事件加时必须立即抛出 `TypeError` 或 `RangeError`，不得静默产生 `NaN` 或缩短时间。
- `rngInt()` 只接受整数边界且要求 `min <= max`；非法范围必须立即失败。
- 以上校验只保护 API 边界，不改变合法游戏输入下的概率或数值。

---

## 2. 固定锚点 & 常量（硬编码常量）

### 2.1 时间锚点

| 常量名 | 值 | 人类时间 | 说明 |
|-------|-----|---------|------|
| `BEDTIME_MIN` | `0`（分钟）| 00:00（当天凌晨）| 每个 Day 循环的固定时间起点 |
| `CLOCKIN_DEADLINE` | `540`（分钟）| 09:00 | 上班打卡 deadline，超过算「迟到」；D-8 首轮实验值 |
| `TARGET_SLEEP_MIN` | `480`（分钟）| 8 小时 | 每晚「睡饱了」的目标睡眠时长 |
| `ALARM_MIN` | `420`（分钟）| 07:00 | 工作日闹钟允许的最早设置时间 |
| `ALARM_MAX` | `600`（分钟）| 10:00 | 工作日闹钟允许的最晚设置时间（后续考虑做嘲讽彩蛋）|
| `ALARM_STEP` | `5`（分钟）| — | 闹钟调节步长，与所有时间粒度一致 |

### 2.2 机制常量

| 常量名 | 值 | 说明 |
|-------|-----|------|
| `SOL_BASE` | `45`（分钟）| 无任何助眠物品时的入睡等待时间（Sleep Onset Latency）。**硬锚点权威值**；参数扫描/调难度时临时覆盖 `balance.ts SOL_BASE_OVERRIDE`（null=用锚点；数字=覆盖） |
| `SOL_MIN` | `10`（分钟）| SOL 下限：买了所有道具也不能低于 10 分钟（不可能合眼秒睡）|
| `ROUTINE_BASE` | `25`（分钟）| 早晨基础流程时间：起床→出门所需固定耗时（洗漱/穿衣/拿包），不含 snooze |
| `SNOOZE_PER` | `9`（分钟）| 每一次 snooze（赖床）增加的早晨流程时间 |
| `SNOOZE_MAX` | `6`（次）| snooze 次数硬上限（最大额外 54 分钟）；D-8 首轮实验值 |
| `SNOOZE_GRADIENT` | `60`（分钟 sleepDebt）| 每增加 60 分钟睡眠债，snooze 期望次数增加 1；D-8 第二轮正式值 |
| `LAMP_MULTIPLIER` | `0.65` | 智能台灯效果：snooze 期望次数乘以该系数（打 65 折 = 减少 35% 赖床概率）|
| `WORKDAY_DEBT_CARRY` | `0.5` | 工作日计算当晚新债前，旧 sleepDebt 保留 50% |
| `WEEKEND_DEBT_DECAY` | `0.5` | Day 6/7 各自保留 50% 旧 sleepDebt；完整周末后剩 25% |
| `MAX_COMMUTE_BONUS` | `25`（分钟）| 快车/专车 天气+事件叠加加时的硬上限（2026-08-05 机制简化：二者独立 roll，双灾压到 25 封顶）|

### 2.3 尺寸/结构常量

| 常量名 | 值 | 说明 |
|-------|-----|------|
| `TOTAL_DAYS` | `13`（Day 0 ~ Day 12）| Day 0 开局介绍；Day 1~12 游戏循环。**结算页是 `GameResult`/`result phase`，不叫 Day 13，也不计入 `TOTAL_DAYS`。** |
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
| **Result** | 结算 | — | — | `GameResult` 展示层：通关或失败 + 最终余额 + Day 1~12 每日回顾；不是 Day，不写入 `dailyLog` |

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
    │  办公室 Screen│  显示打卡分钟数 VS 540 deadline
    │  Office      │  若迟到 → 弹出贿赂（180元/只能用一次）
    │              │  玩家选择后 → 进入下一个 Day
    └──────┬───────┘
           │
     sleepDebt 已在本日睡眠结束、snooze 之前更新：
       morningDebt = previousCarriedDebt × WORKDAY_DEBT_CARRY + newDebtTonight
       本日 snooze 使用 morningDebt；通勤结束后不再重复衰减
       将 morningDebt 作为 carriedDebt 带入下一个 Day
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
     ★ sleepDebt 只做衰减：effectiveDebt_nextDay = currentSleepDebt × WEEKEND_DEBT_DECAY
     ★ 跳转到下一个 Day
```

**效果**：经过 Day 6 和 Day 7 两个周末，sleepDebt = 周五结束时的 `0.5 × 0.5 = 25%`。

---

## 4. 核心机制（附伪代码 / TS 函数签名）

> snooze 函数已通过 1500 万次 roll 验证，不存在「跳过第一次直接触发第二次」的跳号概率 bug。

### 4.1 sleepDebt 规则

```
变量名：sleepDebt  （number，单位分钟，始终 ≥ 0）

工作日当晚睡眠结束、计算 snooze 之前：
  previousCarriedDebt = sleepDebt
  newDebt = max(0, TARGET_SLEEP_MIN - actualSleepMin)
  sleepDebt = previousCarriedDebt × WORKDAY_DEBT_CARRY + newDebt

紧接着的早晨：
  rollSnoozeCount(sleepDebt, ...)  // 当晚新增的 newDebt 立即影响本次早晨

工作日通勤结束：
  不再对 sleepDebt 做第二次衰减；直接带入下一个 Day

周末不执行睡眠和 newDebt，只执行一次：
  sleepDebt = sleepDebt × WEEKEND_DEBT_DECAY

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
 * ⚠️ 算法说明伪代码：真实实现必须注入 Rng，禁止直接使用 Math.random（见 src/engine/random.ts）
 * @param sleepDebt    当天早晨生效的累计睡眠债（已在循环起点做过工作日结转 + newDebt 处理）
 * @param hasSmartLamp 是否购买了智能台灯
 * @param rng          可复现随机数发生器注入（mulberry32）
 * @returns 0 ~ SNOOZE_MAX 之间的整数
 */
function rollSnoozeCount(
  sleepDebt: number,
  hasSmartLamp: boolean,
  rng: Rng,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): number {
  // Step 1: 期望次数 = min(sleepDebt / 60, SNOOZE_MAX=6)
  let expected = Math.min(sleepDebt / SNOOZE_GRADIENT, SNOOZE_MAX);

  // Step 2: 智能台灯：期望乘以 0.65（整体打 65 折）
  if (hasSmartLamp) expected *= LAMP_MULTIPLIER;

  // Step 3: 溢出概率法（只 roll 一次，从根源杜绝「跳过第一次直接第二次」）
  //   整数部分 = 必触发次数
  //   小数部分 = 再多触发 1 次的概率
  const base = Math.floor(expected);
  const extraProb = expected - base;
  let count = base + (rng() < extraProb ? 1 : 0);

  // Step 4: 硬上限保险
  return Math.min(count, SNOOZE_MAX);
}
```

### 4.4 早晨流程时间

```
morningRoutineMin = ROUTINE_BASE + snoozeCount × SNOOZE_PER
                   (25 分钟基础)     (每次 9 分钟，最多 6 次 = +54 分钟)
```

### 4.5 通勤结算（三档 · 含取消 roll + 天气/事件加时）

> 关键设计点：
> - 「开车」选项已移除，原型只有 3 种通勤方式
> - 快车取消：最多发生 0 或 1 次，**绝不会取消第二次**（重新叫的第二辆必然成功）
> - 专车：取消率 0%（从不取消），但**不免疫**天气/事件加时
> - 地铁：完全不受天气、事件、取消影响，永远 60 分钟 / 5 元

```typescript
type CommuteId = 'subway' | 'express' | 'premium';

interface CommuteResult {
  commuteMin: number;    // 最终通勤耗时
  commuteCost: number;   // 最终费用（已经扣到 balance 外单独返回）
  cancelled: boolean;    // 快车是否被取消（前端展示 flavor）
}

/**
 * 通勤结算（工作日选完交通方式后调用）
 * ⚠️ 算法说明伪代码：真实实现必须注入 Rng，禁止直接使用 Math.random（见 src/engine/random.ts）
 * @param choice      玩家选择的通勤 ID
 * @param isSnow      当天下雪（true/false）
 * @param eventBonus  当天城市事件加时（0 / 15 / 20 分钟，节前高峰 20）
 * @param rng         可复现随机数发生器注入（快车取消 roll 用）
 * @returns 结算结果
 */
function calculateCommute(
  choice: CommuteId,
  isSnow: boolean,
  eventBonus: number,
  rng: Rng,
): CommuteResult {
  // 基础参数（三档）
  let baseMin: number;
  let baseCost: number;
  let cancelRate: number;   // 快车 30% / 专车 0% / 地铁 0%
  let immune: boolean;      // 是否免疫天气和事件（地铁免疫）

  switch (choice) {
    case 'subway':
      baseMin = 60;   baseCost = 5;   cancelRate = 0;    immune = true;  break;
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
    bonusMin = Math.min(bonusMin, MAX_COMMUTE_BONUS); // ⚠️ 双灾叠加硬上限 25 分钟
  }

  // Step 2: 快车取消 roll（只 roll 一次！取消最多 0 或 1 次，第二次必成功）
  const cancelled = choice === 'express' && rng() < cancelRate;
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
// ⚠️ 真实实现抽成独立函数：calculateArrivalMinutes()，便于单测和复用
arriveMin  = alarmMin + morningRoutineMin + commuteResult.commuteMin;
balance   -= commuteResult.commuteCost;

isLate    = arriveMin > CLOCKIN_DEADLINE;   // > 540 算迟到
lateMin   = arriveMin - CLOCKIN_DEADLINE;   // 迟到分钟数（仅展示用）
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
  if (balance >= 对应价格 && 购买请求合法) balance -= 对应价格
  else 拒绝操作，不改变状态

通勤消费：
  余额不足的通勤选项不可选择；非法请求被拒绝，不改变状态
  if (balance < 5) 没有任何可负担通勤 → CANNOT_AFFORD_COMMUTE
  else 选择可负担通勤后 balance -= 对应通勤费用

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
| 🚇 地铁 | `subway` | **60 分钟**（固定）| **5 元** | 0% | ❌ 完全免疫（0 加时）| **稳但慢**：永远 60 分/5 元，耗时确定但不保证赶上打卡 |
| 🚕 快车 | `express` | **25 分钟** | **30 元** | **30%**（取消 +10 分，最多取消 1 次）| ✅ 下雪 +15 / 事件 +15/+20 | **性价比之选**：便宜一半但赌取消率，还受天气事件影响 |
| 🚘 专车 | `premium` | **25 分钟** | **60 元**（快车 2 倍）| **0%**（从不取消）| ✅ 下雪 +15 / 事件 +15/+20（不免疫）| **稳但贵**：60 元买「从不取消」，但天气/事件照样加时，不如地铁稳 |

> 三档取舍口诀：**地铁 = 时间换钱；快车 = 省钱赌运气；专车 = 花钱买不被取消。**

### 5.2 商店物品（5 种）

| 中文名 | 内部 ID | 类型 | 价格 | 效果 | 到货规则 |
|-------|--------|------|------|------|---------|
| 软枕头 | `pillow` | 永久物品（限购 1 个）| 40 元 | SOL -6 分钟 | **次日晚**：Day N 睡前买 → Day N+1 睡前 calculateSOL 生效 |
| 眼罩 | `eyeMask` | 永久物品（限购 1 个）| 18 元 | SOL -4 分钟 | 次日晚 |
| 耳塞 | `earPlugs` | 永久物品（限购 1 个）| 12 元 | SOL -3 分钟 | 次日晚 |
| DORA | `dora` | 消耗品（颗）| 20 元/颗 | SOL -15 分钟，无耐药 | **当晚立刻**：买了当天 calculateSOL 就能用（安眠药例外规则）；库存剩余颗数，吃 1 颗 inventory.dora -= 1 |
| 智能台灯 | `smartLamp` | 永久物品（限购 1 个）| 95 元 | rollSnoozeCount 中 expected × 0.65 | 次日晚 |

**SOL 最大削减量验证**：枕头-6 + 眼罩-4 + 耳塞-3 + DORA-15 = **-28 分钟**  
45 - 28 = 17 分钟 ≥ SOL_MIN(10)。✅ 合规。

#### 商店与 DORA 边界规则（2026-08-05 确认）

- 余额永远不得低于 0；余额不足时购买请求必须被拒绝，不扣款、不改变状态。
- 枕头、眼罩、耳塞、智能台灯已经拥有或已在 `pendingArrivals` 中时，不得重复购买。
- DORA 购买数量必须是正整数；允许一次购买多颗，余额必须覆盖全部数量。
- 每晚最多服用 1 颗 DORA。第一次成功服用后设置 `doraUsedTonight=true` 并扣 1 颗；当晚重复操作不得再次扣库存。
- DORA 永远当晚进入 `inventory.dora`，不进入 `pendingArrivals`。

### 5.3 经济参数

| 项目 | 代码配置名 | 值 | 说明 |
|------|-----------|-----|------|
| 初始余额 | `INITIAL_BALANCE` | 50 元 | Day 0 开局给 |
| 日工资 | `DAILY_SALARY` | 20 元/天 | Day 1~12 每晚睡前发，共 12 次（周末也发，最后一天也发）|
| 总资金上限 | — | 50 + 12×20 = **290 元** | 玩家理论上最多能花的钱 |
| 贿赂金额 | `BRIBE_COST` | **180 元** | 只能用一次，抹去一次迟到记录 |
| 贿赂可用次数 | — | 1 次 | 用过后第二次迟到直接 Game Over |
| 全勤奖 | — | 取消 | 方案 A，通关无额外奖励 |
| 结算到手金额 | — | = `balance`（最终余额）| 通关或失败都只看最终余额 |

**余额硬规则（2026-08-05 确认）**：`balance` 始终大于或等于 0。买不起某个商品或通勤方式时，该选项不可用；这本身不判负。只有连最便宜的 5 元地铁也买不起时才以 `CANNOT_AFFORD_COMMUTE` 失败。迟到后余额不足 180 元则以 `CANNOT_AFFORD_BRIBE` 失败。

**成绩规则（D-11，2026-08-06 确认）**：通关是第一目标；最终余额是通关后的次级分数，可用于分享或排行榜。失败局仍展示余额，但不进入正式成绩比较，也不能以高余额胜过任何通关局。

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
  // ⚠️ 2026-08-05 C-6 决策：不支持 DORA 次日到货（简化机制）。DORA 永远当晚进 inventory.dora，不在 pendingArrivals 队列里。
}

interface GameState {
  // 基础
  phase: GamePhase;             // 判别字段；reducer 必须按 phase 限制当前合法 Action
  dayIndex: number;             // 0 ~ 12（Day0=开局介绍；Day1~12=游戏循环；Result 不占 Day 编号）
  balance: number;              // 余额
  sleepDebt: number;            // 当前累计睡眠债（分钟）
  bribeUsed: boolean;           // 贿赂是否用过

  // 物品
  inventory: Inventory;         // 见 §4.2
  pendingArrivals: PendingArrivals;  // 次日晚生效的已购物品（到货机制）

  // 城市事件 flavor 不重复池（2026-08-05 机制补全）
  usedEventFlavors: string[];   // 已用过的普通事件 flavor（'concert'|'expo'|'marathon'）
                                // Day0 初始化为 []，**全生命周期不 reset**
                                // 详情见 §8.2 末尾「实现机制四要素」

  // 工作日每天运行时产生
  alarmMin?: number;
  doraUsedTonight?: boolean;    // 今晚是否服用 DORA（SOL 计算依赖此标记，§4.2）
  solTonight?: number;
  actualSleepMin?: number;
  newDebtTonight?: number;
  snoozeCount?: number;
  routineMin?: number;          // ROUTINE_BASE + snoozeCount×SNOOZE_PER
  commuteChoice?: CommuteId;
  commuteMin?: number;
  commuteCancelled?: boolean;   // 快车是否被取消（前端展示 flavor，CommuteResult.cancelled 写回）
  arriveMin?: number;
  isLate?: boolean;
  weatherToday?: WeatherLogic;  // 'clear' | 'snow'
  eventToday?: EventId | null;  // null | 'concert' | 'expo' | 'marathon' | 'holidayRush'
  eventBonusMin?: number;       // rollEvent 当天一次生成并保存的 0 / 15 / 20，通勤阶段不重新 roll 或推导

  // 结算回顾
  dailyLog: DayRecord[];        // 只记录已结束的 Day 1~12；Result 不写入日志
}

type GamePhase =
  | 'intro'
  | 'bedtime'
  | 'sleeping'
  | 'wakeup'
  | 'commute'
  | 'office'
  | 'bribe'
  | 'result';

> 上面的 `GameState` 是领域字段总览。真实 TypeScript 已使用以 `phase` 为判别字段的联合类型，把各阶段必需字段设为必填，不依赖 UI 调用顺序维持合法性。

interface WorkDayRecord {
  day: number;
  isWorkDay: true;
  alarmHHMM: string;
  sleepHHMM: string;
  sleepDebtAfter: number;
  snoozeCount: number;
  commute?: string;             // 中文名："地铁" "快车" "专车"
  arriveHHMM?: string;
  isLate?: boolean;
  balanceAfter: number;
}

interface WeekendRecord {
  day: number;
  isWorkDay: false;
  sleepDebtAfter: number;
  balanceAfter: number;
}

type DayRecord = WorkDayRecord | WeekendRecord;
```

### 6.1 Action 与拒绝语义（2026-08-06 确认）

阶段推进使用明确 Action，不由一次 reducer 调用自动跳过多个 Screen：

```text
START_GAME → SET_ALARM/BUY_ITEM/USE_DORA_TONIGHT → START_SLEEP
→ WAKE_UP → CONTINUE_TO_COMMUTE → CHOOSE_COMMUTE
→ CONTINUE_TO_NEXT_DAY 或 CHOOSE_BRIBE/DECLINE_BRIBE
```

- `PASS_WEEKEND` 只用于 Day 6/7；周末仍可 `BUY_ITEM`。
- 跨阶段、重复或乱序 Action 属于调用方程序错误，抛出 `InvalidActionError`。
- 余额不足、重复购买、无 DORA、闹钟非法等正常玩家限制不抛异常；reducer 返回 `{status:'rejected', state, reason}`，状态保持不变，UI 根据结构化 reason 展示提示。
- `playing/rejected/win/lose` 是 reducer 的四类结构化结果；只有正式失败进入 `lose`，被拒绝的操作不等同于 Game Over。

---

## 7. 天气系统

### 7.1 两层设计：逻辑层 × 展示层

| 逻辑层 ID（实际影响数值）| 逻辑层中文名 | 前端展示 flavor（不影响数值，纯文案/图标）| 通勤加时 |
|------------------------|------------|----------------------------------------|---------|
| `clear` | 不下雪 | ☀️晴 / ⛅多云 / ☁️阴 / 🌫️雾霾（4 选 1，roll 时随机 flavor）| 快车/专车 +0 分钟，地铁 +0 |
| `snow` | 下雪 | 🌨️小雪 / ❄️中雪（2 选 1，暴雪 flavor 已移除）| 快车/专车 **+15 分钟**（你定的）；地铁不受影响 |

> 专车不免疫下雪加时，所以专车在下雪天为 25+15=40 分钟；快车在未取消时也是 40 分钟。两者仍比 60 分钟地铁快，但价格更高，且快车保留取消风险。

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

**实现机制四要素（必须遵守，2026-08-05 补全）：**
  1. 数据结构：GameState.usedEventFlavors: string[] —— 已用普通事件 flavor 池，
     初始空数组，**全生命周期不 reset**（避免未来 Day8~11 若加普通事件时也不会重复）。
  2. 谁负责写入：调用 rollEvent() 的一方（reducer.onEnterBedtime）——
     若 rollEvent 返回 newlyUsedFlavor，则 immutable 追加：
       nextUsed = [...prevUsed, newlyUsedFlavor]
     写回 GameState.usedEventFlavors。
  3. 生命周期：Day 初始化一次，绝不 reset。
  4. 函数签名（真实实现）：

```typescript
interface RollEventResult {
  eventId: EventId;              // null | 'concert' | 'expo' | 'marathon' | 'holidayRush'
  bonusMin: number;             // 0 | 15 | 20
  newlyUsedFlavor?: string;   // 若触发了普通事件，返回本次用掉的 flavor（写回 usedEventFlavors）
}

/**
 * @param dayIndex          0~12
 * @param usedEventFlavors 已用 flavor 池（排除已用）
 * @param rng              可复现随机数注入（禁止 Math.random）
 */
function rollEvent(
  dayIndex: number, usedEventFlavors: readonly string[], rng: Rng,
): RollEventResult;
```
⚠️ 算法伪代码示例只是说明，真实实现必须注入 Rng。

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

### 8.4 RNG 公平性目标（D-9，2026-08-06 确认）

- 运气是游戏体验的一部分，允许充分准备的玩家仍因不可规避随机结果失败。
- 为避免短小游戏产生过强挫败感，使用“充分准备并按已揭示信息选择安全方案”的参考策略运行完整一局时，**纯 RNG 导致的整局失败率必须低于 25%**。
- 玩家主动选择快车等高风险方案后因取消失败，仍计入随机性影响统计，但模拟报告必须与“安全参考策略下的不可规避 RNG 失败”分开呈现。
- 因早期消费、闹钟或通勤决策不当造成的资金不足或迟到不归类为纯 RNG 失败。
- 25% 是上限约束，不是期望值；具体实际比例由模拟器数据决定。

### 8.5 D-8 模拟验证（2026-08-07）

- 工具：`src/simulator.ts`；默认 base seed `20260807`，每类策略 10,000 局，相同局号在不同策略间共享同一 seed。
- 固定策略：不购物、不看已揭示信息，每个工作日固定 07:00 闹钟并乘地铁。
- 普通自适应策略：购买低价睡眠用品，按睡债调整闹钟，并根据已揭示天气、事件和余额选择通勤；这是用于比较的规则型基线，不代表最优玩家。
- 安全参考策略：固定 07:00 闹钟；根据当晚最大可能 snooze 和已揭示天气/事件，先预留最低保底通勤费，再按台灯→枕头→眼罩→耳塞的顺序购物；早晨选择“考虑快车取消后仍保证准时”的最低成本通勤，不使用 DORA。
- 报告分别输出通关率、Day 12 到达率、余额、失败原因、死亡日、启发式失败归因和可复现失败 seed；失败归因不是因果证明，平衡结论需要结合策略规则复核。
- 首轮关键结果：固定、普通自适应与安全参考策略均为 100% 通关；安全参考策略纯 RNG 整局失败率 0%。因此 D-9 的 `<25%` 上限形式上通过，但当前参数过于安全，不能据此认定随机体验已经合理。
- D-8 首轮实验被模拟数据否证：Gradient 100 时，固定、普通自适应与安全参考策略在每类 10,000 局中均为 100% 通关；上限 6 没有被自然触发。
- 第二轮曾测试完全线性债务累积：固定和普通策略均为 0%，安全策略仅 42.65%，纯 RNG 失败 57.35%，违反 D-9，故不采用。
- 第二轮正式值保留工作日/周末每日 0.5 结转并将 Gradient 降至 60。默认 seed `20260807`、每类 100,000 局结果：固定策略 32.051%，普通自适应 60.786%，安全参考 99.994%；安全参考仅 6 局失败，纯 RNG 整局失败率 0.006%，通过 D-9。
- `SNOOZE_MAX` 继续保持 6；在 0.5 结转下自然睡眠债不会触及更高上限，单独把上限改为 7 或 10 不改变默认策略结果。

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
  phase: 'intro',
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
  },
  usedEventFlavors: [],            // 普通事件 flavor 去重池，Day0 空，终身不 reset
  dailyLog: [],
};
```

### 10.2 每个 Day 的 Bedtime Screen 启动钩子

```typescript
function onEnterBedtime(state: GameState): GameState {
  const next = cloneGameState(state); // 伪代码：真实实现可用结构化 immutable update
  // Step 1: 发日工资（Day 1~Day 12，Day 0 不发）
  if (next.dayIndex >= 1 && next.dayIndex <= 12) {
    next.balance += 20;
  }

  // Step 2: 周末 or 工作日 → 决定是否显示闹钟 UI（周末隐藏）
  // Step 3:  独立 roll 今天的天气和城市事件（二者完全独立，任何顺序均可）
  //          双灾叠加时通勤加时统一 cap 到 MAX_COMMUTE_BONUS = 25 分钟（§8.3）
  // Step 4: 处理 pendingArrivals → 合并进 inventory（昨日买的次日到货）
  // Step 5: 显示天气/事件预报给玩家（仅工作日）
  // 真实实现 immutable 返回新状态，并把 phase 转为 'bedtime'；不得重复发工资或重复处理到货
  return next;
}
```

### 10.3 pendingArrivals → inventory 的到货合并逻辑

```typescript
// Day N 睡前 Screen 启动时调用（合并 Day N-1 买的次日到货物品）
function applyPendingArrivals(state: GameState): GameState {
  const next = cloneGameState(state);
  const p = next.pendingArrivals;
  if (p.pillow)    { next.inventory.pillow = true;    p.pillow = false; }
  if (p.eyeMask)   { next.inventory.eyeMask = true;   p.eyeMask = false; }
  if (p.earPlugs)  { next.inventory.earPlugs = true;  p.earPlugs = false; }
  if (p.smartLamp) { next.inventory.smartLamp = true; p.smartLamp = false; }
  // ⚠️ C-6 决策：DORA 不进 pendingArrivals，买了当晚立刻进 inventory.dora，无此处理分支
  return next;
}

// 玩家在睡前 Screen 购买物品时调用（DORA 当晚进 inventory，其他进 pendingArrivals）
// itemId: ShopItemId 字面量联合（'pillow'|'eyeMask'|'earPlugs'|'dora'|'smartLamp'），
//   不是宽泛 string，避免拼写错误绕过编译检查
// qty: 仅 dora 支持多颗（默认为 1），其他 4 种永久道具 qty 固定 1
function onBuyItem(state: GameState, itemId: ShopItemId, qty?: number): GameState {
  const next = cloneGameState(state);
  const n = qty ?? 1;
  switch (itemId) {
    case 'pillow':
    case 'eyeMask':
    case 'earPlugs':
    case 'smartLamp':
      next.balance -= PRICES[itemId];
      next.pendingArrivals[itemId] = true;   // 次日晚生效
      break;
    case 'dora':
      next.balance -= PRICES.dora * n;
      next.inventory.dora += n;             // 当晚立刻进库存（买了就能吃）
      break;
  }
  // 真实实现还必须在扣款前执行 §5.2 的余额、重复购买、qty 和单晚 DORA 规则
  return next;
}
```

---

## 11. 未确定项 TODO（P1 / P2 优先级，原型补充）

### P1：原型早期跑平衡后需要定的

| # | 项目 | 说明 | 建议草稿值（原型先用）|
|---|------|------|--------------------|
| P1-1 | 结算画面文案 | 通关/失败/不同余额区间的讽刺文案（需要 10~15 条）| — |
| P1-2 | 平衡性调整 | 跑模拟器 10 万局后根据通关率微调：SOL / 通勤费 / 取消率 / 下雪概率 | 当前值作为起点；目标口径待 D-10 决策 |
| P1-3 | 前端 flavor 映射 | 天气 flavor 随机池的具体文案/图标命名 | §7.1 已列 6 种 flavor |
| D-8 | 固定保守策略是否允许无脑通关 | **已确认并验证第二轮方案**：09:00 打卡、地铁 60 分钟、snooze 每次 9 分钟且上限 6、工作日/周末每日债务结转 0.5、Gradient 60 | 100,000 局中固定策略 32.051%、普通策略 60.786%、安全参考 99.994%；单独提高 snooze 上限无效 |
| D-9 | 是否允许不可规避的纯 RNG 死亡 | **已确认**：允许运气造成失败，但安全参考策略下纯 RNG 导致的整局失败率必须低于 25% | 统计口径见 §8.4 |
| D-10 | 模拟器目标通关率 | **待决定**：D-8 第二轮已有 100,000 局分策略数据 | 当前实测固定 32.051%、普通 60.786%、安全 99.994%；需决定主验收策略和正式目标区间 |
| D-11 | 最终余额的地位 | **已确认**：通关是主目标；最终余额是通关后的次级分数；失败局余额只展示、不参与正式成绩比较 | 见 §5.3 |

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
