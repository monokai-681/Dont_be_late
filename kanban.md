# 《别迟到》看板 Kanban

> **维护规则**：✅ 已完成 = 简略（必要时用 checklist 扫一眼确认） | ⏳ 待做 = 详细写
> **职责**：本文件只维护进度、任务、风险和待决事项；机制、数值、状态流与边界规则以 `game_spec.md` 为唯一权威来源，变更先在规格定稿再同步任务。
> **作废文件**：`design_backup_old.md` 仅作历史保留，不得引用、采用或更新。

---

## 进度总览

| 阶段 | 名称 | 状态 | 关键产出 |
|------|------|------|---------|
| 0 | 设计文档 & 数值拍板 & 方案确认 | ✅ 完成 | game_spec v1.1 + 4 阶段流程 + 7 优化点 + 目录结构约定 |
| 1 | 无 UI 核心引擎 | 🔄 进行中（1-1✅ 1-2✅ 1-3⏳） | 基础设施+5核心函数已交付；D-8 参数与回归测试已落地；待做 shop/reducer + 模拟器 + 其余单测 |
| 2 | 命令行可交互版 | ⏳ 待开始 | `src/cli.ts`，终端手动玩一局 |
| 3 | Web UI | ⏳ 待开始 | 响应式网页：Intro + 5 个工作日 Screen + Result，共 7 个逻辑 Screen |
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
- [x] sleepDebt：目标睡眠 480min，每日衰减 50%
- [x] SOL：基础 45min，下限 10min
- [x] Snooze 参数：溢出概率法单 roll，每次 9min、上限 6 次；台灯 ×0.65；D-8 已同步代码并补齐边界/分布回归测试
- [x] 通勤 3 档（移除「开车」）：🚇 地铁免疫 / 🚕 快车 30% 取消 / 🚘 专车 0% 取消但不免疫天气事件
- [x] 天气：逻辑 2 层（clear / snow+15min），展示 6 flavor
- [x] 城市事件：Day 4/5 独立 50% roll（3 flavor 不重复，+15）；Day 12 固定节前高峰 +20
- [x] 经济方案 A：初始 50 + 日薪 20×12 = 总 290；贿赂 180 限 1 次
- [x] 商店 5 种：枕头 40 / 眼罩 18 / 耳塞 12 / DORA 20颗 / 台灯 95（DORA 当晚生效，其余次日）
- [x] 命名规范：常量 UPPER_SNAKE / 变量 camelCase / 类型 PascalCase / 函数 camelCase
- [x] 原型移除项确认：开车、限行、车牌、油电区分、唑吡坦（传统安眠药）、地铁故障、纯随机堵车概率

### Takeover 决策收敛（2026-08-05，已批准）

- [x] 文档层级：`game_spec.md` 管机制/数值/状态流/边界，`kanban.md` 管任务和进度，README 只做摘要
- [x] `design_backup_old.md` 已作废：不采用、不引用、不更新
- [x] 睡眠债时序：`morningDebt = previousCarriedDebt × 0.5 + newDebtTonight`，当晚新债立即影响紧接着的早晨；通勤后不二次衰减
- [x] 状态机方向：采用带 `phase` 的判别联合，由 reducer 自行拒绝非法 Action，不再依赖 UI 调用顺序维持合法性
- [x] Result 建模：Day 只到 12；结算页是 `GameResult/result phase`，不叫 Day 13，也不写入 `dailyLog`
- [x] 余额硬规则：不允许负余额；买不起某个选项时禁用/拒绝，只有连 5 元地铁都买不起才 `CANNOT_AFFORD_COMMUTE`
- [x] 商店边界：永久物品已拥有或 pending 时不能重复购买；DORA 数量必须为正整数，每晚最多服用 1 颗
- [x] Takeover 阶段于 2026-08-06 完成并获批结束；项目恢复早期原型开发
- [x] D-8 首轮实验组：09:00 打卡；地铁 60min/5元且风险 0%；snooze 每次 9min、上限 6 次；睡眠债衰减 0.5；`SNOOZE_GRADIENT=100` 与晨间流程 25min 暂不调整；已同步规格、代码和回归测试

---

### 阶段 1-1：基础设施（2026-08-03 · commit c82ecbd）

- [x] 工程脚手架：`package.json`（5 scripts + 6 devDeps）、`tsconfig.json`（strict ES2020）、`jest.config.js`（30s 超时）、`.gitignore`
- [x] 常量分层：`constants.ts` 23 个硬锚点 UPPER_SNAKE + `config/balance.ts` 全部平衡参数 `let` 化 + `resetBalanceToDefaults()` 便于扫描
- [x] RNG 可复现：`random.ts` mulberry32 算法 + `createRngFromString`（FNV-1a）+ `rngInt` / `rngPickIndex` 工具
- [x] 类型系统：`types.ts` 全套接口 — GameState（含 `usedEventFlavors`）/ Action 判别联合 / GameResult（playing|win|lose + 4 种 LoseReason 分型）/ DayRecord / EngineDeps / CommuteResult 等
- [x] 唯一出口：`index.ts` barrel export（CLI/UI 禁止直接 import 内部路径），已导出 constants / Balance 命名空间 / types / RNG / 5 核心函数
- [x] `tsc --noEmit` strict 模式 0 错误；Node 26 / npm 11 环境确认无需升级（已满足 engines >=20）

---

### 阶段 1-2：五大核心函数（2026-08-03 · commit c82ecbd）

- [x] `calculateSOL()`：base -6/-4/-3 永久道具 + -15 DORA 消耗品，下限 SOL_MIN 10，纯函数无 rng
- [x] `rollSnoozeCount()`：D-8 已将 `SNOOZE_MAX` 落实为 6；回归测试覆盖上限、相邻结果集合、台灯期望比例和 09:00 策略边界
- [x] `calculateCommute()`：D-8 已将地铁落实为 60m/5¥、保持免疫和 0% 风险；回归测试覆盖全部天气/事件组合及 reset 默认值
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
**进度**：1-1 ✅ / 1-2 ✅ / 1-3 ⏳ / 1-4 ⏳ / 1-5 🔄（D-8 回归测试已完成，其余测试随对应模块补齐）

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
  - `applyPendingArrivals(state: GameState): GameState` — §10.3：把 pendingArrivals 里的 pillow/eyeMask/earPlugs/smartLamp 置 true 进 inventory，pending 对应字段清空（⚠️ C-6 决策：DORA 永远当晚进 inventory，不在 pendingArrivals 队列里）
  - `onBuyItem(state: GameState, itemId: ShopItemId, qty?: number): GameState` — DORA 当晚进 `inventory.dora`；其余 4 种进 `pendingArrivals`。执行余额非负、永久物品不可重复购买、DORA qty 正整数等规则
- `src/engine/engine.ts`
  - 导出 `INITIAL_STATE: GameState`（`phase='intro'`，dayIndex=0，balance=50，debt=0，bribeUsed=false，全空 inventory）
  - 导出核心：`reducer(state: GameState, action: Action, deps: {rng: Rng}): GameResult`
  - `GameState` 改为以 `phase` 判别的联合：`intro → bedtime → sleeping → wakeup → commute → office/bribe → result`
  - reducer 必须依据 `phase` 限制合法 Action；任何跨阶段、重复或乱序 Action 都拒绝，不依赖 UI 自律
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
  - 至少分别运行三类策略：固定策略、普通自适应策略、安全/近最优参考策略；禁止只输出混合总体通关率
  - 每类策略的总场次 / 通关率 / Day12 通关率（通关且最后一天赢的比率）
  - 平均最终余额 / 通关局平均余额 / 失败局平均余额
  - 失败原因饼图（4 种 LoseReason 各占 %）
  - 死亡日分布（Day 1~12 各死了多少次）
  - 失败归因：决策失败 / 资源规划失败 / 主动承担风险后的 RNG 失败 / 安全参考策略下不可规避的 RNG 失败
  - D-9 验收指标：安全参考策略完整一局的纯 RNG 失败率 <25%
  - 打印用时 + 可复现 seed

CLI 入口：`npm run sim 1000` → 跑 1000 局打印报告；`npm run sim:10k` → 跑 10000 局

---

#### 1-5 单元测试

**文件**：
- [x] `src/tests/snooze.test.ts` — D-8 已完成：
  1. debt=0 → 期望 0 次，实际 0 次（100 万次 roll 不出 >0）
  2. debt=100 有灯 → 期望 0.65 次，分布收敛到约 65% 出 1 次
  3. debt≥600 → 6 次硬上限
  4. **不跳号断言**：对 debt=80/150/250/550 分别断言结果集合只能是 `{0,1}` / `{1,2}` / `{2,3}` / `{5,6}`；独立 roll 之间不比较“前一次”结果
  5. 有灯 vs 无灯：同 debt 下，平均次数比值接近 0.65（±1%）
  6. 07:00 + 地铁：0~3 次 snooze 准时，4~6 次迟到
- [x] `src/tests/commute.test.ts` — D-8 已完成：
  1. 地铁：任何 isSnow/eventBonus 组合都返回 60min/5元/cancelled=false
  2. 快车 clear 无事件：25min/30元，取消率约 30%（固定 rng seed 下精确断言）
  3. 快车 + 下雪 + 事件 +15：加时 `min(15+15,25)=25`，所以不取消 50min、取消时 60min
  4. 快车取消最多 1 次：即使 rng 连续 100 次 <0.3，实际 cancelled 只影响 1 次（bonusMin 只加 10，不会 20）
  5. 专车：从不 cancelled，但雪和事件加时正确
- [ ] `src/tests/engine.test.ts` — 待 reducer 完成后实现整局变体测试：
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
- [ ] P1-2 平衡性调整：跑模拟器 10 万局后微调 SOL / 通勤费 / 取消率 / 下雪概率；目标通关率口径待 D-10 确认
- [ ] P1-3 前端 flavor 映射：天气 flavor 随机池的具体文案 / 图标命名（§7.1 已列 6 种：晴/多云/阴/雾霾/小雪/中雪）
- [x] P1-4 余额边界已确认：不允许负余额；买不起某个选项时禁用/拒绝；balance < 5 无任何通勤时判 `CANNOT_AFFORD_COMMUTE`

#### 下一轮需要用户确认（开始模拟器和平衡调优前）

- [x] D-8 固定保守策略：采用首轮实验组——09:00 打卡、地铁 60min/5元且 0% 风险、snooze 每次 9min 上限 6 次、睡眠债衰减 0.5；其他参数首轮不变，模拟后再评估
- [x] D-9 RNG 公平性：允许不可规避的纯 RNG 失败，但安全参考策略下整局纯 RNG 失败率必须 <25%；具体统计口径见 game_spec §8.4
- [~] D-10 通关率口径：延期到模拟器提供分策略数据后决定；当前先实现固定/普通自适应/安全参考三类策略及失败归因，不预设最终目标区间
- [x] D-11 余额定位：通关为主目标，最终余额为通关后的次级分数；失败局余额只展示、不参与成绩比较

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

- 打卡截止：540 分钟 = 09:00（D-8 首轮实验值）
- 目标睡眠：480 分钟 = 8 小时
- sleepDebt 每日衰减：× 0.5
- SOL 基础 45 分钟 / 下限 10 分钟
- ROUTINE_BASE 25 + snooze 每次 9（上限 6 次，+54；D-8 首轮实验值）
- 通勤三档：🚇 地铁 60m/5元(免疫、0%风险) | 🚕 快车 25m/30元(30%取消+10m) | 🚘 专车 25m/60元(不取消)
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
- [x] 🟡 Day13 边界 —— takeover 最终决策：Day 只到 12；Result 是 `GameResult/result phase`，不占 Day 编号、不写 `dailyLog`；现有 types.ts 的 0~13/1~13 注释等待接管代码整理时回改
- [x] 🔴 C-6 PendingArrivals.dora 文档&接口矛盾（C-6 决策 X：不支持 DORA 次日到货）—— 从 types.ts PendingArrivals 接口删除 dora 字段；game_spec §6 PendingArrivals / §10.3 applyPendingArrivals 模板同步删除 dora 行；注释明确 DORA 永远当晚进 inventory
- [x] 🔴 C-7 SOL_BASE 锚点 vs SOL_BASE_MINUTES 双份并行（C-7 决策 A：锚点权威 + 覆盖层）—— balance.ts SOL_BASE_MINUTES 改名 SOL_BASE_OVERRIDE（number\|null，null=用锚点 SOL_BASE=45）；sol.ts 改为 `SOL_BASE_OVERRIDE ?? SOL_BASE`；resetBalanceToDefaults 里 SOL_BASE_OVERRIDE=null 重置

---

### 🔴 高（交接前必须修或至少写清修复代码路径）

| # | 来源 | 标题 | 一句话风险 | 推荐修复代码 / 规范链接 |
|---|------|------|------------|-------------------------|
| C-1 | 代码 4.1 | 所有对外函数缺 dayIndex / sleepDebt / eventBonus / CommuteId 范围断言 | sleepDebt=-50 会算出 -1 次 snooze → 早晨流程凭空少 9 分钟；非法 CommuteId 会导致 NaN 通勤时间和花费；dayIndex 越界静默返回错误值不抛错 | **统一在每个 barrel 导出函数顶部加范围断言**：<br>`assertIntegerInRange(dayIndex, 0, 12, 'rollWeather:dayIndex')`<br>`assertNonNegative(sleepDebt, 'rollSnoozeCount')`<br>`assertEnum(choice, ['subway','express','premium'], 'calculateCommute')`<br>commute switch 补 `default: throwUnknownEnum(choice)` |
| C-2 | 代码 4.3 + 4.1 | calculateCommute bonusMin 缺下限 0 保护 + eventBonus 范围断言 | 传负数 eventBonus 会让通勤时间缩短（作弊）；虽然正常调用不会传负，但作为公共 API 必须自证健壮 | `bonusMin = Math.max(0, Math.min(bonusMin, MAX_COMMUTE_BONUS))`（上下限双保护）；入口补 `assertIntegerInRange(eventBonus, 0, EVENT_HOLIDAY_BONUS_MIN || 20)` |
| C-4 | 代码 4.4 | `rngInt(min, max)` 对 `min > max`（调用方传反）无断言 | 结果悄悄落在错误区间不抛错 —— 属于最难调试的「静默数值偏差」 | 入口加 2 行断言：<br>`if (min > max) throw new Error('rngInt: min>max')`<br>`if (!Number.isInteger(min)\|\|!Number.isInteger(max)) throw 'integer required'` |
| C-5 | 代码 6.2 | GameState 15 个 runtime optional 字段无「阶段→非空」契约 | reducer 读取未初始化字段会产生 `undefined/NaN` 链式污染 | **决策已定、代码待整理**：改为带 `phase` 的判别联合，每个阶段只暴露本阶段必需字段；reducer 同时做运行时 phase 校验 |

---

### 🟡 中（交接前建议修，减少新人困惑）

| # | 来源 | 标题 | 推荐修复 |
|---|------|------|---------|
| C-8 | 代码 1.2 | `EngineDeps.now` 预留字段从未被任何地方读取 | 要么直接删除（避免类型膨胀），要么在注释里标 `@deprecated 原型阶段不传` |
| C-9 | 代码 2.2 | weather.ts 手写 workDay 重复硬编码，没复用 `WORK_DAY_INDICES`；多写了 dayIndex===12（虽然进不到，但容易误导） | `const isWorkDay = WORK_DAY_INDICES.includes(dayIndex)` 一行替代 |
| C-10 | 代码 2.3 + 6.1 | `NORMAL_EVENT_FLAVORS` 声明 `string[]`，丢了字面量类型，需要 `flavor as EventId` 断言 | 改为 `const NORMAL_EVENT_FLAVORS: readonly (EventId & string)[] = ['concert','expo','marathon'] as const;`，同时删除 `as EventId` 断言，避免拼写错误被类型系统吞掉 |
| C-11 | 代码 4.2 | events.ts 手写 `Math.floor(rng()*N)`，没复用 `rngPickIndex`（统一了空数组保护） | `const idx = rngPickIndex(rng, remaining)`，保持所有随机整数走统一入口 |
| C-12 | 代码 7.4 | 全局可变 balance 参数会破坏函数纯度并污染并行测试 | 接管代码整理时定义不可变 `BalanceConfig` 默认对象，经 `EngineDeps`/函数参数注入；模拟器参数扫描复制配置，不修改模块全局 |
| C-13 | 代码 6.2 | DayRecord 接口 9 个 optional 字段，没有工作日/周末子类型区分 | 改为 `WorkDayRecord | WeekendRecord` 判别联合；Result 不生成 DayRecord |

---

### 🟢 低（不阻塞交接，开发时顺手修）

| # | 来源 | 标题 | 说明 |
|---|------|------|------|
| C-14 | 代码 5.1 | game_spec 伪代码示例用 Math.random 但实际实现已注入 Rng | 本轮已在 §4.3 / §4.5 伪代码顶部加了「⚠️ 算法说明伪代码…真实实现必须注入 Rng」的声明。若还有遗漏在其他章节，搜索 `Math.random` 统一加声明即可 |
| C-15 | 文档 9 | kanban 1-3 CHOOSE_COMMUTE 流程没写把 `CommuteResult.cancelled` 写回 `state.commuteCancelled` | 本轮已在 kanban §漂移 #9 修复建议处提了一句，等阶段 1-3 写 CHOOSE_COMMUTE 时补上一行即可 |
| C-16 | 文档 10 | §5.3 经济参数表缺「代码常量名」列（INITIAL_BALANCE/DAILY_SALARY/BRIBE_COST） | 纯文档美化，交接时新开发者搜索「初始余额 50」也能找到 balance.ts，不急 |

---

### 阶段 1 后续工作流

1. 先处理 C-1/C-2/C-4 输入断言与当前五个函数剩余回归测试
2. 实现阶段 1-3（shop.ts + engine.ts reducer）及 C-5 phase 类型，同步处理 Day12/Result 类型回改和 C-9/C-10/C-11
3. 将全局可变平衡参数收敛为可注入的 `BalanceConfig`，避免模拟器与并行测试互相污染
4. 完成阶段 1-4 模拟器，再根据 D-9 验收指标和 D-10 待定口径分析分策略数据
