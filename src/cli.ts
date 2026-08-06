import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  DEFAULT_BALANCE_CONFIG,
  createInitialState,
  createRng,
  createRngFromString,
  reducer,
  type ActionRejectedReason,
  type ActiveGameState,
  type BalanceConfig,
  type EngineDeps,
  type EventId,
  type GameResult,
  type LoseReason,
  type Rng,
  type ShopItemId,
} from './engine';

export interface CliIo {
  question(prompt: string): Promise<string>;
  write(text: string): void;
}

export interface CliOptions {
  seed?: number | string;
  rng?: Rng;
  balance?: BalanceConfig;
}

const SHOP_ITEMS: ReadonlyArray<{
  key: string;
  id: ShopItemId;
  label: string;
  price: (config: BalanceConfig) => number;
}> = [
  { key: '1', id: 'pillow', label: '枕头', price: config => config.SHOP_PRICE_PILLOW },
  { key: '2', id: 'eyeMask', label: '眼罩', price: config => config.SHOP_PRICE_EYE_MASK },
  { key: '3', id: 'earPlugs', label: '耳塞', price: config => config.SHOP_PRICE_EAR_PLUGS },
  { key: '4', id: 'dora', label: 'DORA（1颗）', price: config => config.SHOP_PRICE_DORA_PER_PILL },
  { key: '5', id: 'smartLamp', label: '智能台灯', price: config => config.SHOP_PRICE_SMART_LAMP },
];

const REJECTION_TEXT: Record<ActionRejectedReason, string> = {
  INVALID_ALARM: '闹钟必须在 07:00～10:00 之间，并以 5 分钟为步长。',
  ALARM_NOT_SET: '请先设置闹钟。',
  INSUFFICIENT_FUNDS: '余额不足。',
  ALREADY_OWNED: '这个永久道具已经拥有。',
  ALREADY_PENDING: '这个永久道具已经在配送中。',
  INVALID_QUANTITY: '购买数量无效。',
  NO_DORA: '库存中没有 DORA。',
  DORA_ALREADY_USED: '今晚已经使用过 DORA。',
};

const LOSE_TEXT: Record<LoseReason, string> = {
  CANNOT_AFFORD_BRIBE: '你迟到了，而且付不起 180 元补救费。',
  REFUSED_BRIBE: '你拒绝了唯一一次补救机会。',
  SECOND_LATE: '这是第二次迟到，没有第二次补救机会。',
  CANNOT_AFFORD_COMMUTE: '你连最便宜的地铁都坐不起。',
};

function seedRng(seed: number | string | undefined): Rng {
  if (typeof seed === 'number') return createRng(seed);
  if (typeof seed === 'string') return createRngFromString(seed);
  return createRng(Date.now());
}

function eventText(event: EventId): string {
  switch (event) {
    case 'concert': return '演唱会散场';
    case 'expo': return '漫展散场';
    case 'marathon': return '马拉松封路';
    case 'holidayRush': return '节前出行高峰';
    default: return '无';
  }
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseAlarm(raw: string): number {
  const value = raw.trim();
  const clock = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return Number(value);
}

function inventoryText(state: ActiveGameState): string {
  const owned = [
    state.inventory.pillow && '枕头',
    state.inventory.eyeMask && '眼罩',
    state.inventory.earPlugs && '耳塞',
    state.inventory.smartLamp && '智能台灯',
    state.inventory.dora > 0 && `DORA×${state.inventory.dora}`,
  ].filter(Boolean);
  const pending = [
    state.pendingArrivals.pillow && '枕头',
    state.pendingArrivals.eyeMask && '眼罩',
    state.pendingArrivals.earPlugs && '耳塞',
    state.pendingArrivals.smartLamp && '智能台灯',
  ].filter(Boolean);
  return `持有：${owned.join('、') || '无'}；配送中：${pending.join('、') || '无'}`;
}

function requirePlaying(result: GameResult, action: string): ActiveGameState {
  if (result.status === 'playing') return result.state;
  if (result.status === 'rejected') {
    throw new Error(`CLI automatic action ${action} was rejected: ${result.reason}`);
  }
  throw new Error(`CLI automatic action ${action} unexpectedly ended the game`);
}

async function visitShop(
  initial: Extract<ActiveGameState, { phase: 'bedtime' }>,
  io: CliIo,
  deps: EngineDeps,
  config: BalanceConfig,
): Promise<Extract<ActiveGameState, { phase: 'bedtime' }>> {
  let state = initial;
  while (true) {
    io.write(`\n余额：${state.balance} 元；睡眠债：${state.sleepDebt.toFixed(1)} 分钟\n`);
    io.write(`${inventoryText(state)}\n`);
    io.write(`${SHOP_ITEMS.map(item => `${item.key}.${item.label} ${item.price(config)}元`).join('  ')}  0.结束购物\n`);
    const choice = (await io.question('购买：')).trim();
    if (choice === '' || choice === '0') return state;
    const item = SHOP_ITEMS.find(candidate => candidate.key === choice);
    if (!item) {
      io.write('请输入 0～5。\n');
      continue;
    }
    const result = reducer(state, { type: 'BUY_ITEM', itemId: item.id }, deps);
    if (result.status === 'rejected') {
      io.write(`${REJECTION_TEXT[result.reason]}\n`);
      continue;
    }
    state = requirePlaying(result, 'BUY_ITEM') as Extract<ActiveGameState, { phase: 'bedtime' }>;
    io.write(`已购买：${item.label}。\n`);
  }
}

async function setAlarm(
  initial: Extract<ActiveGameState, { phase: 'bedtime' }>,
  io: CliIo,
  deps: EngineDeps,
): Promise<Extract<ActiveGameState, { phase: 'bedtime' }>> {
  let state = initial;
  while (state.alarmMin === undefined) {
    const alarmMin = parseAlarm(await io.question('设置闹钟（07:00～10:00，5分钟步长）：'));
    const result = reducer(state, { type: 'SET_ALARM', alarmMin }, deps);
    if (result.status === 'rejected') {
      io.write(`${REJECTION_TEXT[result.reason]}\n`);
      continue;
    }
    state = requirePlaying(result, 'SET_ALARM') as Extract<ActiveGameState, { phase: 'bedtime' }>;
  }
  return state;
}

async function chooseCommute(
  state: Extract<ActiveGameState, { phase: 'commute' }>,
  io: CliIo,
  deps: EngineDeps,
  config: BalanceConfig,
): Promise<GameResult> {
  io.write(`出门时间：${formatMinutes(state.alarmMin + state.routineMin)}；余额：${state.balance} 元\n`);
  io.write(`1.地铁 ${config.COMMUTE_SUBWAY_MIN}分钟/${config.COMMUTE_SUBWAY_COST}元（免疫灾害）\n`);
  io.write(`2.快车 ${config.COMMUTE_EXPRESS_MIN}分钟/${config.COMMUTE_EXPRESS_COST}元（${(config.COMMUTE_EXPRESS_CANCEL_RATE * 100).toFixed(0)}%取消，额外${config.COMMUTE_EXPRESS_CANCEL_EXTRA_MIN}分钟）\n`);
  io.write(`3.专车 ${config.COMMUTE_PREMIUM_MIN}分钟/${config.COMMUTE_PREMIUM_COST}元（不取消）\n`);
  const choices = { '1': 'subway', '2': 'express', '3': 'premium' } as const;
  while (true) {
    const raw = (await io.question('选择通勤：')).trim() as keyof typeof choices;
    const choice = choices[raw];
    if (!choice) {
      io.write('请输入 1、2 或 3。\n');
      continue;
    }
    const result = reducer(state, { type: 'CHOOSE_COMMUTE', choice }, deps);
    if (result.status === 'rejected') {
      io.write(`${REJECTION_TEXT[result.reason]}\n`);
      continue;
    }
    return result;
  }
}

export async function runCli(io: CliIo, options: CliOptions = {}): Promise<GameResult> {
  const config = options.balance ?? DEFAULT_BALANCE_CONFIG;
  const deps: EngineDeps = { rng: options.rng ?? seedRng(options.seed), balance: config };
  io.write('《别迟到》—— 连续完成 10 个工作日的打卡。\n');
  await io.question('按回车开始：');
  let result = reducer(createInitialState(config), { type: 'START_GAME' }, deps);

  for (let steps = 0; steps < 300; steps += 1) {
    if (result.status === 'win') {
      io.write(`\n通关！最终余额：${result.finalBalance} 元。\n`);
      return result;
    }
    if (result.status === 'lose') {
      io.write(`\n游戏结束：${LOSE_TEXT[result.reason]}\n`);
      io.write(`倒在 Day ${result.state.dayIndex}，余额 ${result.state.balance} 元。\n`);
      return result;
    }
    if (result.status === 'rejected') {
      throw new Error(`Unexpected rejected result outside an input loop: ${result.reason}`);
    }

    const state = result.state;
    switch (state.phase) {
      case 'intro':
        result = reducer(state, { type: 'START_GAME' }, deps);
        break;
      case 'bedtime': {
        io.write(`\n=== Day ${state.dayIndex}${state.isWorkDay ? ' 工作日' : ' 周末'} ===\n`);
        io.write(`天气：${state.weatherToday === 'snow' ? '下雪' : '无雪'}；事件：${eventText(state.eventToday)}\n`);
        let bedtime = await visitShop(state, io, deps, config);
        if (!bedtime.isWorkDay) {
          await io.question('今天不用打卡。按回车好好休息：');
          result = reducer(bedtime, { type: 'PASS_WEEKEND' }, deps);
          break;
        }
        if (bedtime.inventory.dora > 0) {
          const use = (await io.question('今晚使用一颗 DORA？(y/N)：')).trim().toLowerCase();
          if (use === 'y' || use === 'yes') {
            bedtime = requirePlaying(
              reducer(bedtime, { type: 'USE_DORA_TONIGHT' }, deps),
              'USE_DORA_TONIGHT',
            ) as typeof bedtime;
          }
        }
        bedtime = await setAlarm(bedtime, io, deps);
        result = reducer(bedtime, { type: 'START_SLEEP' }, deps);
        break;
      }
      case 'sleeping': {
        const wake = requirePlaying(reducer(state, { type: 'WAKE_UP' }, deps), 'WAKE_UP');
        if (wake.phase !== 'wakeup') throw new Error('WAKE_UP did not enter wakeup phase');
        io.write(`睡了 ${Math.floor(wake.actualSleepMin / 60)}小时${wake.actualSleepMin % 60}分；睡眠债 ${wake.sleepDebt.toFixed(1)}；snooze ${wake.snoozeCount} 次。\n`);
        result = reducer(wake, { type: 'CONTINUE_TO_COMMUTE' }, deps);
        break;
      }
      case 'wakeup':
        result = reducer(state, { type: 'CONTINUE_TO_COMMUTE' }, deps);
        break;
      case 'commute':
        result = await chooseCommute(state, io, deps, config);
        break;
      case 'office':
        if (state.commuteCancelled) io.write('快车被取消过一次，重新叫车成功。\n');
        io.write(`到达：${formatMinutes(state.arriveMin)}，准时；余额：${state.balance} 元。\n`);
        await io.question('按回车进入下一天：');
        result = reducer(state, { type: 'CONTINUE_TO_NEXT_DAY' }, deps);
        break;
      case 'bribe': {
        if (state.commuteCancelled) io.write('快车被取消过一次，重新叫车成功。\n');
        io.write(`到达：${formatMinutes(state.arriveMin)}，迟到。余额：${state.balance} 元。\n`);
        const accept = (await io.question(`支付 ${config.BRIBE_COST} 元补救？(y/N)：`)).trim().toLowerCase();
        result = reducer(
          state,
          { type: accept === 'y' || accept === 'yes' ? 'CHOOSE_BRIBE' : 'DECLINE_BRIBE' },
          deps,
        );
        break;
      }
    }
  }

  throw new Error('CLI exceeded 300 state transitions');
}

if (require.main === module) {
  const seed = process.argv[2] ?? String(Date.now());
  const readline = createInterface({ input, output });
  const io: CliIo = {
    question: prompt => readline.question(prompt),
    write: text => output.write(text),
  };
  output.write(`Seed：${seed}\n`);
  runCli(io, { seed })
    .catch(error => {
      output.write(`\nCLI 错误：${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(() => readline.close());
}
