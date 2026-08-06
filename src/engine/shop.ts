import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance';
import type {
  ActionRejectedReason,
  BaseGameState,
  BedtimeState,
  Inventory,
  PendingArrivals,
  ShopItemId,
} from './types';
import { assertNever, assertOneOf } from './validation';

const SHOP_ITEM_IDS: readonly ShopItemId[] = [
  'pillow',
  'eyeMask',
  'earPlugs',
  'dora',
  'smartLamp',
];

type PermanentItemId = Exclude<ShopItemId, 'dora'>;

export type ShopPurchaseResult =
  | { ok: true; state: BedtimeState }
  | { ok: false; reason: ActionRejectedReason };

const EMPTY_PENDING_ARRIVALS: PendingArrivals = {
  pillow: false,
  eyeMask: false,
  earPlugs: false,
  smartLamp: false,
};

export function applyPendingArrivals<T extends BaseGameState>(state: T): T {
  const inventory: Inventory = {
    ...state.inventory,
    pillow: state.inventory.pillow || state.pendingArrivals.pillow,
    eyeMask: state.inventory.eyeMask || state.pendingArrivals.eyeMask,
    earPlugs: state.inventory.earPlugs || state.pendingArrivals.earPlugs,
    smartLamp: state.inventory.smartLamp || state.pendingArrivals.smartLamp,
  };

  return {
    ...state,
    inventory,
    pendingArrivals: { ...EMPTY_PENDING_ARRIVALS },
  };
}

function permanentPrice(itemId: PermanentItemId, config: BalanceConfig): number {
  switch (itemId) {
    case 'pillow':
      return config.SHOP_PRICE_PILLOW;
    case 'eyeMask':
      return config.SHOP_PRICE_EYE_MASK;
    case 'earPlugs':
      return config.SHOP_PRICE_EAR_PLUGS;
    case 'smartLamp':
      return config.SHOP_PRICE_SMART_LAMP;
    default:
      return assertNever(itemId, 'permanentPrice:itemId');
  }
}

export function onBuyItem(
  state: BedtimeState,
  itemId: ShopItemId,
  qty = 1,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ShopPurchaseResult {
  assertOneOf(itemId, SHOP_ITEM_IDS, 'onBuyItem:itemId');

  if (!Number.isInteger(qty) || qty <= 0 || (itemId !== 'dora' && qty !== 1)) {
    return { ok: false, reason: 'INVALID_QUANTITY' };
  }

  if (itemId === 'dora') {
    const cost = config.SHOP_PRICE_DORA_PER_PILL * qty;
    if (state.balance < cost) return { ok: false, reason: 'INSUFFICIENT_FUNDS' };

    return {
      ok: true,
      state: {
        ...state,
        balance: state.balance - cost,
        inventory: { ...state.inventory, dora: state.inventory.dora + qty },
      },
    };
  }

  if (state.inventory[itemId]) return { ok: false, reason: 'ALREADY_OWNED' };
  if (state.pendingArrivals[itemId]) return { ok: false, reason: 'ALREADY_PENDING' };

  const cost = permanentPrice(itemId, config);
  if (state.balance < cost) return { ok: false, reason: 'INSUFFICIENT_FUNDS' };

  return {
    ok: true,
    state: {
      ...state,
      balance: state.balance - cost,
      pendingArrivals: { ...state.pendingArrivals, [itemId]: true },
    },
  };
}
