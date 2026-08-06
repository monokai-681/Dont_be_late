import {
  DEFAULT_BALANCE_CONFIG,
  InvalidActionError,
  calculateArrivalMinutes,
  createInitialState,
  reducer,
  type Action,
  type ActiveGameState,
  type BedtimeState,
  type BribeState,
  type EngineDeps,
  type GameResult,
} from '../engine';

const safeDeps: EngineDeps = { rng: () => 0.999999 };

function playing(result: GameResult): ActiveGameState {
  if (result.status !== 'playing') {
    throw new Error(`expected playing, received ${result.status}`);
  }
  return result.state;
}

function dispatch(
  state: ActiveGameState,
  action: Action,
  deps: EngineDeps = safeDeps,
): ActiveGameState {
  return playing(reducer(state, action, deps));
}

function startGame(deps: EngineDeps = safeDeps): BedtimeState {
  const state = dispatch(createInitialState(deps.balance), { type: 'START_GAME' }, deps);
  if (state.phase !== 'bedtime') throw new Error('expected bedtime');
  return state;
}

function reachCommute(
  state: BedtimeState,
  alarmMin: number,
  deps: EngineDeps = safeDeps,
): ActiveGameState {
  let next = dispatch(state, { type: 'SET_ALARM', alarmMin }, deps);
  next = dispatch(next, { type: 'START_SLEEP' }, deps);
  next = dispatch(next, { type: 'WAKE_UP' }, deps);
  return dispatch(next, { type: 'CONTINUE_TO_COMMUTE' }, deps);
}

function reachBribe(
  state: BedtimeState,
  deps: EngineDeps,
): BribeState {
  const commute = reachCommute(state, 600, deps);
  const result = reducer(commute, { type: 'CHOOSE_COMMUTE', choice: 'subway' }, deps);
  if (result.status !== 'playing' || result.state.phase !== 'bribe') {
    throw new Error('expected bribe phase');
  }
  return result.state;
}

describe('engine reducer', () => {
  test('uses explicit phases and throws on out-of-order actions', () => {
    const initial = createInitialState();
    expect(() => reducer(initial, { type: 'WAKE_UP' }, safeDeps)).toThrow(InvalidActionError);

    let state = dispatch(initial, { type: 'START_GAME' });
    expect(state.phase).toBe('bedtime');
    state = dispatch(state, { type: 'SET_ALARM', alarmMin: 420 });
    state = dispatch(state, { type: 'START_SLEEP' });
    expect(state.phase).toBe('sleeping');
    state = dispatch(state, { type: 'WAKE_UP' });
    expect(state.phase).toBe('wakeup');
    state = dispatch(state, { type: 'CONTINUE_TO_COMMUTE' });
    expect(state.phase).toBe('commute');
    state = dispatch(state, { type: 'CHOOSE_COMMUTE', choice: 'subway' });
    expect(state.phase).toBe('office');
    expect(() => reducer(state, { type: 'WAKE_UP' }, safeDeps)).toThrow(InvalidActionError);
  });

  test.each([419, 421, 605, 420.5])('rejects invalid alarm %s without changing state', alarmMin => {
    const state = startGame();
    const result = reducer(state, { type: 'SET_ALARM', alarmMin }, safeDeps);

    expect(result).toEqual({ status: 'rejected', state, reason: 'INVALID_ALARM' });
  });

  test('requires an alarm before sleep', () => {
    const state = startGame();
    expect(reducer(state, { type: 'START_SLEEP' }, safeDeps)).toEqual({
      status: 'rejected',
      state,
      reason: 'ALARM_NOT_SET',
    });
  });

  test('Day 1 updates sleep debt before snooze and logs an on-time subway commute', () => {
    const bedtime = startGame();
    const commute = reachCommute(bedtime, 420);
    expect(commute.phase).toBe('commute');
    if (commute.phase !== 'commute') return;
    expect(commute.sleepDebt).toBe(105);
    expect(commute.snoozeCount).toBe(1);

    const office = dispatch(commute, { type: 'CHOOSE_COMMUTE', choice: 'subway' });
    expect(office.phase).toBe('office');
    if (office.phase !== 'office') return;
    expect(office.arriveMin).toBe(514);
    expect(office.balance).toBe(65);

    const dayTwo = dispatch(office, { type: 'CONTINUE_TO_NEXT_DAY' });
    expect(dayTwo.phase).toBe('bedtime');
    expect(dayTwo.dayIndex).toBe(2);
    expect(dayTwo.balance).toBe(85);
    expect(dayTwo.dailyLog).toHaveLength(1);
    expect(dayTwo.dailyLog[0]).toMatchObject({
      day: 1,
      isWorkDay: true,
      alarmHHMM: '07:00',
      arriveHHMM: '08:34',
      isLate: false,
      balanceAfter: 65,
    });
  });

  test.each([
    ['express', '快车'],
    ['premium', '专车'],
  ] as const)('logs the %s commute choice as %s', (choice, label) => {
    const balance = { ...DEFAULT_BALANCE_CONFIG, INITIAL_BALANCE: 500 };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    const commute = reachCommute(startGame(deps), 420, deps);
    const office = dispatch(commute, { type: 'CHOOSE_COMMUTE', choice }, deps);
    const dayTwo = dispatch(office, { type: 'CONTINUE_TO_NEXT_DAY' }, deps);

    expect(dayTwo.dailyLog[0]).toMatchObject({ commute: label, isLate: false });
  });

  test('DORA can be used once per workday', () => {
    let state: ActiveGameState = startGame();
    state = dispatch(state, { type: 'BUY_ITEM', itemId: 'dora' });
    state = dispatch(state, { type: 'USE_DORA_TONIGHT' });
    expect(state.phase).toBe('bedtime');
    if (state.phase !== 'bedtime') return;
    expect(state.inventory.dora).toBe(0);
    expect(state.doraUsedTonight).toBe(true);

    expect(reducer(state, { type: 'USE_DORA_TONIGHT' }, safeDeps)).toEqual({
      status: 'rejected',
      state,
      reason: 'DORA_ALREADY_USED',
    });
  });

  test('rejects DORA use when inventory is empty', () => {
    const state = startGame();
    expect(reducer(state, { type: 'USE_DORA_TONIGHT' }, safeDeps)).toEqual({
      status: 'rejected',
      state,
      reason: 'NO_DORA',
    });
  });

  test('weekends decay debt once, skip commute, and still pay salary', () => {
    const daySix: BedtimeState = {
      ...startGame(),
      dayIndex: 6,
      balance: 100,
      sleepDebt: 100,
      isWorkDay: false,
      dailyLog: [],
    };

    const daySeven = dispatch(daySix, { type: 'PASS_WEEKEND' });
    expect(daySeven.phase).toBe('bedtime');
    expect(daySeven.dayIndex).toBe(7);
    expect(daySeven.sleepDebt).toBe(50);
    expect(daySeven.balance).toBe(120);

    const dayEight = dispatch(daySeven, { type: 'PASS_WEEKEND' });
    expect(dayEight.dayIndex).toBe(8);
    expect(dayEight.sleepDebt).toBe(25);
    expect(dayEight.balance).toBe(140);
    expect(dayEight.dailyLog).toEqual([
      { day: 6, isWorkDay: false, sleepDebtAfter: 50, balanceAfter: 100 },
      { day: 7, isWorkDay: false, sleepDebtAfter: 25, balanceAfter: 120 },
    ]);
  });

  test('a first late day can be bribed when affordable', () => {
    const balance = { ...DEFAULT_BALANCE_CONFIG, INITIAL_BALANCE: 500 };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    const bribe = reachBribe(startGame(deps), deps);
    const office = dispatch(bribe, { type: 'CHOOSE_BRIBE' }, deps);

    expect(office.phase).toBe('office');
    if (office.phase !== 'office') return;
    expect(office.bribeUsed).toBe(true);
    expect(office.isLate).toBe(false);
    expect(office.balance).toBe(335);
  });

  test('cannot bribe without enough money', () => {
    const bribe = reachBribe(startGame(), safeDeps);
    const result = reducer(bribe, { type: 'CHOOSE_BRIBE' }, safeDeps);

    expect(result.status).toBe('lose');
    if (result.status !== 'lose') return;
    expect(result.reason).toBe('CANNOT_AFFORD_BRIBE');
    expect(result.state.balance).toBe(65);
    expect(result.state.dailyLog).toHaveLength(1);
  });

  test('declining the first bribe loses immediately', () => {
    const bribe = reachBribe(startGame(), safeDeps);
    const result = reducer(bribe, { type: 'DECLINE_BRIBE' }, safeDeps);

    expect(result.status).toBe('lose');
    if (result.status === 'lose') expect(result.reason).toBe('REFUSED_BRIBE');
  });

  test('a second late day loses without offering another bribe', () => {
    const balance = { ...DEFAULT_BALANCE_CONFIG, INITIAL_BALANCE: 500 };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    let state: ActiveGameState = reachBribe(startGame(deps), deps);
    state = dispatch(state, { type: 'CHOOSE_BRIBE' }, deps);
    state = dispatch(state, { type: 'CONTINUE_TO_NEXT_DAY' }, deps);
    if (state.phase !== 'bedtime') throw new Error('expected Day 2 bedtime');
    const commute = reachCommute(state, 600, deps);
    const result = reducer(commute, { type: 'CHOOSE_COMMUTE', choice: 'subway' }, deps);

    expect(result.status).toBe('lose');
    if (result.status === 'lose') expect(result.reason).toBe('SECOND_LATE');
  });

  test('loses when no commute is affordable and never goes negative', () => {
    const balance = {
      ...DEFAULT_BALANCE_CONFIG,
      INITIAL_BALANCE: 0,
      DAILY_SALARY: 0,
    };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    const commute = reachCommute(startGame(deps), 420, deps);
    const result = reducer(commute, { type: 'CHOOSE_COMMUTE', choice: 'subway' }, deps);

    expect(result.status).toBe('lose');
    if (result.status !== 'lose') return;
    expect(result.reason).toBe('CANNOT_AFFORD_COMMUTE');
    expect(result.state.balance).toBe(0);
  });

  test('rejects an unaffordable selected option when a cheaper option exists', () => {
    const balance = { ...DEFAULT_BALANCE_CONFIG, INITIAL_BALANCE: 0 };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    const commute = reachCommute(startGame(deps), 420, deps);
    const result = reducer(commute, { type: 'CHOOSE_COMMUTE', choice: 'express' }, deps);

    expect(result).toEqual({
      status: 'rejected',
      state: commute,
      reason: 'INSUFFICIENT_FUNDS',
    });
  });

  test('rejects an unsupported commute id as a programming error even with no money', () => {
    const balance = {
      ...DEFAULT_BALANCE_CONFIG,
      INITIAL_BALANCE: 0,
      DAILY_SALARY: 0,
    };
    const deps: EngineDeps = { rng: () => 0.999999, balance };
    const commute = reachCommute(startGame(deps), 420, deps);

    expect(() => reducer(
      commute,
      { type: 'CHOOSE_COMMUTE', choice: 'bike' as never },
      deps,
    )).toThrow(RangeError);
  });

  test('a safe fixed strategy completes Day 1-12 without creating Day 13', () => {
    let result = reducer(createInitialState(), { type: 'START_GAME' }, safeDeps);

    for (let steps = 0; steps < 100 && result.status === 'playing'; steps += 1) {
      const state = result.state;
      switch (state.phase) {
        case 'bedtime':
          if (!state.isWorkDay) {
            result = reducer(state, { type: 'PASS_WEEKEND' }, safeDeps);
          } else if (state.alarmMin === undefined) {
            result = reducer(state, { type: 'SET_ALARM', alarmMin: 420 }, safeDeps);
          } else {
            result = reducer(state, { type: 'START_SLEEP' }, safeDeps);
          }
          break;
        case 'sleeping':
          result = reducer(state, { type: 'WAKE_UP' }, safeDeps);
          break;
        case 'wakeup':
          result = reducer(state, { type: 'CONTINUE_TO_COMMUTE' }, safeDeps);
          break;
        case 'commute':
          result = reducer(state, { type: 'CHOOSE_COMMUTE', choice: 'subway' }, safeDeps);
          break;
        case 'office':
          result = reducer(state, { type: 'CONTINUE_TO_NEXT_DAY' }, safeDeps);
          break;
        case 'intro':
          result = reducer(state, { type: 'START_GAME' }, safeDeps);
          break;
        case 'bribe':
          throw new Error('safe strategy unexpectedly arrived late');
        default:
          throw new Error(`unexpected phase ${(state as ActiveGameState).phase}`);
      }

    }

    expect(result.status).toBe('win');
    if (result.status !== 'win') return;
    expect(result.state.phase).toBe('result');
    expect(result.state.dayIndex).toBe(12);
    expect(result.state.dailyLog).toHaveLength(12);
    expect(result.state.dailyLog.map(record => record.day)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(result.finalBalance).toBeGreaterThanOrEqual(0);
    expect(() => reducer(result.state, { type: 'START_GAME' }, safeDeps)).toThrow(InvalidActionError);
  });

  test('calculateArrivalMinutes validates inputs', () => {
    expect(calculateArrivalMinutes(420, 25, 60)).toBe(505);
    expect(() => calculateArrivalMinutes(-1, 25, 60)).toThrow(RangeError);
  });
});
