import {
  DEFAULT_BALANCE_CONFIG,
  applyPendingArrivals,
  createInitialState,
  onBuyItem,
  reducer,
  type BedtimeState,
  type EngineDeps,
} from '../engine';

const deps: EngineDeps = { rng: () => 0.999999 };

function dayOneBedtime(): BedtimeState {
  const result = reducer(createInitialState(), { type: 'START_GAME' }, deps);
  if (result.status !== 'playing' || result.state.phase !== 'bedtime') {
    throw new Error('expected Day 1 bedtime');
  }
  return result.state;
}

describe('shop', () => {
  test('permanent items are paid now and arrive later without mutating input', () => {
    const state = dayOneBedtime();
    const purchase = onBuyItem(state, 'eyeMask');

    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    expect(purchase.state.balance).toBe(52);
    expect(purchase.state.pendingArrivals.eyeMask).toBe(true);
    expect(purchase.state.inventory.eyeMask).toBe(false);
    expect(state.balance).toBe(70);
    expect(state.pendingArrivals.eyeMask).toBe(false);

    const delivered = applyPendingArrivals(purchase.state);
    expect(delivered.inventory.eyeMask).toBe(true);
    expect(delivered.pendingArrivals.eyeMask).toBe(false);
  });

  test('rejects duplicate permanent items in inventory or pending arrivals', () => {
    const state = dayOneBedtime();
    const pendingState: BedtimeState = {
      ...state,
      pendingArrivals: { ...state.pendingArrivals, pillow: true },
    };
    const ownedState: BedtimeState = {
      ...state,
      inventory: { ...state.inventory, pillow: true },
    };

    expect(onBuyItem(pendingState, 'pillow')).toEqual({
      ok: false,
      reason: 'ALREADY_PENDING',
    });
    expect(onBuyItem(ownedState, 'pillow')).toEqual({
      ok: false,
      reason: 'ALREADY_OWNED',
    });
  });

  test('DORA enters inventory immediately and supports positive integer quantities', () => {
    const state = dayOneBedtime();
    const purchase = onBuyItem(state, 'dora', 3);

    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    expect(purchase.state.balance).toBe(10);
    expect(purchase.state.inventory.dora).toBe(3);
    expect(purchase.state.pendingArrivals).toEqual(state.pendingArrivals);
  });

  test.each([0, -1, 1.5])('rejects invalid DORA quantity %s', qty => {
    expect(onBuyItem(dayOneBedtime(), 'dora', qty)).toEqual({
      ok: false,
      reason: 'INVALID_QUANTITY',
    });
  });

  test('rejects non-unit quantity for permanent items', () => {
    expect(onBuyItem(dayOneBedtime(), 'eyeMask', 2)).toEqual({
      ok: false,
      reason: 'INVALID_QUANTITY',
    });
  });

  test('rejects unaffordable purchases without creating a negative balance', () => {
    const state = { ...dayOneBedtime(), balance: 0 };
    const purchase = onBuyItem(state, 'smartLamp');

    expect(purchase).toEqual({ ok: false, reason: 'INSUFFICIENT_FUNDS' });
    expect(state.balance).toBe(0);
  });

  test('reducer returns typed rejection for player constraints', () => {
    const state = { ...dayOneBedtime(), balance: 0 };
    const result = reducer(state, { type: 'BUY_ITEM', itemId: 'pillow' }, deps);

    expect(result).toEqual({
      status: 'rejected',
      state,
      reason: 'INSUFFICIENT_FUNDS',
    });
  });

  test('custom prices are isolated in an injected config', () => {
    const config = { ...DEFAULT_BALANCE_CONFIG, SHOP_PRICE_PILLOW: 1 };
    const purchase = onBuyItem(dayOneBedtime(), 'pillow', 1, config);

    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    expect(purchase.state.balance).toBe(69);
    expect(DEFAULT_BALANCE_CONFIG.SHOP_PRICE_PILLOW).toBe(40);
  });

  test.each([
    ['pillow', 40],
    ['eyeMask', 18],
    ['earPlugs', 12],
    ['smartLamp', 95],
  ] as const)('uses the configured price for %s', (itemId, price) => {
    const state = { ...dayOneBedtime(), balance: 200 };
    const purchase = onBuyItem(state, itemId);

    expect(purchase.ok).toBe(true);
    if (purchase.ok) expect(purchase.state.balance).toBe(200 - price);
  });
});
