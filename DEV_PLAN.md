# 《别迟到》原型开发计划

> 生成日期：2026-08-03
> 对应 game_spec 版本：v1.1
> 当前进度：阶段 0 完成 → 准备进入阶段 1

---

## 一、整体开发流程（4 个阶段）

| 阶段 | 名称 | 产出 | 验收标准 |
|------|------|------|---------|
| 阶段 1 | 无 UI 核心引擎 | `src/engine/` 纯 TS 模块 + 模拟器 | `sim 10000` 出统计报告，有通关率/失败原因分布 |
| 阶段 2 | 命令行可交互版 | `src/cli.ts` | 终端能手动玩一局完整通关/失败 |
| 阶段 3 | Web UI | 响应式网页 6 个 Screen | 手机端可玩，UI 不自己算数值，只调用 engine |
| 阶段 4 | 平衡调优 + 文案 | 参数微调 + P1/P2 TODO 补全 | 10 万局通关率 30%~50%，P1 TODO 全完成 |

---

## 二、目录结构（最终约定）

```
Dont_be_late/
├── README.md
├── game_spec.md          # 数值与机制唯一权威来源
├── DEV_PLAN.md           # 本文件：开发计划/进度追踪
├── package.json          # 预置 scripts: sim / sim:10k / cli / test / test:w
├── tsconfig.json
├── jest.config.js
└── src/
    ├── engine/
    │   ├── index.ts              # 唯一对外出口（CLI/UI 只能从这里 import）
    │   ├── constants.ts          # 硬锚点：改了会出 bug 的常量
    │   ├── config/
    │   │   └── balance.ts        # 平衡参数：调难度时只改这个文件
    │   ├── types.ts              # GameState / Inventory / CommuteId 等接口
    │   ├── random.ts             # 可复现 RNG（seed 化，同一 seed = 同一局）
    │   ├── sol.ts                # calculateSOL()
    │   ├── snooze.ts             # rollSnoozeCount() — 重点：不跳号 bug 单测
    │   ├── commute.ts            # calculateCommute()
    │   ├── weather.ts            # 按 §7.2 分布 roll 天气
    │   ├── events.ts             # 按 §8.2 规则 roll 城市事件
    │   ├── shop.ts               # onBuyItem() / applyPendingArrivals()
    │   └── engine.ts             # reducer() 纯函数状态机
    ├── tests/
    │   ├── snooze.test.ts        # 验证不跳号 + 边界
    │   ├── commute.test.ts       # 天气/事件叠加正确性
    │   └── engine.test.ts        # 整局流转变体测试
    ├── simulator.ts              # 简单 AI 策略跑 N 局 → 统计报告
    └── cli.ts                    # readline 文字交互，手动玩一局
```

---

## 三、7 个结构优化点（已确认）

| # | 优化 | 目的 |
|---|------|------|
| 1 | 可复现 RNG（seed 化） | 模拟器出极端案例后可复现，单测确定性 |
| 2 | 常量分层：硬锚点 vs 平衡参数 | 调参时不会手滑改错锚点 |
| 3 | Reducer 纯函数模式 | immutable 新状态，测试简单，后期可回溯/重放 |
| 4 | 带类型失败结果（LoseReason） | 4 种 Game Over 原因结构化，UI 不用解析字符串 |
| 5 | index.ts 统一对外出口 | 重构内部结构不影响 CLI/UI |
| 6 | dailyLog 引擎内建 | UI 回顾和模拟器统计共用数据源，不重复不冲突 |
| 7 | package.json scripts 预置 | 零心智负担：npm run sim / cli / test |

---

## 四、命名约定（对齐 game_spec §1）

| 场景 | 规范 | 正确 | 错误 |
|------|------|------|------|
| 硬编码常量 | UPPER_SNAKE_CASE | `CLOCKIN_DEADLINE` | `clockin_deadline` |
| 运行时变量/字段 | camelCase | `sleepDebt` | `SLEEP_DEBT` |
| 类型/接口/类 | PascalCase | `GameState` | `gameState` |
| 函数/方法 | camelCase | `rollSnoozeCount` | `Roll_Snooze_Count` |

---

## 五、进度追踪

### 阶段 0：设计文档理解与开发方案确认
**状态**：✅ 完成（2026-08-03）

- 读完 README.md + game_spec.md v1.1，对齐以 game_spec 为准
- 确定 4 阶段开发流程（引擎优先）
- 确定 7 个结构优化点
- 确定目录结构和命名约定

### 阶段 1：无 UI 核心引擎
**状态**：⏳ 待开始

- [ ] 1-1 基础设施：constants / types / random / balance config / package.json
- [ ] 1-2 核心函数：sol / snooze / commute / weather / events
- [ ] 1-3 状态机：shop / engine reducer / GameResult / dailyLog
- [ ] 1-4 模拟器：随机 AI 策略 + 1 万局平衡初测
- [ ] 1-5 单测：snooze 不跳号 / 通勤叠加 / 整局变体

### 阶段 2~4：⏳ 待开始（阶段 1 完成后再拆细）

---

## 六、关键锚点回顾（避免开发时手滑查文档）

- 打卡截止：600 分钟 = 10:00
- 目标睡眠：480 分钟 = 8 小时
- sleepDebt 衰减系数：0.5（每日）
- SOL 基础 45 / 下限 10
- ROUTINE_BASE 25 + snooze 每次 9（上限 3 次）
- 通勤三档：地铁 40m/5元（免疫），快车 25m/30元（30% 取消），专车 25m/60元（不取消）
- 下雪 +15，普通事件 +15，节前高峰 +20
- 贿赂 180 元 / 只能用 1 次
- 初始 50 元 + 12 天 × 20 元 = 理论上限 290 元
- Boss 关 Day12：节前高峰固定 + 70% 下雪概率
