import type { BalanceConfig } from './config/balance';
import type { ResultState, TelemetryEvent } from './types';

export const TELEMETRY_SCHEMA_VERSION = 1;
export const GAME_VERSION = '0.1.1.26.08.11';

export interface TelemetryReport {
  schemaVersion: number;
  gameVersion: string;
  seed: string;
  outcome: {
    status: ResultState['resultStatus'];
    loseReason?: ResultState['loseReason'];
    dayIndex: number;
    balance: number;
    sleepDebt: number;
    netSleepDebt: number;
    bribeUsed: boolean;
  };
  balanceConfig: BalanceConfig;
  dailyLog: ResultState['dailyLog'];
  events: TelemetryEvent[];
}

/** Builds a privacy-preserving report from in-game decisions only. */
export function createTelemetryReport(
  state: ResultState,
  seed: string,
  balanceConfig: BalanceConfig,
): TelemetryReport {
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    seed,
    outcome: {
      status: state.resultStatus,
      loseReason: state.loseReason,
      dayIndex: state.dayIndex,
      balance: state.balance,
      sleepDebt: state.sleepDebt,
      netSleepDebt: state.netSleepDebt,
      bribeUsed: state.bribeUsed,
    },
    balanceConfig,
    dailyLog: state.dailyLog,
    events: state.telemetry,
  };
}
