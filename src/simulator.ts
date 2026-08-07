import {
  ALARM_MIN,
  CLOCKIN_DEADLINE,
  DEFAULT_BALANCE_CONFIG,
  LAMP_MULTIPLIER,
  MAX_COMMUTE_BONUS,
  ROUTINE_BASE,
  SNOOZE_MAX,
  SNOOZE_PER,
  TARGET_SLEEP_MIN,
  calculateSOL,
  createInitialState,
  createRng,
  reducer,
  type Action,
  type ActiveGameState,
  type BalanceConfig,
  type BedtimeState,
  type CommuteId,
  type CommuteState,
  type EngineDeps,
  type GameResult,
  type LoseReason,
  type ResultState,
  type ShopItemId,
} from './engine';

export type StrategyId = 'fixed' | 'adaptive' | 'safe';
export type FailureAttribution =
  | 'decision'
  | 'resourcePlanning'
  | 'voluntaryRiskRng'
  | 'unavoidableRng';

interface PurchasePlan {
  itemId: ShopItemId;
  qty?: number;
}

interface BedtimePlan {
  purchases: PurchasePlan[];
  alarmMin?: number;
  useDora: boolean;
}

interface StrategyDefinition {
  id: StrategyId;
  label: string;
  description: string;
  bedtime(state: BedtimeState, config: BalanceConfig): BedtimePlan;
  commute(state: CommuteState, config: BalanceConfig): CommuteId;
  chooseBribe: boolean;
}

export interface StrategyReport {
  id: StrategyId;
  label: string;
  description: string;
  games: number;
  wins: number;
  winRate: number;
  day12Reached: number;
  day12ReachRate: number;
  averageFinalBalance: number;
  averageWinBalance: number;
  averageLossBalance: number;
  failures: Record<LoseReason, number>;
  deathsByDay: Record<number, number>;
  attribution: Record<FailureAttribution, number>;
  pureRngFailureRate: number;
  failureSeeds: Partial<Record<LoseReason, number[]>>;
}

export interface SimulationReport {
  gamesPerStrategy: number;
  baseSeed: number;
  strategies: StrategyReport[];
  d9: {
    safePureRngFailureRate: number;
    threshold: number;
    passes: boolean;
  };
}

export interface SimulationOptions {
  games: number;
  seed?: number;
  balance?: BalanceConfig;
  strategyIds?: readonly StrategyId[];
}

interface GameOutcome {
  result: Extract<GameResult, { status: 'win' | 'lose' }>;
  seed: number;
}

const FAILURE_REASONS: readonly LoseReason[] = [
  'CANNOT_AFFORD_BRIBE',
  'REFUSED_BRIBE',
  'SECOND_LATE',
  'CANNOT_AFFORD_COMMUTE',
];

const ATTRIBUTIONS: readonly FailureAttribution[] = [
  'decision',
  'resourcePlanning',
  'voluntaryRiskRng',
  'unavoidableRng',
];

function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}

function commuteCost(choice: CommuteId, config: BalanceConfig): number {
  switch (choice) {
    case 'subway':
      return config.COMMUTE_SUBWAY_COST;
    case 'express':
      return config.COMMUTE_EXPRESS_COST;
    case 'premium':
      return config.COMMUTE_PREMIUM_COST;
  }
}

function cheapestAffordableCommute(
  state: CommuteState,
  config: BalanceConfig,
): CommuteId {
  const choices: CommuteId[] = ['subway', 'express', 'premium'];
  return choices
    .filter(choice => canAfford(state.balance, commuteCost(choice, config)))
    .sort((a, b) => commuteCost(a, config) - commuteCost(b, config))[0] ?? 'subway';
}

function disruptionBonus(state: CommuteState, config: BalanceConfig): number {
  return Math.min(
    (state.weatherToday === 'snow' ? config.WEATHER_SNOW_BONUS_MIN : 0)
      + state.eventBonusMin,
    MAX_COMMUTE_BONUS,
  );
}

function safeBedtimeReserve(state: BedtimeState, config: BalanceConfig): number {
  if (!state.isWorkDay) return 0;

  const solTonight = calculateSOL(state.inventory, false, config);
  const newDebtTonight = Math.max(0, TARGET_SLEEP_MIN - (ALARM_MIN - solTonight));
  const morningDebt = state.sleepDebt * config.WORKDAY_DEBT_CARRY + newDebtTonight;
  let expectedSnoozes = Math.min(morningDebt / config.SNOOZE_GRADIENT, SNOOZE_MAX);
  if (state.inventory.smartLamp) expectedSnoozes *= LAMP_MULTIPLIER;
  const worstRoutineMin = ROUTINE_BASE + Math.ceil(expectedSnoozes) * SNOOZE_PER;
  const bonus = Math.min(
    (state.weatherToday === 'snow' ? config.WEATHER_SNOW_BONUS_MIN : 0)
      + state.eventBonusMin,
    MAX_COMMUTE_BONUS,
  );
  const candidates = [
    {
      cost: config.COMMUTE_SUBWAY_COST,
      worstMin: config.COMMUTE_SUBWAY_MIN + config.COMMUTE_SUBWAY_FAILURE_EXTRA_MIN,
    },
    {
      cost: config.COMMUTE_EXPRESS_COST,
      worstMin: config.COMMUTE_EXPRESS_MIN + bonus + config.COMMUTE_EXPRESS_CANCEL_EXTRA_MIN,
    },
    { cost: config.COMMUTE_PREMIUM_COST, worstMin: config.COMMUTE_PREMIUM_MIN + bonus },
  ].sort((a, b) => a.cost - b.cost || a.worstMin - b.worstMin);

  return candidates.find(candidate => (
    ALARM_MIN + worstRoutineMin + candidate.worstMin <= CLOCKIN_DEADLINE
  ))?.cost ?? Math.min(...candidates.map(candidate => candidate.cost));
}

const STRATEGIES: Record<StrategyId, StrategyDefinition> = {
  fixed: {
    id: 'fixed',
    label: '固定 07:00 地铁',
    description: '不购物、不看天气；每天 07:00 起床并固定乘地铁。',
    bedtime: () => ({ purchases: [], alarmMin: 420, useDora: false }),
    commute: () => 'subway',
    chooseBribe: true,
  },
  adaptive: {
    id: 'adaptive',
    label: '普通自适应',
    description: '购买低价睡眠用品，按睡债提前闹钟，并根据天气、事件和余额选择通勤。',
    bedtime: (state, config) => {
      let available = state.balance;
      const purchases: PurchasePlan[] = [];
      // This strategy prefers express on an undisrupted day, so its shopping
      // plan must not spend the fare before it reaches the commute screen.
      const reserve = config.COMMUTE_EXPRESS_COST;

      const planPermanent = (itemId: Exclude<ShopItemId, 'dora'>, cost: number): void => {
        if (!state.inventory[itemId] && !state.pendingArrivals[itemId] && available >= cost + reserve) {
          purchases.push({ itemId });
          available -= cost;
        }
      };

      if (state.dayIndex === 1) {
        planPermanent('eyeMask', config.SHOP_PRICE_EYE_MASK);
        planPermanent('earPlugs', config.SHOP_PRICE_EAR_PLUGS);
      }
      if (available > 120) planPermanent('smartLamp', config.SHOP_PRICE_SMART_LAMP);
      if (state.inventory.dora === 0 && available >= config.SHOP_PRICE_DORA_PER_PILL + reserve) {
        purchases.push({ itemId: 'dora' });
      }

      const alarmMin = Math.max(420, 450 - Math.ceil(state.sleepDebt / 60) * 10);
      return {
        purchases,
        alarmMin,
        useDora: state.inventory.dora > 0 || purchases.some(item => item.itemId === 'dora'),
      };
    },
    commute: (state, config) => {
      const disrupted = state.weatherToday === 'snow' || state.eventBonusMin > 0;
      if (
        state.weatherToday === 'snow'
        && state.eventBonusMin > 0
        && canAfford(state.balance, config.COMMUTE_PREMIUM_COST)
      ) {
        return 'premium';
      }
      if (disrupted && canAfford(state.balance, config.COMMUTE_SUBWAY_COST)) return 'subway';
      if (canAfford(state.balance, config.COMMUTE_EXPRESS_COST)) return 'express';
      return cheapestAffordableCommute(state, config);
    },
    chooseBribe: true,
  },
  safe: {
    id: 'safe',
    label: '安全参考',
    description: '07:00 起床，优先永久减债/台灯，并在已揭示信息下选择保证准时的最低成本通勤。',
    bedtime: (state, config) => {
      let available = state.balance;
      const purchases: PurchasePlan[] = [];
      const reserve = safeBedtimeReserve(state, config);

      const planPermanent = (itemId: Exclude<ShopItemId, 'dora'>, cost: number): void => {
        if (!state.inventory[itemId] && !state.pendingArrivals[itemId] && available >= cost + reserve) {
          purchases.push({ itemId });
          available -= cost;
        }
      };

      planPermanent('smartLamp', config.SHOP_PRICE_SMART_LAMP);
      if (state.inventory.smartLamp || state.pendingArrivals.smartLamp) {
        planPermanent('pillow', config.SHOP_PRICE_PILLOW);
        planPermanent('eyeMask', config.SHOP_PRICE_EYE_MASK);
        planPermanent('earPlugs', config.SHOP_PRICE_EAR_PLUGS);
      }

      return { purchases, alarmMin: 420, useDora: false };
    },
    commute: (state, config) => {
      const bonus = disruptionBonus(state, config);
      const candidates = [
        {
          choice: 'subway' as const,
          cost: config.COMMUTE_SUBWAY_COST,
          worstMin: config.COMMUTE_SUBWAY_MIN + config.COMMUTE_SUBWAY_FAILURE_EXTRA_MIN,
        },
        {
          choice: 'express' as const,
          cost: config.COMMUTE_EXPRESS_COST,
          worstMin: config.COMMUTE_EXPRESS_MIN + bonus + config.COMMUTE_EXPRESS_CANCEL_EXTRA_MIN,
        },
        {
          choice: 'premium' as const,
          cost: config.COMMUTE_PREMIUM_COST,
          worstMin: config.COMMUTE_PREMIUM_MIN + bonus,
        },
      ].filter(candidate => canAfford(state.balance, candidate.cost));

      const guaranteed = candidates
        .filter(candidate => state.alarmMin + state.routineMin + candidate.worstMin <= CLOCKIN_DEADLINE)
        .sort((a, b) => a.cost - b.cost || a.worstMin - b.worstMin);
      if (guaranteed[0]) return guaranteed[0].choice;

      return candidates.sort((a, b) => a.worstMin - b.worstMin || a.cost - b.cost)[0]?.choice
        ?? 'subway';
    },
    chooseBribe: true,
  },
};

function requirePlaying(result: GameResult, action: Action): ActiveGameState {
  if (result.status === 'playing') return result.state;
  if (result.status === 'rejected') {
    throw new Error(`Strategy action ${action.type} was rejected: ${result.reason}`);
  }
  throw new Error(`Strategy action ${action.type} unexpectedly ended the game`);
}

function applyBedtimePlan(
  state: BedtimeState,
  strategy: StrategyDefinition,
  deps: EngineDeps,
  config: BalanceConfig,
): GameResult {
  const plan = strategy.bedtime(state, config);
  let current: ActiveGameState = state;

  for (const purchase of plan.purchases) {
    const action: Action = { type: 'BUY_ITEM', ...purchase };
    current = requirePlaying(reducer(current, action, deps), action);
  }

  if (!state.isWorkDay) return reducer(current, { type: 'PASS_WEEKEND' }, deps);

  if (plan.useDora) {
    const action: Action = { type: 'USE_DORA_TONIGHT' };
    current = requirePlaying(reducer(current, action, deps), action);
  }

  const alarmAction: Action = { type: 'SET_ALARM', alarmMin: plan.alarmMin ?? 420 };
  current = requirePlaying(reducer(current, alarmAction, deps), alarmAction);
  return reducer(current, { type: 'START_SLEEP' }, deps);
}

function runGame(
  strategy: StrategyDefinition,
  gameSeed: number,
  config: BalanceConfig,
): GameOutcome {
  const deps: EngineDeps = { rng: createRng(gameSeed), balance: config };
  let result = reducer(createInitialState(config), { type: 'START_GAME' }, deps);

  for (let steps = 0; steps < 200; steps += 1) {
    if (result.status === 'win' || result.status === 'lose') {
      return { result, seed: gameSeed };
    }
    if (result.status === 'rejected') {
      throw new Error(`Unexpected rejected state outside an action plan: ${result.reason}`);
    }

    const state = result.state;
    switch (state.phase) {
      case 'intro':
        result = reducer(state, { type: 'START_GAME' }, deps);
        break;
      case 'bedtime':
        result = applyBedtimePlan(state, strategy, deps, config);
        break;
      case 'sleeping':
        result = reducer(state, { type: 'WAKE_UP' }, deps);
        break;
      case 'wakeup':
        result = reducer(state, { type: 'CONTINUE_TO_COMMUTE' }, deps);
        break;
      case 'commute':
        result = reducer(state, {
          type: 'CHOOSE_COMMUTE',
          choice: strategy.commute(state, config),
        }, deps);
        break;
      case 'office':
        result = reducer(state, { type: 'CONTINUE_TO_NEXT_DAY' }, deps);
        break;
      case 'bribe':
        result = reducer(
          state,
          { type: strategy.chooseBribe ? 'CHOOSE_BRIBE' : 'DECLINE_BRIBE' },
          deps,
        );
        break;
    }
  }

  throw new Error(`Simulation exceeded 200 steps for seed ${gameSeed}`);
}

function emptyFailures(): Record<LoseReason, number> {
  return Object.fromEntries(FAILURE_REASONS.map(reason => [reason, 0])) as Record<LoseReason, number>;
}

function emptyAttribution(): Record<FailureAttribution, number> {
  return Object.fromEntries(ATTRIBUTIONS.map(reason => [reason, 0])) as Record<FailureAttribution, number>;
}

function classifyFailure(strategyId: StrategyId, state: ResultState, reason: LoseReason): FailureAttribution {
  // D-9 is defined against the safe reference strategy. Once that strategy has
  // selected the cheapest commute that is safe under revealed information and
  // worst-case cancellation, a loss after the morning roll is the experiment's
  // unavoidable-RNG outcome even when the terminal LoseReason is an unaffordable bribe.
  if (strategyId === 'safe') return 'unavoidableRng';
  const lastRecord = state.dailyLog[state.dailyLog.length - 1];
  if (
    lastRecord?.isWorkDay
    && (
      (lastRecord.commute === '快车' && lastRecord.commuteCancelled)
      || (lastRecord.commute === '地铁' && lastRecord.subwayFailed)
    )
  ) {
    return 'voluntaryRiskRng';
  }
  if (reason === 'CANNOT_AFFORD_BRIBE' || reason === 'CANNOT_AFFORD_COMMUTE') {
    return 'resourcePlanning';
  }
  return 'decision';
}

function average(total: number, count: number): number {
  return count === 0 ? 0 : total / count;
}

function summarizeStrategy(
  strategy: StrategyDefinition,
  outcomes: readonly GameOutcome[],
): StrategyReport {
  const failures = emptyFailures();
  const attribution = emptyAttribution();
  const deathsByDay: Record<number, number> = {};
  const failureSeeds: Partial<Record<LoseReason, number[]>> = {};
  let wins = 0;
  let day12Reached = 0;
  let totalBalance = 0;
  let winBalance = 0;
  let lossBalance = 0;

  for (const outcome of outcomes) {
    const state = outcome.result.state;
    totalBalance += state.balance;
    if (state.dayIndex === 12) day12Reached += 1;

    if (outcome.result.status === 'win') {
      wins += 1;
      winBalance += state.balance;
      continue;
    }

    lossBalance += state.balance;
    failures[outcome.result.reason] += 1;
    deathsByDay[state.dayIndex] = (deathsByDay[state.dayIndex] ?? 0) + 1;
    attribution[classifyFailure(strategy.id, state, outcome.result.reason)] += 1;
    const seeds = failureSeeds[outcome.result.reason] ?? [];
    if (seeds.length < 5) seeds.push(outcome.seed);
    failureSeeds[outcome.result.reason] = seeds;
  }

  const games = outcomes.length;
  const losses = games - wins;
  return {
    id: strategy.id,
    label: strategy.label,
    description: strategy.description,
    games,
    wins,
    winRate: average(wins, games),
    day12Reached,
    day12ReachRate: average(day12Reached, games),
    averageFinalBalance: average(totalBalance, games),
    averageWinBalance: average(winBalance, wins),
    averageLossBalance: average(lossBalance, losses),
    failures,
    deathsByDay,
    attribution,
    pureRngFailureRate: average(attribution.unavoidableRng, games),
    failureSeeds,
  };
}

export function runSimulation(options: SimulationOptions): SimulationReport {
  if (!Number.isInteger(options.games) || options.games <= 0) {
    throw new RangeError('runSimulation:games must be a positive integer');
  }
  const baseSeed = options.seed ?? 20260807;
  if (!Number.isInteger(baseSeed)) {
    throw new TypeError('runSimulation:seed must be an integer');
  }
  const config = options.balance ?? DEFAULT_BALANCE_CONFIG;
  const strategyIds = options.strategyIds ?? (['fixed', 'adaptive', 'safe'] as const);
  const reports = strategyIds.map(strategyId => {
    const strategy = STRATEGIES[strategyId];
    if (!strategy) throw new RangeError(`Unknown strategy: ${String(strategyId)}`);
    const outcomes: GameOutcome[] = [];
    for (let gameIndex = 0; gameIndex < options.games; gameIndex += 1) {
      const gameSeed = (baseSeed + Math.imul(gameIndex, 0x9e3779b9)) >>> 0;
      outcomes.push(runGame(strategy, gameSeed, config));
    }
    return summarizeStrategy(strategy, outcomes);
  });
  const safe = reports.find(report => report.id === 'safe');
  const safeRate = safe?.pureRngFailureRate ?? 0;

  return {
    gamesPerStrategy: options.games,
    baseSeed,
    strategies: reports,
    d9: {
      safePureRngFailureRate: safeRate,
      threshold: 0.25,
      passes: safe !== undefined && safeRate < 0.25,
    },
  };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatSimulationReport(report: SimulationReport, elapsedMs?: number): string {
  const lines: string[] = [
    `模拟：每种策略 ${report.gamesPerStrategy.toLocaleString()} 局，base seed ${report.baseSeed}`,
  ];

  for (const strategy of report.strategies) {
    lines.push(
      '',
      `【${strategy.label}】${strategy.description}`,
      `通关 ${strategy.wins}/${strategy.games} (${percent(strategy.winRate)})；到达 Day12 ${percent(strategy.day12ReachRate)}`,
      `平均余额 ${strategy.averageFinalBalance.toFixed(2)}；通关局 ${strategy.averageWinBalance.toFixed(2)}；失败局 ${strategy.averageLossBalance.toFixed(2)}`,
      `失败原因 ${JSON.stringify(strategy.failures)}`,
      `死亡日 ${JSON.stringify(strategy.deathsByDay)}`,
      `归因 ${JSON.stringify(strategy.attribution)}`,
      `失败 seed 样本 ${JSON.stringify(strategy.failureSeeds)}`,
    );
  }

  lines.push(
    '',
    `D-9：安全参考策略纯 RNG 整局失败率 ${percent(report.d9.safePureRngFailureRate)}，要求 < ${percent(report.d9.threshold)}：${report.d9.passes ? '通过' : '未通过'}`,
  );
  if (elapsedMs !== undefined) lines.push(`用时 ${elapsedMs.toFixed(0)} ms`);
  return lines.join('\n');
}

if (require.main === module) {
  const games = Number(process.argv[2] ?? 1000);
  const seed = Number(process.argv[3] ?? 20260807);
  const startedAt = performance.now();
  const report = runSimulation({ games, seed });
  const elapsedMs = performance.now() - startedAt;
  process.stdout.write(`${formatSimulationReport(report, elapsedMs)}\n`);
}
