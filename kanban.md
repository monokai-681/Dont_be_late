# 《别迟到》看板 Kanban

> **维护规则**：✅ 已完成 = 简略（必要时用 checklist 扫一眼确认） | ⏳ 待做 = 详细写
> **职责**：本文件只维护进度、任务、风险和待决事项；机制、数值、状态流与边界规则以 `game_spec.md` 为唯一权威来源，变更先在规格定稿再同步任务。
> **作废文件**：`design_backup_old.md` 仅作历史保留，不得引用、采用或更新。

---

## 进度总览

| 阶段 | 名称 | 状态 | 关键产出 |
|------|------|------|---------|
| 0 | 设计文档 & 数值拍板 & 方案确认 | ✅ 完成 | game_spec v1.1 + 4 阶段流程 + 7 优化点 + 目录结构约定 |
| 1 | 无 UI 核心引擎 | ✅ 完成（1-1~1-5✅） | 完整 reducer、商店、三策略模拟器和引擎测试已交付 |
| 2 | 命令行可交互版 | ✅ 完成 | `src/cli.ts` 可完整游玩、支持复现 seed；全项目 130 项测试通过 |
| 3 | Web UI | 🔄 进行中（3-1✅ 3-2✅ 3-3🔄 3-4⏳） | React/Vite 功能原型已覆盖全部 Screen；待真实试玩、交互修正和视觉细化 |
| 4 | 平衡调优 + 文案 | ⏳ 待开始 | 10 万局模拟；通关率口径待 D-10 确认；P1 TODO 全清 |

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
- [x] 时间模型：整数分钟（0=00:00, 540=09:00），前端展示转 HH:MM；D-8 首轮实验值
- [x] Day 编号：Day 0（开局）~ Day 12（最终日），off-by-one 已解决
- [x] 日历：5 工作日 + 2 周末 + 5 工作日；周末 sleepDebt ×0.5 衰减（两天后剩 25%）
- [x] sleepDebt：目标睡眠 480min；工作日和每个周末日均保留旧债 50%，完整周末后剩 25%
- [x] SOL：基础 45min，下限 10min
- [x] Snooze 参数：Gradient 60；溢出概率法单 roll，每次 9min、上限 6 次；台灯 ×0.65；D-8 已完成 10 万局验证
- [x] 通勤 3 档（移除「开车」）：🚇 地铁免疫天气/城市事件但有 5% 故障 +15min / 🚕 快车 30% 取消 / 🚘 专车 0% 取消但不免疫天气事件
- [x] 天气：逻辑 2 层（clear / snow+15min），展示 6 flavor
- [x] 城市事件：Day 4/5 独立 50% roll（3 flavor 不重复，+15）；Day 12 固定节前高峰 +20
- [x] 经济方案 A：初始 50 + 日薪 20×12 = 总 290；贿赂 180 限 1 次
- [x] 商店 5 种：枕头 40 / 眼罩 18 / 耳塞 12 / DORA 20颗 / 台灯 95（DORA 当晚生效，其余次日）
- [x] 命名规范：常量 UPPER_SNAKE / 变量 camelCase / 类型 PascalCase / 函数 camelCase
- [x] 原型移除项确认（历史，D-12 已部分推翻）：开车、限行、车牌、油电区分、唑吡坦（传统安眠药）、纯随机堵车概率仍移除；地铁故障已于 2026-08-08 加回

### Takeover 决策收敛（2026-08-05，已批准）

- [x] 文档层级：`game_spec.md` 管机制/数值/状态流/边界，`kanban.md` 管任务和进度，README 只做摘要
- [x] `design_backup_old.md` 已作废：不采用、不引用、不更新
- [x] 睡眠债时序：`morningDebt = previousCarriedDebt × 0.5 + newDebtTonight`，当晚新债立即影响紧接着的早晨；通勤后不二次衰减
- [x] 状态机方向：采用带 `phase` 的判别联合，由 reducer 自行拒绝非法 Action，不再依赖 UI 调用顺序维持合法性
- [x] Result 建模：Day 只到 12；结算页是 `GameResult/result phase`，不叫 Day 13，也不写入 `dailyLog`
- [x] 余额硬规则：不允许负余额；买不起某个选项时禁用/拒绝，只有连 5 元地铁都买不起才 `CANNOT_AFFORD_COMMUTE`
- [x] 商店边界：永久物品已拥有或 pending 时不能重复购买；DORA 数量必须为正整数，每晚最多服用 1 颗
- [x] Takeover 阶段于 2026-08-06 完成并获批结束；项目恢复早期原型开发
- [x] D-8 第二轮历史基线：09:00 打卡；地铁 60min/5元且风险 0%；snooze 每次 9min、上限 6 次；工作日/周末每日债务结转 0.5；`SNOOZE_GRADIENT=60`；当时 10 万局为固定 32.051%、普通 60.786%、安全 99.994%。地铁零风险已由 D-12 替换
- [x] D-12 当前正式值：Gradient 与债务参数不变；地铁 5% 故障、故障 +15min，仍免疫天气/城市事件且不与睡眠债联动；10 万局为固定 24.482%、普通 48.933%、安全 97.662%，D-9 纯 RNG 失败 2.338%

---

### 阶段 1-1：基础设施（2026-08-03 · commit c82ecbd）

- [x] 工程脚手架：`package.json`（5 scripts + 6 devDeps）、`tsconfig.json`（strict ES2020）、`jest.config.js`（30s 超时）、`.gitignore`
- [x] 常量分层：`constants.ts` 硬锚点 + 不可变 `DEFAULT_BALANCE_CONFIG`；参数扫描复制配置后显式注入
- [x] RNG 可复现：`random.ts` mulberry32 算法 + `createRngFromString`（FNV-1a）+ `rngInt` / `rngPickIndex` 工具
- [x] 类型系统：`GameState` phase 判别联合、显式 Action、`GameResult`（playing/rejected/win/lose）、工作日/周末 DayRecord 联合
- [x] 唯一出口：`index.ts` barrel export（CLI/UI 禁止直接 import 内部路径），已导出 constants / 默认 BalanceConfig / types / RNG / 核心函数 / shop / reducer
- [x] `tsc --noEmit` strict 模式 0 错误；Node 26 / npm 11 环境确认无需升级（已满足 engines >=20）

---

### 阶段 1-2：五大核心函数（2026-08-03 · commit c82ecbd）

- [x] `calculateSOL()`：base -6/-4/-3 永久道具 + -15 DORA 消耗品，下限 SOL_MIN 10，纯函数无 rng
- [x] `rollSnoozeCount()`：D-8 已将 `SNOOZE_MAX` 落实为 6；回归测试覆盖上限、相邻结果集合、台灯期望比例和 09:00 策略边界
- [x] `calculateCommute()`：地铁为 60m/5¥、免疫天气/事件并独立 roll 5% 故障 +15min；回归测试覆盖天气/事件组合、故障阈值、10 万次分布及不可变默认配置
- [x] `rollWeather(dayIndex, rng)`：Day1 强制 clear，Day12 70% snow，普通工作日 Day2/3/4/5/8/9/10/11 下雪率 20%（与城市事件 roll 完全独立，2026-08-05 机制简化移除了 hasEventToday 参数和 Day4/5 有事件叠加雪的分支）
- [x] `rollEvent(dayIndex, usedFlavors, rng)` → `{eventId, bonusMin, newlyUsedFlavor?}`：Day12 固定 holidayRush +20，Day4/5 各 50% 从 3 flavor 池**不重复抽取**+15，其余 null +0
- [x] 冒烟分布验证（10k 样本）：Day12 雪 70.5% / 普通 19.9% / 快车取消 30.2% / Day4-5 触发 50.1%，全部落在 ±1% 区间

---

### 阶段 1 回头看修复（2026-08-04）

- [x] #1 SOL_BASE 命名对齐：`constants.ts` 中 `SOL_BASE__MIN`（双下划线错误命名）改回 `SOL_BASE`（与 game_spec §2.2 一致），`index.ts` barrel 新增导出
- [x] #2 events.ts 加时参数改为读 balance：`bonusMin` 硬编码 15/20 → 改用 `EVENT_NORMAL_BONUS_MIN` / `EVENT_HOLIDAY_BONUS_MIN`，避免以后调参不一致
- [x] tsc --strict 0 错误回归验证通过

---

### 阶段 1 基础函数加固（2026-08-06）

- [x] C-1/C-2：新增统一运行时校验；非法 dayIndex、sleepDebt、通勤 ID、天气标记和事件加时立即抛出标准错误
- [x] C-4：`rngInt()` 拒绝非整数或反向边界
- [x] C-9：天气工作日判断复用 `WORK_DAY_INDICES`
- [x] C-10/C-11：普通事件 flavor 保留精确字面量类型，并统一使用 `rngPickIndex()`
- [x] 修正 `GameState` / `DayRecord` 中残留的 Day13 注释；Result 不占 Day 编号、不写 `dailyLog`
- [x] 五个基础函数与随机工具共 6 个测试套件、76 项测试全部通过
- [x] 覆盖率：Statements 98.81% / Branches 96% / Lines 99.06%；`tsc --noEmit` 0 错误

---

### 阶段 1-3 状态机与商店（2026-08-06）

- [x] C-5：`GameState` 改为 `phase` 判别联合，各阶段必需字段由 TypeScript 保证
- [x] 显式阶段 Action：`START_GAME / START_SLEEP / WAKE_UP / CONTINUE_TO_COMMUTE / CONTINUE_TO_NEXT_DAY` 等
- [x] 操作语义：跨阶段调用抛 `InvalidActionError`；玩家限制返回 typed `rejected` 且不改状态
- [x] `shop.ts`：永久物品次日到货、DORA 当晚入库、重复/数量/余额边界、immutable update
- [x] `engine.ts`：工资与到货一次性处理、睡债时序、周末、通勤、迟到、贿赂、四种失败、Day12 通关
- [x] C-12：全局可变参数改为冻结的 `DEFAULT_BALANCE_CONFIG` + 显式注入，扫描配置互不污染
- [x] C-13：`DayRecord` 改为 `WorkDayRecord | WeekendRecord`；Result 不生成日志项
- [x] C-8：删除未使用的 `EngineDeps.now`
- [x] 8 个测试套件、112 项测试通过；包含 Day1→Day12 整局通关、周末、贿赂、余额和非法 Action

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
**进度**：1-1 ✅ / 1-2 ✅ / 1-3 ✅ / 1-4 ⏳ / 1-5 ✅

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

**✅ 已完成，见上方「阶段 1-3 状态机与商店」**

**文件**：
- `src/engine/shop.ts`
  - `applyPendingArrivals()` — 把 pending 的四种永久物品合并进 inventory 并清空队列；DORA 永远不进 pending
  - `onBuyItem()` — DORA 当晚进库存，其余次日到货；返回 accepted 或 typed rejection，始终 immutable
- `src/engine/engine.ts`
  - 导出 `INITIAL_STATE` / `createInitialState()` / `reducer()` / `calculateArrivalMinutes()`
  - `GameState` 是以 `phase` 判别的联合：`intro → bedtime → sleeping → wakeup → commute → office/bribe → result`
  - 显式 Action 推进每个 Screen；跨阶段、重复或乱序 Action 抛 `InvalidActionError`
  - 正常玩家限制返回 `{status:'rejected', state, reason}`，不修改状态
  - 进入 Day 的原子流程：发当日工资一次、合并到货一次、独立 roll 天气与事件一次、保存 `weatherToday/eventToday/eventBonusMin`，然后进入 `bedtime`
  - `SET_ALARM(min)`：仅 `bedtime` 工作日合法，校验 420~600 且能被 5 整除
  - `BUY_ITEM(id, qty)`：仅 `bedtime` 合法；余额不足或违反商店边界时拒绝操作，不改变状态
  - `USE_DORA_TONIGHT`：仅 `bedtime` 合法；库存 >0 且当晚尚未服用时扣 1 颗，每晚最多一次
  - 开始睡眠后计算 `newDebtTonight`，再执行 `sleepDebt = previousCarriedDebt × 0.5 + newDebtTonight`；紧接着的 snooze 使用更新后的 debt
  - `CHOOSE_COMMUTE(id)`：仅 `commute` 合法；买不起所选方式时拒绝操作。若余额 <5 无任何可选通勤，则 `CANNOT_AFFORD_COMMUTE`
  - 迟到后进入明确的 `bribe` phase；只有该 phase 接受 `CHOOSE_BRIBE/DECLINE_BRIBE`。不足 180 元为 `CANNOT_AFFORD_BRIBE`，已使用贿赂则为 `SECOND_LATE`
  - `PASS_WEEKEND`：仅周末 `bedtime` 合法，sleepDebt ×0.5、newDebt=0、写 DayRecord 后进入下一天
  - day-advance：写 Day 1~12 的 `dailyLog`；Day 12 成功后直接返回 `status='win'` 和 `phase='result'`，不创建 Day 13 或 Result DayRecord

---

#### 1-4 模拟器（2026-08-07 完成）

**文件**：`src/simulator.ts`

已交付：
- [x] 接受 `{games, seed?, balance?, strategyIds?}`，同一局号跨策略共享 seed，支持注入参数扫描配置
- [x] 固定 07:00 地铁、普通自适应、安全参考三类独立策略；不输出误导性的混合总体通关率
- [x] 分策略输出通关率、Day 12 到达率、三类余额、4 种失败原因、死亡日、4 类启发式失败归因及失败 seed 样本
- [x] D-9 自动检查：安全参考策略完整一局的纯 RNG 失败率 `<25%`
- [x] CLI：`npm run sim -- 1000` 与 `npm run sim:10k`
- [x] 回归测试覆盖统计守恒、可复现性、策略筛选、报告格式与非法参数；Phase 1 检查点共 127 项测试

首轮 10,000 局（base seed `20260807`）结论：固定 07:00 地铁、普通自适应和安全参考策略均 100% 通关；D-9 纯 RNG 失败率为 0%。这不是最终平衡结论，而是证明 D-8 首轮参数仍存在无脑策略，需先完成二次决策。

第二轮正式 100,000 局（同一 base seed）将 Gradient 降为 60、每日债务结转保留 0.5：固定 32.051%、普通 60.786%、安全 99.994%；安全策略纯 RNG 失败 0.006%，通过 D-9。安全参考会先按最大可能 snooze 和已揭示灾害预留保底通勤费，再购买台灯等永久用品。

D-12 正式 100,000 局（同一 base seed）新增地铁 5% 故障 +15min：固定 24.482%、普通 48.933%、安全 97.662%；安全策略纯 RNG 失败 2.338%，仍通过 D-9。D-8 第二轮数据保留为地铁零风险时期的历史对照。

---

#### 1-5 单元测试

**文件**：
- [x] `src/tests/sol.test.ts` — SOL 锚点、永久道具、DORA、台灯无关性、扫描覆盖值与下限
- [x] `src/tests/snooze.test.ts` — D-8 已完成：
  1. debt=0 → 期望 0 次，实际 0 次（100 万次 roll 不出 >0）
  2. debt=60 有灯 → 期望 0.65 次，分布收敛到约 65% 出 1 次
  3. debt≥360 → 6 次硬上限
  4. **不跳号断言**：对 debt=50/90/150/330 分别断言结果集合只能是 `{0,1}` / `{1,2}` / `{2,3}` / `{5,6}`；独立 roll 之间不比较“前一次”结果
  5. 有灯 vs 无灯：同 debt 下，平均次数比值接近 0.65（±1%）
  6. 07:00 + 地铁：0~3 次 snooze 准时，4~6 次迟到
- [x] `src/tests/commute.test.ts` — D-8 已完成：
  1. 地铁：任何 isSnow/eventBonus 组合都返回 60min/5元/cancelled=false
  2. 快车 clear 无事件：25min/30元，取消率约 30%（固定 rng seed 下精确断言）
  3. 快车 + 下雪 + 事件 +15：加时 `min(15+15,25)=25`，所以不取消 50min、取消时 60min
  4. 快车取消最多 1 次：即使 rng 连续 100 次 <0.3，实际 cancelled 只影响 1 次（bonusMin 只加 10，不会 20）
  5. 专车：从不 cancelled，但雪和事件加时正确
- [x] `src/tests/weather.test.ts` — Day1、Day12、普通工作日、周末和 dayIndex 边界
- [x] `src/tests/events.test.ts` — Day4/5、Day12、非事件日、不重复 flavor 和 dayIndex 边界
- [x] `src/tests/random.test.ts` — seed 可复现、整数端点、非法范围和空数组
- [x] `src/tests/shop.test.ts` — 到货、DORA、重复购买、数量、余额和配置注入
- [x] `src/tests/engine.test.ts` — 整局变体测试：
  1. Day1 教学关无雪无事件 + 闹钟 7:00 + 地铁 → 100% 不迟到，顺利进入 Day2
  2. 周末 Day6 PASS_WEEKEND：sleepDebt=100 → Day6 后=50 → Day7 后=25；newDebt 始终不增加
  3. 贿赂流程：第一次迟到后选贿赂 → balance-180、bribeUsed=true、day 正常推进；第二次迟到后无论如何都是 lose SECOND_LATE
  4. 拒绝贿赂：第一次迟到直接 lose REFUSED_BRIBE
  5. 余额 0 选地铁 → lose CANNOT_AFFORD_COMMUTE

---

### 阶段 2：命令行可交互版（2026-08-07 完成）

- [x] `npm run cli` 可从 Day 1 完整游玩到 Day 12 或任一失败结局
- [x] `npm run cli -- <seed>` 支持复现随机局
- [x] 商店循环、永久道具到货、DORA、闹钟校验、天气/事件、三档通勤、快车取消、贿赂、周末和结算均接入 reducer
- [x] 余额不足、重复购买、非法输入等情况在 CLI 层提示并重新输入，不绕过引擎约束
- [x] CLI I/O 可注入；测试覆盖完整通关、非法闹钟、拒绝贿赂、非法商店输入和余额不足
- [x] 真实 readline 冒烟测试通过

### 阶段 3：Web UI（进行中）

#### 3-1 前端骨架与数据边界 ✅

- [x] React 19＋Vite 7＋TypeScript；Node 最低版本 20.19
- [x] `npm run dev` 本地开发；`npm run build` 同时验证引擎与 Web 生产构建
- [x] Web 只从 `src/engine/index.ts` 使用公开 API，不复制规则或绕过 reducer
- [x] 可复现 seed、结构化 rejected/lose 结果与现有 `dailyLog` 直接复用
- [x] npm 依赖审计 0 个已知漏洞

#### 3-2 全部 Screen 与学习系统 ✅

- [x] Intro / Bedtime / Commute / Office+Bribe / Result 五个玩家可见页面；Sleep / Wake-up 保留为引擎阶段并自动结算，预留后续睡眠过渡表现
- [x] 商店、闹钟、DORA、周末、三档通勤、贿赂和每日回顾可完整推进
- [x] 睡眠债在第一次睡醒后教学；贿赂只在第一次迟到时揭示
- [x] 规则手册：未发现项仅显示锁定数量，无提前展开按钮；触发后解锁完整规则
- [x] 教学每设备一次；规则面板底部可重置教学提示，但保留规则发现记录
- [x] 状态栏：星期+工作日进度、睡债、余额、规则入口；430×932 基线下压缩为 48px 高度，键值同列且字号/颜色统一
- [x] 页面内 CSS 美术占位已移除；当前使用灰色背景验证布局，后续接入经高斯模糊的无版权 stock 背景图（不使用生成式图片）

#### 3-3 响应式与可用性 🔄

- [x] 移动端单列布局、桌面居中布局、语义按钮/弹窗、reduced-motion 支持
- [x] 展示模型测试覆盖阶段时间、工作日进度与睡眠债首次发现
- [ ] 用真实浏览器完整玩通一局，检查触屏尺寸、滚动、弹窗焦点与错误反馈
- [x] 根据 430×932 试玩修正状态栏密度、商店操作与晨间通勤流程：页面无整体滚动，商店单行紧凑卡片，睡前「明日城市预报」突出天气/交通，通勤需先选再确认

#### 3-4 视觉与交付 ⏳

- [ ] 确认各页面的无版权 stock 背景图、模糊强度与状态变体
- [ ] 接入背景图后做最终响应式与可访问性检查
- [ ] 是否部署 Web 原型由用户另行决定；当前不自动发布

### 阶段 4：⏳ 待开始

---

### P1 / P2 文案 & 边界 TODO（阶段 4 主做，阶段 1-3 可以先留 TODO 占位）

#### P1（原型早期必补，不补会出体验坑）
- [ ] P1-1 结算画面文案：通关 / 失败 / 不同余额区间的讽刺文案 10~15 条
- [~] P1-2 平衡性调整：D-12 已完成地铁故障机制与 10 万局验证；SOL / 通勤费 / 故障率 / 取消率 / 下雪概率是否继续调整，待 D-10 目标口径确认
- [ ] P1-3 前端 flavor 映射：天气 flavor 随机池的具体文案 / 图标命名（§7.1 已列 6 种：晴/多云/阴/雾霾/小雪/中雪）
- [x] P1-4 余额边界已确认：不允许负余额；买不起某个选项时禁用/拒绝；balance < 5 无任何通勤时判 `CANNOT_AFFORD_COMMUTE`

#### 下一轮需要用户确认

- [x] D-8 固定保守策略：第二轮采用每日债务结转 0.5＋Gradient 60；10 万局验证完成，固定策略降至 32.051%
- [x] D-9 RNG 公平性：允许不可规避的纯 RNG 失败，但安全参考策略下整局纯 RNG 失败率必须 <25%；具体统计口径见 game_spec §8.4
- [~] D-10 通关率口径：D-12 后 10 万局数据为固定 24.482%、普通 48.933%、安全 97.662%；暂不追求特定纯 RNG 失败率，留待真实试玩校准
- [x] D-11 余额定位：通关为主目标，最终余额为通关后的次级分数；失败局余额只展示、不参与成绩比较
- [x] D-12 地铁风险：每次 5% 故障并额外增加 15 分钟；仍免疫天气/城市事件，不与 sleepDebt 联动；已落实代码、UI、CLI、测试与模拟器

#### P2（可后补，不阻塞原型上线）
- [ ] P2-1 闹钟 > 10:00 嘲讽彩蛋文案（"不如直接去公司睡？"风格）
- [ ] P2-2 Flavor text 文案池：snooze 文案 / 快车取消文案 / 下雪事件 flavor
- [ ] P2-3 智能台灯 UI 表现：Bedtime / 通勤晨间摘要怎么展示（先文字提示也行）
- [ ] P2-4 4 种失败画面区分文案：没钱贿赂 vs 拒贿 vs 二次迟到 vs 没钱坐地铁
- [ ] P2-5 分享功能：通关后生成 "我通关《别迟到》净赚 XX 元，第 X 天差点 GG" 风格分享文本/图片
- [ ] P2-6 预留：后续版本加回开车 / 限行 / 事故；地铁故障已由 D-12 提前实现
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
    └── cli.ts                    # 阶段 2 已完成：终端可交互版
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

- 打卡截止：540 分钟 = 09:00（D-8 首轮实验值）
- 目标睡眠：480 分钟 = 8 小时
- sleepDebt 工作日/每个周末日旧债结转：× 0.5（完整周末后剩 25%）
- SOL 基础 45 分钟 / 下限 10 分钟
- ROUTINE_BASE 25 + snooze 每次 9（上限 6 次，+54；D-8 首轮实验值）
- 通勤三档：🚇 地铁 60m/5元(免疫天气/事件，5%故障+15m) | 🚕 快车 25m/30元(30%取消+10m) | 🚘 专车 25m/60元(不取消)
- 加时：下雪 +15 / 普通事件 +15 / 节前高峰 +20（可叠加后 cap 到 MAX_COMMUTE_BONUS = 25 分钟）
- 贿赂 180 元 / 限 1 次 / 用过后第二次迟到必输
- 资金：初始 50 + 12 天 × 20 = 理论上限 290 元
- Boss 关 Day12：节前高峰固定 + 70% 下雪概率

---

## 🔧 已识别的开发债务清单（takeover 于 2026-08-06 结束）

> 本章节由两份并行检查（代码层回头看 + 文档层漂移检查）合并汇总。
> 这些事项在 takeover 中已被识别并写清处理路径，不再阻塞接管结束；现在作为阶段 1 开发债务按优先级处理。
> 优先级说明：🔴 高 = 对外引擎完成前必须修；🟡 中 = 阶段 1 内建议修；🟢 低 = 不阻塞原型，可在开发过程中顺手修。
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
- [x] 🟡 旧版 `pendingBribe` 争议 —— takeover 决策已取代旧方案：使用 `phase='bribe'` 表达上下文，由 reducer 拒绝乱序 Action
- [x] 🟡 kanban §10.3 `onBuyItem` itemId:string vs types.ts `ShopItemId` + qty 默认值不一致 —— game_spec 已同步为 `itemId: ShopItemId, qty?: number`
- [x] 🟡 §2.2 机制常量锚点表缺少 `MAX_COMMUTE_BONUS = 25` 行 —— 已补
- [x] 🟡 Day13 边界 —— takeover 最终决策：Day 只到 12；Result 是 `GameResult/result phase`，不占 Day 编号、不写 `dailyLog`；types.ts 残留注释已于 2026-08-06 回改
- [x] 🔴 C-6 PendingArrivals.dora 文档&接口矛盾（C-6 决策 X：不支持 DORA 次日到货）—— 从 types.ts PendingArrivals 接口删除 dora 字段；game_spec §6 PendingArrivals / §10.3 applyPendingArrivals 模板同步删除 dora 行；注释明确 DORA 永远当晚进 inventory
- [x] 🔴 C-7 SOL_BASE 锚点 vs SOL_BASE_MINUTES 双份并行（C-7 决策 A：锚点权威 + 覆盖层）—— 使用 `SOL_BASE_OVERRIDE ?? SOL_BASE`；C-12 后续又将覆盖层收敛进不可变 `BalanceConfig`，不再需要全局 reset
- [x] 🔴 C-1/C-2 公共函数输入边界 —— 已新增统一 runtime guards，拒绝非法 dayIndex、sleepDebt、通勤 ID、天气标记和事件加时
- [x] 🔴 C-4 `rngInt()` 静默接受错误范围 —— 已拒绝非整数边界和 `min > max`
- [x] 🟡 C-9/C-10/C-11 基础函数整理 —— 天气复用工作日常量；事件 flavor 使用精确类型并复用 `rngPickIndex()`
- [x] 🔴 C-5 phase 状态契约 —— 已改为判别联合；跨阶段 Action 抛 `InvalidActionError`
- [x] 🟡 C-8/C-12/C-13 —— 删除未用 `now`；BalanceConfig 不可变注入；DayRecord 按工作日/周末分型
- [x] 🟢 C-15 —— `CHOOSE_COMMUTE` 已把 `cancelled` 写回 `state.commuteCancelled`
- [x] 🟢 C-14/C-16 —— RNG 伪代码均明确禁止 `Math.random`；§5.3 已补经济配置名

---

### 当前后续工作流

1. 在真实浏览器完整试玩 Web 原型，修正交互和移动端问题
2. 整理各页面无版权 stock 背景图需求，确定统一模糊与替换规格
3. 用 CLI/Web UI 做真实试玩，记录玩家策略、理解成本和失败体验
4. 根据试玩数据回到 D-10；如需调参，使用可注入 `BalanceConfig` 做定向扫描
