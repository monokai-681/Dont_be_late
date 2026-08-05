# 《别迟到》看板 Kanban

> **维护规则**：✅ 已完成 = 简略（必要时用 checklist 扫一眼确认） | ⏳ 待做 = 详细写
> **单一信息中心**：任何方案改动先改这里再改代码
> **数值机制权威来源**：`game_spec.md`（本看板不重复数值表，只引用 §编号）

---

## 进度总览

| 阶段 | 名称 | 状态 | 关键产出 |
|------|------|------|---------|
| 0 | 设计文档 & 数值拍板 & 方案确认 | ✅ 完成 | game_spec v1.1 + 4 阶段流程 + 7 优化点 + 目录结构约定 |
| 1 | 无 UI 核心引擎 | 🔄 进行中（1-1✅ 1-2✅ 1-3⏳） | 基础设施+5核心函数已交付（commit c82ecbd）；待做 shop/reducer + 模拟器 + 单测 |
| 2 | 命令行可交互版 | ⏳ 待开始 | `src/cli.ts`，终端手动玩一局 |
| 3 | Web UI | ⏳ 待开始 | 响应式网页 6 个 Screen |
| 4 | 平衡调优 + 文案 | ⏳ 待开始 | 10 万局通关率 30%~50%，P1 TODO 全清 |

---

## ✅ 已完成（简略）

### 阶段 0：设计文档 & 数值拍板 & 方案确认

**项目基础**
- [x] 阅读设计文档（README / game_spec），理解游戏创意
- [x] GitHub 仓库 SSH 连接配置完成
- [x] 输出 `game_spec.md` v1.1（完整数值 spec + TS 函数签名）
- [x] 4 阶段开发顺序确定：引擎 → CLI → UI → 调优（先验证数值再做皮肤）
- [x] 7 个结构优化点确定：可复现 RNG / 常量分层 / Reducer / 带类型失败 / index 出口 / dailyLog 内建 / scripts 预置
- [x] 目录结构约定确定（见下方「开发规范」区）

**机制 & 数值拍板（全部对齐 game_spec）**
- [x] 时间模型：整数分钟（0=00:00, 600=10:00），前端展示转 HH:MM
- [x] Day 编号：Day 0（开局）~ Day 12（最终日），off-by-one 已解决
- [x] 日历：5 工作日 + 2 周末 + 5 工作日；周末 sleepDebt ×0.5 衰减（两天后剩 25%）
- [x] sleepDebt：目标睡眠 480min，每日衰减 50%
- [x] SOL：基础 45min，下限 10min
- [x] Snooze：溢出概率法单 roll（链式正确，1500 万次验证无跳号），每次 9min 上限 3 次；台灯 ×0.65
- [x] 通勤 3 档（移除「开车」）：🚇 地铁免疫 / 🚕 快车 30% 取消 / 🚘 专车 0% 取消但不免疫天气事件
- [x] 天气：逻辑 2 层（clear / snow+15min），展示 6 flavor
- [x] 城市事件：Day 4/5 独立 50% roll（3 flavor 不重复，+15）；Day 12 固定节前高峰 +20
- [x] 经济方案 A：初始 50 + 日薪 20×12 = 总 290；贿赂 180 限 1 次
- [x] 商店 5 种：枕头 40 / 眼罩 18 / 耳塞 12 / DORA 20颗 / 台灯 95（DORA 当晚生效，其余次日）
- [x] 命名规范：常量 UPPER_SNAKE / 变量 camelCase / 类型 PascalCase / 函数 camelCase
- [x] 原型移除项确认：开车、限行、车牌、油电区分、唑吡坦（传统安眠药）、地铁故障、纯随机堵车概率

---

### 阶段 1-1：基础设施（2026-08-03 · commit c82ecbd）

- [x] 工程脚手架：`package.json`（5 scripts + 6 devDeps）、`tsconfig.json`（strict ES2020）、`jest.config.js`（30s 超时）、`.gitignore`
- [x] 常量分层：`constants.ts` 23 个硬锚点 UPPER_SNAKE + `config/balance.ts` 全部平衡参数 `let` 化 + `resetBalanceToDefaults()` 便于扫描
- [x] RNG 可复现：`random.ts` mulberry32 算法 + `createRngFromString`（FNV-1a）+ `rngInt` / `rngPickIndex` 工具
- [x] 类型系统：`types.ts` 全套接口 — GameState（含 `usedEventFlavors`）/ Action 判别联合 / GameResult（play|win|lose + 4 种 LoseReason 分型）/ DayRecord / EngineDeps / CommuteResult 等
- [x] 唯一出口：`index.ts` barrel export（CLI/UI 禁止直接 import 内部路径），已导出 constants / Balance 命名空间 / types / RNG / 5 核心函数
- [x] `tsc --noEmit` strict 模式 0 错误；Node 26 / npm 11 环境确认无需升级（已满足 engines >=20）

---

### 阶段 1-2：五大核心函数（2026-08-03 · commit c82ecbd）

- [x] `calculateSOL()`：base -6/-4/-3 永久道具 + -15 DORA 消耗品，下限 SOL_MIN 10，纯函数无 rng
- [x] `rollSnoozeCount()`：溢出概率法单 roll（expected 整数部分必触发 + 小数概率 +1），台灯 ×0.65，SNOOZE_MAX 3 硬上限；**4500 万次三场景严格验证零跳号**（debt=80 仅 0/1，debt=150 仅 1/2，debt=250 仅 2/3）
- [x] `calculateCommute()`：三档 switch（subway immune 40m/5¥；express 25m/30¥ 30% 取消 +10m**最多 1 次**；premium 25m/60¥ 不取消但受天气事件）；bonusMin 仅非免疫加：下雪 +15 / eventBonus +0/+15/+20
- [x] `rollWeather(dayIndex, rng)`：Day1 强制 clear，Day12 70% snow，普通工作日 Day2/3/4/5/8/9/10/11 下雪率 20%（与城市事件 roll 完全独立，2026-08-05 机制简化移除了 hasEventToday 参数和 Day4/5 有事件叠加雪的分支）
- [x] `rollEvent(dayIndex, usedFlavors, rng)` → `{eventId, bonusMin, newlyUsedFlavor?}`：Day12 固定 holidayRush +20，Day4/5 各 50% 从 3 flavor 池**不重复抽取**+15，其余 null +0
- [x] 冒烟分布验证（10k 样本）：Day12 雪 70.5% / 普通 19.9% / 快车取消 30.2% / Day4-5 触发 50.1%，全部落在 ±1% 区间

---

### 阶段 1 回头看修复（2026-08-04）

- [x] #1 SOL_BASE 命名对齐：`constants.ts` 中 `SOL_BASE__MIN`（双下划线错误命名）改回 `SOL_BASE`（与 game_spec §2.2 一致），`index.ts` barrel 新增导出
- [x] #2 events.ts 加时参数改为读 balance：`bonusMin` 硬编码 15/20 → 改用 `EVENT_NORMAL_BONUS_MIN` / `EVENT_HOLIDAY_BONUS_MIN`，避免以后调参不一致
- [x] tsc --strict 0 错误回归验证通过

---

### 阶段 1 机制简化（2026-08-05 · MAX_COMMUTE_BONUS=25min 独立 roll）

- [x] 天气/城市事件改为完全独立 roll：移除 rollWeather 的 hasEventToday 参数，删除 Day4/5「有事件则额外 30% 下雪」分支，Day4/5 下雪率与普通工作日一致 20%
- [x] 新增 MAX_COMMUTE_BONUS=25 锚点常量（§2.2 机制常量），calculateCommute 中天气+事件加时叠加后统一 Math.min cap 到 25 分钟
- [x] 同步移除 balance.ts 的 WEATHER_SNOW_RATE_EVENT_DAY 参数及 reset 函数对应项
- [x] game_spec 文档四处同步：§7.2 天气分布表 / §8.3 叠加规则（含 5 个典型案例 + 新旧 Boss 关对比）/ §9 Day5 难度日历行 / §10.2 Step3 钩子注释
- [x] 设计遗留问题 #3（roll 调用顺序依赖）与 #5（Day4/5 下雪率 30% vs 44% 歧义）**均已被本次机制简化直接消解，无需再讨论**

---

## ⏳ 待做（详细写）

### 阶段 1：无 UI 核心引擎
**目标**：`src/engine/` 纯 TS 模块，`npm run sim 10000` 能输出通关率+失败原因分布报告  
**核心原则**：纯函数 + 可复现，零 DOM 依赖，可在 Node 里直接跑  
**进度**：1-1 ✅ / 1-2 ✅ / 1-3 ⏳ / 1-4 ⏳ / 1-5 ⏳（详细完成记录见上方「✅ 已完成」区）

---

#### 1-1 基础设施
**✅ 已完成，见上方「阶段 1-1：基础设施」**

---

#### 1-2 五大核心函数
**✅ 已完成，见上方「阶段 1-2：五大核心函数」**

---

**编码硬规则（所有阶段必须遵守，防止以后踩坑）**：
1. 命名严格对齐 game_spec §1：`UPPER_SNAKE_CASE` 常量 / `camelCase` 变量函数 / `PascalCase` 类型
2. 任何需要随机性的地方**从参数注入 rng**，禁止直接 `Math.random()`
3. 所有函数默认写**纯函数**，不修改入参对象，返回新对象（immutable）
4. CLI/UI 层只能 `import ... from './engine'`（barrel），禁止 `from './engine/xxx'` 直碰内部文件

---

#### 1-3 状态机（reducer）& shop

**文件**：
- `src/engine/shop.ts`
  - `applyPendingArrivals(state: GameState): GameState` — §10.3：把 pendingArrivals 里的 pillow/eyeMask/earPlugs/smartLamp 置 true 进 inventory，dora 颗数累加进 inventory，pending 对应字段清空
  - `onBuyItem(state: GameState, itemId: string, qty?: number): GameState` — DORA 当晚进 `inventory.dora`（扣钱 × qty）；其余 4 种进 `pendingArrivals`（扣钱，次日到货）。价格从 `config/balance.ts` 读
- `src/engine/engine.ts`
  - 导出 `INITIAL_STATE: GameState`（对齐 game_spec §10.1，balance=50, debt=0, bribeUsed=false, 全空 inventory）
  - 导出核心：`reducer(state: GameState, action: Action, deps: {rng: Rng}): GameResult`
  - Action 处理：
    - `SET_ALARM(min)` → 写 `state.alarmMin`，校验 420~600 且能被 5 整除，非法输入**抛 Error**（调用方 UI 层应做校验，reducer 直接报让调用方尽早发现 bug）
    - `BUY_ITEM(id, qty)` → 调 `onBuyItem`；余额不够**抛 Error**（商店不判输，UI 拦截不让买）
    - `USE_DORA_TONIGHT` → 如果 `inventory.dora > 0`，dora -= 1，设置临时标记 `doraUsedTonight=true`（存在 `state` 里）
    - `CHOOSE_COMMUTE(id)` → 调 `calculateCommute`，扣 balance（不够就 `CANNOT_AFFORD_COMMUTE` lose），算 arriveMin，判 isLate（>600）。不迟到：直接走 day-advance 流程。迟到：内联处理贿赂分支：若 bribeUsed=false 且 balance≥180 则给玩家一个 CHOOSE_BRIBE / DECLINE_BRIBE 决策（由调用方上下文决定，不在 state 里挂起，因为 #7 决策移除了 pendingBribe 防御字段）
    - `CHOOSE_BRIBE` → 仅在「当前 CHOOSE_COMMUTE 迟到且能贿赂」的上下文下调用；检查 bribeUsed=false 且 balance ≥ 180：扣 180，bribeUsed=true，清 isLate，走 day-advance；余额不够 → `CANNOT_AFFORD_BRIBE` lose
    - `DECLINE_BRIBE` → `lose reason=REFUSED_BRIBE`
    - `PASS_WEEKEND` → sleepDebt × 0.5，newDebt=0，dayIndex+1，记 dailyLog
  - day-advance 流程（工作日 CHOOSE_COMMUTE 成功后或贿赂完成后）：
    1. effectiveDebt_next = sleepDebt × 0.5 + newDebtTonight
    2. 写 dailyLog（DayRecord：day 编号、工作日、闹钟 HH:MM、实际睡眠、debt 后值、snoozeCount、通勤中文名、到达 HH:MM、isLate、余额）
    3. dayIndex += 1
    4. 如果 dayIndex > 12 且最后一天打卡成功 → `status='win' finalBalance=balance`
    5.- 否则返回 `status='playing'`
  - **#7 决策（2026-08-05）：移除 pendingBribe / dailyWageCredited 两个防御性字段，改由调用方上下文约定 Action 发送顺序**。不再有「pendingBribe 挂起时拒绝其他 Action」的有限状态机规则；调用方（CLI/UI）必须严格按照 Screen 流转发 Action。

---

#### 1-4 模拟器

**文件**：`src/simulator.ts`

功能：
- 接受参数：`{games: number, seed?: number, strategy?: StrategyConfig}`
- 内置简单 AI 策略（默认）：
  - 闹钟：永远设 7:30（450 分钟），或根据前一天 debt 动态（debt > 60 就往前调 10 分钟）
  - 商店：Day1 买眼罩+耳塞（最便宜的两个 SOL 削减），剩钱买 DORA 囤着，台灯如果 balance > 120 就买
  - 通勤：下雪或有事件 → 地铁；否则 → 快车；balance ≥ 100 且下雪 + 事件叠加 → 专车
  - DORA：SOL 计算前，如果 (alarmMin - SOL_BASE) < 480 就吃 1 颗
- 输出统计：
  - 总场次 / 通关率 / Day12 通关率（通关且最后一天赢的比率）
  - 平均最终余额 / 通关局平均余额 / 失败局平均余额
  - 失败原因饼图（4 种 LoseReason 各占 %）
  - 死亡日分布（Day 1~12 各死了多少次）
  - 打印用时 + 可复现 seed

CLI 入口：`npm run sim 1000` → 跑 1000 局打印报告；`npm run sim:10k` → 跑 10000 局

---

#### 1-5 单元测试

**文件**：
- `src/tests/snooze.test.ts` — 必测项：
  1. debt=0 → 期望 0 次，实际 0 次（100 万次 roll 不出 >0）
  2. debt=100 有灯 → 期望 0.65 次，分布收敛到约 65% 出 1 次
  3. debt=300 → 期望 3.0 次，实际就是 3 次（无随机性）
  4. **不跳号断言**：1500 万次 roll 中，出现 count=2 的前一次一定是 count≥1（即从不出现从 0 直接跳到 2）—— game_spec 里专门提过的 bug 防止
  5. 有灯 vs 无灯：同 debt 下，平均次数比值接近 0.65（±1%）
- `src/tests/commute.test.ts` — 必测项：
  1. 地铁：任何 isSnow/eventBonus 组合都返回 40min/5元/cancelled=false
  2. 快车 clear 无事件：25min/30元，取消率约 30%（固定 rng seed 下精确断言）
  3. 快车 + 下雪 + 事件 +15：base25 + 雪15 + 事件15 = 55min，取消时 +10 = 65min
  4. 快车取消最多 1 次：即使 rng 连续 100 次 <0.3，实际 cancelled 只影响 1 次（bonusMin 只加 10，不会 20）
  5. 专车：从不 cancelled，但雪和事件加时正确
- `src/tests/engine.test.ts` — 整局变体测试：
  1. Day1 教学关无雪无事件 + 闹钟 7:00 + 地铁 → 100% 不迟到，顺利进入 Day2
  2. 周末 Day6 PASS_WEEKEND：sleepDebt=100 → Day6 后=50 → Day7 后=25；newDebt 始终不增加
  3. 贿赂流程：第一次迟到后选贿赂 → balance-180、bribeUsed=true、day 正常推进；第二次迟到后无论如何都是 lose SECOND_LATE
  4. 拒绝贿赂：第一次迟到直接 lose REFUSED_BRIBE
  5. 余额 0 选地铁 → lose CANNOT_AFFORD_COMMUTE

---

### 阶段 2~4：⏳ 阶段 1 完成后拆细

---

### P1 / P2 文案 & 边界 TODO（阶段 4 主做，阶段 1-3 可以先留 TODO 占位）

#### P1（原型早期必补，不补会出体验坑）
- [ ] P1-1 结算画面文案：通关 / 失败 / 不同余额区间的讽刺文案 10~15 条
- [ ] P1-2 平衡性调整：跑模拟器 10 万局后微调 SOL / 通勤费 / 取消率 / 下雪概率，目标通关率 30%~50%
- [ ] P1-3 前端 flavor 映射：天气 flavor 随机池的具体文案 / 图标命名（§7.1 已列 6 种：晴/多云/阴/雾霾/小雪/中雪）
- [ ] P1-4 余额为负边界：买不起任何通勤（balance < 5 元地铁）的处理逻辑 → 建议：直接判 lose CANNOT_AFFORD_COMMUTE

#### P2（可后补，不阻塞原型上线）
- [ ] P2-1 闹钟 > 10:00 嘲讽彩蛋文案（"不如直接去公司睡？"风格）
- [ ] P2-2 Flavor text 文案池：snooze 文案 / 快车取消文案 / 下雪事件 flavor
- [ ] P2-3 智能台灯 UI 表现：Bedtime Screen / Wake-up Screen 怎么展示（先文字提示也行）
- [ ] P2-4 4 种失败画面区分文案：没钱贿赂 vs 拒贿 vs 二次迟到 vs 没钱坐地铁
- [ ] P2-5 分享功能：通关后生成 "我通关《别迟到》净赚 XX 元，第 X 天差点 GG" 风格分享文本/图片
- [ ] P2-6 预留：后续版本加回开车 / 限行 / 事故 / 地铁故障（原型阶段不做）
- [ ] P2-7 前端图标 / Screen 视觉风格统一

---

## 📚 开发规范 & 约定（阶段 1 写代码时参考）

### 目录结构（阶段 1 完成后应长成这样）

```
Dont_be_late/
├── README.md
├── game_spec.md          # 数值与机制唯一权威来源
├── kanban.md             # 本文件：进度看板 + 待做详情 + 规范
├── package.json          # scripts: sim / sim:10k / cli / test / test:w
├── tsconfig.json
├── jest.config.js
└── src/
    ├── engine/
    │   ├── index.ts              # 唯一对外出口（CLI/UI 只能从这里 import）
    │   ├── constants.ts          # 硬锚点
    │   ├── config/
    │   │   └── balance.ts        # 平衡参数（调难度只改这个）
    │   ├── types.ts
    │   ├── random.ts             # 可复现 RNG
    │   ├── sol.ts
    │   ├── snooze.ts
    │   ├── commute.ts
    │   ├── weather.ts
    │   ├── events.ts
    │   ├── shop.ts
    │   └── engine.ts             # reducer 纯函数状态机
    ├── tests/
    │   ├── snooze.test.ts        # 防跳号 + 边界
    │   ├── commute.test.ts       # 三档正确性 + 叠加逻辑
    │   └── engine.test.ts        # 整局流转变体
    ├── simulator.ts              # 简单 AI 跑 N 局 → 统计报告
    └── cli.ts                    # 阶段 2 才写
```

### 7 个结构优化点（为什么这么做）

| # | 优化 | 目的 |
|---|------|------|
| 1 | 可复现 RNG（seed 化） | 模拟器出极端案例后同一 seed 重跑复现，单测确定性 |
| 2 | 常量分层：硬锚点 vs 平衡参数 | 调参时不会手滑改错锚点（如把 ALARM_STEP 改成 10） |
| 3 | Reducer 纯函数模式 | immutable 新状态，测试简单，后期加悔棋/重放/时间旅行无成本 |
| 4 | 带类型失败结果 LoseReason | 4 种 Game Over 结构化，UI 直接 switch 展示不同文案，不用解析字符串 |
| 5 | index.ts 统一对外出口 | 重构内部文件（比如把 commute 拆成 commute + traffic）不影响 CLI/UI |
| 6 | dailyLog 引擎内建 | UI「每日回顾」和模拟器「死亡统计」共用一份数据，不重复不冲突 |
| 7 | package.json scripts 预置 | 一周后回来 `cat package.json` 就知道怎么跑，不用翻聊天记录 |

### 关键锚点速查（不想查 game_spec 时瞟一眼，数值以 game_spec 为准）

- 打卡截止：600 分钟 = 10:00
- 目标睡眠：480 分钟 = 8 小时
- sleepDebt 每日衰减：× 0.5
- SOL 基础 45 分钟 / 下限 10 分钟
- ROUTINE_BASE 25 + snooze 每次 9（上限 3 次，+27）
- 通勤三档：🚇 地铁 40m/5元(免疫) | 🚕 快车 25m/30元(30%取消+10m) | 🚘 专车 25m/60元(不取消)
- 加时：下雪 +15 / 普通事件 +15 / 节前高峰 +20（可叠加后 cap 到 MAX_COMMUTE_BONUS = 25 分钟）
- 贿赂 180 元 / 限 1 次 / 用过后第二次迟到必输
- 资金：初始 50 + 12 天 × 20 = 理论上限 290 元
- Boss 关 Day12：节前高峰固定 + 70% 下雪概率

---

## 🔧 交接前遗留问题清单（2026-08-05 汇总）

> 本章节由两份并行检查（代码层回头看 + 文档层漂移检查）合并汇总。
> 目标：在把项目交给独立开发者之前，尽量减少「静默 bug」「文档漂移」「实现歧义」三类交接坑。
> 优先级说明：🔴 高 = 交接前必须修或至少写清修复路径；🟡 中 = 交接前建议修，新开发者看到会困惑；🟢 低 = 不阻塞交接，开发过程中顺手修即可。
> 进度：`[ ]` 未修；`[~]` 已在本章写清修复路径但代码未动；`[x]` 本轮已修复。

---

### 本轮已在前面修复的条目（不再需要交接，但为了完整性记录）

- [x] 🔴 game_spec §4.3 / §4.5 伪代码缺 `rng: Rng` 参数、用 `Math.random()` （易诱使新人回退）
- [x] 🔴 game_spec §4.5 伪代码缺 `MAX_COMMUTE_BONUS=25` cap（2026-08-05 机制简化）
- [x] 🔴 §6 GameState 与实际 types.ts 字段双向不一致 5 处（usedEventFlavors/doraUsedTonight/commuteCancelled/pendingBribe/dailyWageCredited）—— §6 已补前 3 个；pendingBribe/dailyWageCredited 已按 #7 决策从 types.ts 和 kanban FSM 规则同步移除
- [x] 🟡 kanban 已完成区 L66 rollWeather 描述残留旧 `hasEvent` 参数 —— 已重写为独立 roll 版本
- [x] 🟡 kanban 关键锚点速查 L268 写「可叠加无上限」—— 已改成 25 min cap
- [x] 🟡 §8.2 缺少 usedEventFlavors 实现四要素 —— §8.2 末尾补了完整 TS 签名 + 四要素规则
- [x] 🟡 §2.2 SOL_BASE 常量分层（SOL_BASE 锚点 vs SOL_BASE_MINUTES 调参）文档未说明 —— §2.2 锚点表 + balance.ts 注释都已写明两者关系
- [x] 🟡 kanban 1-3 reducer 方案的 `pendingBribe` FSM 规则与 #7 决策冲突 —— 已移除 FSM 挂起规则，重写为「调用方上下文约定」模式
- [x] 🟡 kanban §10.3 `onBuyItem` itemId:string vs types.ts `ShopItemId` + qty 默认值不一致 —— game_spec 已同步为 `itemId: ShopItemId, qty?: number`
- [x] 🟡 §2.2 机制常量锚点表缺少 `MAX_COMMUTE_BONUS = 25` 行 —— 已补
- [x] 🟡 §2.3 `TOTAL_DAYS=13` 与 Day13 结算日定义边界不清 —— 已加说明：Day13 是展示层编号，不进 TOTAL_DAYS
- [x] 🟡 types.ts 中 dayIndex 范围 0~12（你新决策是 0~13，Day13 结算日）—— 已修正，DayRecord.day 范围同步扩大到 1~13

---

### 🔴 高（交接前必须修或至少写清修复代码路径）

| # | 来源 | 标题 | 一句话风险 | 推荐修复代码 / 规范链接 |
|---|------|------|------------|-------------------------|
| C-1 | 代码 4.1 | 所有对外函数缺 dayIndex / sleepDebt / eventBonus / CommuteId 范围断言 | sleepDebt=-50 会算出 -1 次 snooze → 早晨流程凭空少 9 分钟；非法 CommuteId 会导致 NaN 通勤时间和花费；dayIndex 越界静默返回错误值不抛错 | **统一在每个 barrel 导出函数顶部加范围断言**（建议写一个 `src/engine/asserts.ts` 工具模块）：<br>`assertIntegerInRange(dayIndex, 0, 13, 'rollWeather:dayIndex')`<br>`assertNonNegative(sleepDebt, 'rollSnoozeCount')`<br>`assertEnum(choice, ['subway','express','premium'], 'calculateCommute')`<br>commute switch 补 `default: throwUnknownEnum(choice)` |
| C-2 | 代码 4.3 + 4.1 | calculateCommute bonusMin 缺下限 0 保护 + eventBonus 范围断言 | 传负数 eventBonus 会让通勤时间缩短（作弊）；虽然正常调用不会传负，但作为公共 API 必须自证健壮 | `bonusMin = Math.max(0, Math.min(bonusMin, MAX_COMMUTE_BONUS))`（上下限双保护）；入口补 `assertIntegerInRange(eventBonus, 0, EVENT_HOLIDAY_BONUS_MIN || 20)` |
| C-3 | 代码 1.1 | 阶段 1-3 关键文件缺失（实现空洞） | `INITIAL_STATE` / `reducer` / `applyPendingArrivals` / `onBuyItem` 在 barrel 里注释占位，但 `engine.ts` / `shop.ts` 文件根本不存在。CLI/UI 会编译失败。game_spec §10 已经给了实现模板 | 交接前至少写一个**骨架 stub**（函数存在，抛 `NotImplementedError`），并在 kanban 1-3 子任务里给每个函数贴上对应的 game_spec 章节号 + 伪代码链接，让新开发者「不用先找规范」 |
| C-4 | 代码 4.4 | `rngInt(min, max)` 对 `min > max`（调用方传反）无断言 | 结果悄悄落在错误区间不抛错 —— 属于最难调试的「静默数值偏差」 | 入口加 2 行断言：<br>`if (min > max) throw new Error('rngInt: min>max')`<br>`if (!Number.isInteger(min)\|\|!Number.isInteger(max)) throw 'integer required'` |
| C-5 | 代码 6.2 | GameState 15 个 runtime optional 字段无「阶段→非空」契约 | reducer 读取 `state.arriveMin` 时如果忘记初始化，会得到 undefined → `undefined + 25 = NaN` 链式污染全局 | 二选一：<br>**方案 A（推荐）**：交接文档里单独列一张「15 个 runtime 字段的写入阶段表」，并在 reducer 读取前统一用 `assertPresent(state, 'arriveMin')` 抛错<br>**方案 B（大改，可延后）**：把 GameState 拆成判别联合 `type GameState = { phase: 'bedtime'; ... bedtimeFields } \| { phase: 'commute'; ... }`，用类型系统保证非空 |
| C-6 | 代码 6.3 | `PendingArrivals.dora` 字段注释与 game_spec 模板矛盾 | types.ts 注释写「虽然现在 DORA 不 pending 但保持对称」；game_spec §10.3 `applyPendingArrivals` 里又有 `if (p.dora>0)` 处理逻辑。新开发者不知道听谁的 | **必须二选一写进规范**（交接前统一）：<br>**X（推荐）**：不支持 DORA 次日到货 → 从 PendingArrivals 接口和 game_spec §10.3 代码里删掉 dora 行<br>**Y**：支持 DORA 囤货次日到货 → 删掉 types.ts 注释「不 pending」，补全「什么路径会进 pending dora」的触发条件说明 |
| C-7 | 代码 2.1 | SOL_BASE 锚点 vs SOL_BASE_MINUTES 调参两套并存，文档指前者，实际用后者 | 模拟器扫 SOL_BASE_MINUTES 后，外部 UI 层如果 `assert(state.sol === SOL_BASE)` 会假失败，三套（文档/锚点/实际运行值）不同步 | 二选一（交接前定）：<br>**方案 A（推荐）**：sol.ts 改为 `SOL_BASE_OVERRIDE ?? SOL_BASE`，锚点是权威，balance 只在扫描时覆盖<br>**方案 B**：barrel 删除 SOL_BASE 公开导出，game_spec §2.2 所有公式里 SOL_BASE 改名 SOL_BASE_MINUTES |

---

### 🟡 中（交接前建议修，减少新人困惑）

| # | 来源 | 标题 | 推荐修复 |
|---|------|------|---------|
| C-8 | 代码 1.2 | `EngineDeps.now` 预留字段从未被任何地方读取 | 要么直接删除（避免类型膨胀），要么在注释里标 `@deprecated 原型阶段不传` |
| C-9 | 代码 2.2 | weather.ts 手写 workDay 重复硬编码，没复用 `WORK_DAY_INDICES`；多写了 dayIndex===12（虽然进不到，但容易误导） | `const isWorkDay = WORK_DAY_INDICES.includes(dayIndex)` 一行替代 |
| C-10 | 代码 2.3 + 6.1 | `NORMAL_EVENT_FLAVORS` 声明 `string[]`，丢了字面量类型，需要 `flavor as EventId` 断言 | 改为 `const NORMAL_EVENT_FLAVORS: readonly (EventId & string)[] = ['concert','expo','marathon'] as const;`，同时删除 `as EventId` 断言，避免拼写错误被类型系统吞掉 |
| C-11 | 代码 4.2 | events.ts 手写 `Math.floor(rng()*N)`，没复用 `rngPickIndex`（统一了空数组保护） | `const idx = rngPickIndex(rng, remaining)`，保持所有随机整数走统一入口 |
| C-12 | 代码 7.4 | balance let 参数缺 snapshot/restore 接口，参数扫描工具写起来麻烦 | balance.ts 加两个导出：<br>`getBalanceSnapshot(): Record<string, number>`<br>`applyBalanceSnapshot(snap): void` |
| C-13 | 代码 6.2 | DayRecord 接口 9 个 optional 字段，没有「工作日 vs 周末 vs Day13 结算」子类型区分 | 交接文档里补一张「DayRecord 三类场景字段填充表」：工作日填全部 9 个；周末只填 day/isWorkDay/balanceAfter/sleepDebtAfter（4 个）；Day13 结算日只填 day/isWorkDay/finalBalance（3 个）|

---

### 🟢 低（不阻塞交接，开发时顺手修）

| # | 来源 | 标题 | 说明 |
|---|------|------|------|
| C-14 | 代码 5.1 | game_spec 伪代码示例用 Math.random 但实际实现已注入 Rng | 本轮已在 §4.3 / §4.5 伪代码顶部加了「⚠️ 算法说明伪代码…真实实现必须注入 Rng」的声明。若还有遗漏在其他章节，搜索 `Math.random` 统一加声明即可 |
| C-15 | 文档 9 | kanban 1-3 CHOOSE_COMMUTE 流程没写把 `CommuteResult.cancelled` 写回 `state.commuteCancelled` | 本轮已在 kanban §漂移 #9 修复建议处提了一句，等阶段 1-3 写 CHOOSE_COMMUTE 时补上一行即可 |
| C-16 | 文档 10 | §5.3 经济参数表缺「代码常量名」列（INITIAL_BALANCE/DAILY_SALARY/BRIBE_COST） | 纯文档美化，交接时新开发者搜索「初始余额 50」也能找到 balance.ts，不急 |

---

### 交接前工作流建议（给下一位开发者）

1. **第 0 天**：读 `game_spec.md`（数值与机制权威）→ 读 `kanban.md` 本章「遗留问题清单」和「阶段 1-3 详细设计」→ 理解 `src/engine/index.ts` 是唯一对外出口
2. **先修 🔴 高 7 条**（C-1~C-7）：尤其是 C-1（范围断言）和 C-3（写 engine/shop 骨架 stub）—— 有断言保护后，写任何代码都不容易静默错；骨架文件存在后，新开发者不会被 barrel 注释误导
3. **再写阶段 1-3**（shop.ts + engine.ts reducer）：按 §10.2 / §10.3 伪代码落地，过程中自然修掉 C-9/C-10/C-11（都是顺手改）
4. **跑阶段 1-4 模拟器**（simulator.ts）：1 万局统计通关率，用 balance 参数调难度
5. **最后写阶段 1-5 单测**：snooze 不跳号、commute cap 生效、dayIndex 断言抛错等，参数化测试覆盖
