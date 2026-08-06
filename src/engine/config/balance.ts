/**
 * Immutable balance configuration.
 *
 * Runtime code receives a config object instead of mutating module globals. Parameter
 * scans create copies with object spread, so concurrent simulations and tests stay isolated.
 */

export interface BalanceConfig {
  readonly WORKDAY_DEBT_CARRY: number;
  readonly WEEKEND_DEBT_DECAY: number;
  readonly SNOOZE_GRADIENT: number;

  readonly SOL_BASE_OVERRIDE: number | null;
  readonly SOL_PILLOW_REDUCTION: number;
  readonly SOL_EYE_MASK_REDUCTION: number;
  readonly SOL_EAR_PLUGS_REDUCTION: number;
  readonly SOL_DORA_REDUCTION: number;

  readonly COMMUTE_SUBWAY_MIN: number;
  readonly COMMUTE_SUBWAY_COST: number;
  readonly COMMUTE_EXPRESS_MIN: number;
  readonly COMMUTE_EXPRESS_COST: number;
  readonly COMMUTE_EXPRESS_CANCEL_RATE: number;
  readonly COMMUTE_EXPRESS_CANCEL_EXTRA_MIN: number;
  readonly COMMUTE_PREMIUM_MIN: number;
  readonly COMMUTE_PREMIUM_COST: number;

  readonly WEATHER_SNOW_BONUS_MIN: number;
  readonly EVENT_NORMAL_BONUS_MIN: number;
  readonly EVENT_HOLIDAY_BONUS_MIN: number;
  readonly WEATHER_SNOW_RATE_NORMAL_DAY: number;
  readonly WEATHER_SNOW_RATE_FINAL_DAY: number;
  readonly EVENT_NORMAL_TRIGGER_RATE: number;

  readonly INITIAL_BALANCE: number;
  readonly DAILY_SALARY: number;
  readonly BRIBE_COST: number;

  readonly SHOP_PRICE_PILLOW: number;
  readonly SHOP_PRICE_EYE_MASK: number;
  readonly SHOP_PRICE_EAR_PLUGS: number;
  readonly SHOP_PRICE_DORA_PER_PILL: number;
  readonly SHOP_PRICE_SMART_LAMP: number;
}

export const DEFAULT_BALANCE_CONFIG: Readonly<BalanceConfig> = Object.freeze({
  WORKDAY_DEBT_CARRY: 0.5,
  WEEKEND_DEBT_DECAY: 0.5,
  SNOOZE_GRADIENT: 60,

  SOL_BASE_OVERRIDE: null,
  SOL_PILLOW_REDUCTION: -6,
  SOL_EYE_MASK_REDUCTION: -4,
  SOL_EAR_PLUGS_REDUCTION: -3,
  SOL_DORA_REDUCTION: -15,

  COMMUTE_SUBWAY_MIN: 60,
  COMMUTE_SUBWAY_COST: 5,
  COMMUTE_EXPRESS_MIN: 25,
  COMMUTE_EXPRESS_COST: 30,
  COMMUTE_EXPRESS_CANCEL_RATE: 0.30,
  COMMUTE_EXPRESS_CANCEL_EXTRA_MIN: 10,
  COMMUTE_PREMIUM_MIN: 25,
  COMMUTE_PREMIUM_COST: 60,

  WEATHER_SNOW_BONUS_MIN: 15,
  EVENT_NORMAL_BONUS_MIN: 15,
  EVENT_HOLIDAY_BONUS_MIN: 20,
  WEATHER_SNOW_RATE_NORMAL_DAY: 0.20,
  WEATHER_SNOW_RATE_FINAL_DAY: 0.70,
  EVENT_NORMAL_TRIGGER_RATE: 0.50,

  INITIAL_BALANCE: 50,
  DAILY_SALARY: 20,
  BRIBE_COST: 180,

  SHOP_PRICE_PILLOW: 40,
  SHOP_PRICE_EYE_MASK: 18,
  SHOP_PRICE_EAR_PLUGS: 12,
  SHOP_PRICE_DORA_PER_PILL: 20,
  SHOP_PRICE_SMART_LAMP: 95,
});
