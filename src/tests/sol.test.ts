import {
  Balance,
  SOL_MIN,
  calculateSOL,
  resetBalanceToDefaults,
  type Inventory,
} from '../engine';

const EMPTY_INVENTORY: Inventory = {
  pillow: false,
  eyeMask: false,
  earPlugs: false,
  smartLamp: false,
  dora: 0,
};

describe('calculateSOL', () => {
  beforeEach(() => {
    resetBalanceToDefaults();
  });

  afterAll(() => {
    resetBalanceToDefaults();
  });

  test('uses the 45-minute anchor without sleep aids', () => {
    expect(calculateSOL(EMPTY_INVENTORY, false)).toBe(45);
  });

  test('applies every permanent item and one DORA dose', () => {
    const inventory: Inventory = {
      pillow: true,
      eyeMask: true,
      earPlugs: true,
      smartLamp: true,
      dora: 10,
    };

    expect(calculateSOL(inventory, true)).toBe(17);
  });

  test('smart lamp and unused DORA inventory do not change SOL', () => {
    const inventory: Inventory = {
      ...EMPTY_INVENTORY,
      smartLamp: true,
      dora: 10,
    };

    expect(calculateSOL(inventory, false)).toBe(45);
  });

  test('supports a temporary base override for parameter scans', () => {
    Balance.SOL_BASE_OVERRIDE = 30;
    expect(calculateSOL(EMPTY_INVENTORY, false)).toBe(30);
  });

  test('never falls below SOL_MIN', () => {
    Balance.SOL_DORA_REDUCTION = -1_000;
    expect(calculateSOL(EMPTY_INVENTORY, true)).toBe(SOL_MIN);
  });
});
