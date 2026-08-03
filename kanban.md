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
- [x] `rollWeather(dayIndex, hasEvent, rng)`：Day1 强制 clear，Day12 70% snow，Day4/5 有事件时独立 30% snow roll 叠加，普通工作日 20% snow
- [x] `rollEvent(dayIndex, usedFlavors, rng)` → `{eventId, bonusMin, newlyUsedFlavor?}`：Day12 固定 holidayRush +20，Day4/5 各 50% 从 3 flavor 池**不重复抽取**+15，其余 null +0
- [x] 冒烟分布验证（10k 样本）：Day12 雪 70.5% / 普通 19.9% / 快车取消 30.2% / Day4-5 触发 50.1%，全部落在 ±1% 区间

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
    - `CHOOSE_COMMUTE(id)` → 调 `calculateCommute`，扣 balance（不够就 `CANNOT_AFFORD_COMMUTE` lose），算 arriveMin，判 isLate（>600）。不迟到：走 day-advance 流程。迟到：挂 `pendingBribe=true` 等下一步动作
    - `CHOOSE_BRIBE` → 检查 bribeUsed=false 且 balance ≥ 180：扣 180，bribeUsed=true，清 isLate，走 day-advance；余额不够 → `CANNOT_AFFORD_BRIBE` lose
    - `DECLINE_BRIBE` → `lose reason=REFUSED_BRIBE`
    - `PASS_WEEKEND` → sleepDebt × 0.5，newDebt=0，dayIndex+1，记 dailyLog
  - day-advance 流程（工作日 CHOOSE_COMMUTE 成功后或贿赂完成后）：
    1. effectiveDebt_next = sleepDebt × 0.5 + newDebtTonight
    2. 写 dailyLog（DayRecord：day 编号、工作日、闹钟 HH:MM、实际睡眠、debt 后值、snoozeCount、通勤中文名、到达 HH:MM、isLate、余额）
    3. dayIndex += 1
    4. 如果 dayIndex > 12 且最后一天打卡成功 → `status='win' finalBalance=balance`
    5. 否则返回 `status='playing'`
  - **有限状态机规则**：`pendingBribe` 挂起时 reducer 只接受 CHOOSE_BRIBE / DECLINE_BRIBE，其他 Action 抛 Error

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
- 加时：下雪 +15 / 普通事件 +15 / 节前高峰 +20（可叠加，无上限）
- 贿赂 180 元 / 限 1 次 / 用过后第二次迟到必输
- 资金：初始 50 + 12 天 × 20 = 理论上限 290 元
- Boss 关 Day12：节前高峰固定 + 70% 下雪概率
