import { useEffect, useMemo, useState } from 'react';
import {
  ALARM_MIN,
  DEFAULT_BALANCE_CONFIG,
  createInitialState,
  createRngFromString,
  reducer,
  type Action,
  type ActiveGameState,
  type GameResult,
  type ShopItemId,
} from '../engine';
import {
  discoveriesForState,
  currentTime,
  formatClock,
  progressText,
  WEEKDAYS,
  type MechanicId,
} from './model';
import {
  loadDiscovered,
  loadTutorialSeen,
  resetTutorialSeen,
  saveDiscovered,
  saveTutorialSeen,
} from './learning';
import { COPY } from '../content/zh-CN';

const config = DEFAULT_BALANCE_CONFIG;

const TUTORIALS = COPY.tutorials;

const SHOP: Array<{ id: ShopItemId; name: string; price: number; note: string }> = [
  { id: 'pillow', name: COPY.items.pillow, price: config.SHOP_PRICE_PILLOW, note: COPY.shop.pillow },
  { id: 'eyeMask', name: COPY.items.eyeMask, price: config.SHOP_PRICE_EYE_MASK, note: COPY.shop.eyeMask },
  { id: 'earPlugs', name: COPY.items.earPlugs, price: config.SHOP_PRICE_EAR_PLUGS, note: COPY.shop.earPlugs },
  { id: 'dora', name: COPY.items.dora, price: config.SHOP_PRICE_DORA_PER_PILL, note: COPY.shop.dora },
  { id: 'smartLamp', name: COPY.items.smartLamp, price: config.SHOP_PRICE_SMART_LAMP, note: COPY.shop.smartLamp },
];

function ArtPlaceholder({ location, purpose, ratio = '4:3' }: { location: string; purpose: string; ratio?: string }) {
  return (
    <div className="art-placeholder" role="img" aria-label={`美术占位：${location}`}>
      <strong>美术占位 · {location}</strong>
      <span>功能：{purpose}</span>
      <small>建议比例：{ratio} · 后续替换像素画</small>
    </div>
  );
}

function StatusBar({ state, onRules }: { state: ActiveGameState; onRules: () => void }) {
  return (
    <header className="status-bar">
      <div><small>{COPY.web.status.time}</small><strong>{WEEKDAYS[state.dayIndex]} · {currentTime(state)}</strong></div>
      <div><small>{COPY.web.status.progress}</small><strong>{progressText(state)}</strong></div>
      <div><small>{COPY.web.status.debt}</small><strong>{Math.round(state.sleepDebt)} 分</strong></div>
      <div><small>{COPY.web.status.balance}</small><strong>¥{state.balance}</strong></div>
      <button className="icon-button" onClick={onRules} aria-label={COPY.web.status.rulesAria}>{COPY.web.status.rules}</button>
    </header>
  );
}

function RulesDialog({ discovered, onClose, onResetTutorial }: {
  discovered: Set<MechanicId>;
  onClose: () => void;
  onResetTutorial: () => void;
}) {
  const locked = Object.keys(TUTORIALS).filter(id => !discovered.has(id as MechanicId)).length;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div className="modal-title"><h2 id="rules-title">{COPY.web.rules.title}</h2><button onClick={onClose}>{COPY.web.rules.close}</button></div>
        <article><h3>{COPY.web.rules.goalTitle}</h3><p>{COPY.web.rules.goalBody}</p></article>
        <article><h3>{COPY.web.rules.nightTitle}</h3><p>{COPY.web.rules.nightBody}</p></article>
        <article><h3>{COPY.web.rules.commuteTitle}</h3><p>{COPY.web.rules.commuteBody}</p></article>
        {[...discovered].map(id => <article key={id}><h3>{TUTORIALS[id].title}</h3><p>{TUTORIALS[id].body}</p></article>)}
        {locked > 0 && <div className="locked-rules" aria-label={COPY.web.rules.lockedAria(locked)}><strong>{COPY.web.rules.locked(locked)}</strong><span>{COPY.web.rules.lockedBody}</span></div>}
        <footer className="tutorial-settings">
          <div><strong>{COPY.web.rules.supportTitle}</strong><p>{COPY.web.rules.supportBody}</p></div>
          <button onClick={onResetTutorial}>{COPY.web.rules.reset}</button>
        </footer>
      </section>
    </div>
  );
}

function TutorialCard({ id, onDismiss }: { id: MechanicId; onDismiss: () => void }) {
  return (
    <aside className="tutorial-card" role="status">
      <span>{COPY.web.tutorialCard.eyebrow}</span><h3>{TUTORIALS[id].title}</h3><p>{TUTORIALS[id].body}</p>
      <button onClick={onDismiss}>{COPY.web.tutorialCard.dismiss}</button>
    </aside>
  );
}

export function App() {
  const [seed, setSeed] = useState(() => String(Date.now()));
  const deps = useMemo(() => ({ rng: createRngFromString(seed), balance: config }), [seed]);
  const [result, setResult] = useState<GameResult>(() => ({ status: 'playing', state: createInitialState(config) }));
  const [message, setMessage] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [discovered, setDiscovered] = useState<Set<MechanicId>>(() => loadDiscovered());
  const [tutorialSeen, setTutorialSeen] = useState<Set<MechanicId>>(() => loadTutorialSeen());
  const [tutorial, setTutorial] = useState<MechanicId | null>(null);

  const state = result.state;

  useEffect(() => {
    if (result.status !== 'playing') return;
    const found = discoveriesForState(result.state);
    if (found.length === 0) return;
    setDiscovered(previous => {
      const next = new Set(previous);
      found.forEach(id => next.add(id));
      saveDiscovered(next);
      return next;
    });
    const unseen = found.find(id => !tutorialSeen.has(id));
    if (unseen && tutorial === null) setTutorial(unseen);
  }, [result, tutorial, tutorialSeen]);

  const act = (input: Action | readonly Action[]): GameResult => {
    if (result.status !== 'playing') return result;
    const actions = Array.isArray(input) ? input : [input];
    let next: GameResult = result;
    for (const action of actions) {
      if (next.status !== 'playing') break;
      next = reducer(next.state, action, deps);
    }
    if (next.status === 'rejected') {
      setMessage(COPY.rejected[next.reason] ?? COPY.web.fallbackRejected);
      return next;
    }
    setMessage('');
    setResult(next);
    return next;
  };

  const dismissTutorial = () => {
    if (!tutorial) return;
    const next = new Set(tutorialSeen).add(tutorial);
    setTutorialSeen(next); saveTutorialSeen(next); setTutorial(null);
  };

  const restart = () => {
    const nextSeed = String(Date.now());
    setSeed(nextSeed);
    setResult({ status: 'playing', state: createInitialState(config) });
    setMessage(''); setTutorial(null);
  };

  if (state.phase === 'intro') {
    return <main className="intro-shell"><section className="intro-card">
      <ArtPlaceholder location="主菜单 / 年末城市夜景" purpose="建立深夜通勤氛围与游戏标题背景" ratio="16:9" />
      <p className="eyebrow">{COPY.web.intro.eyebrow}</p><h1>{COPY.web.intro.title}</h1>
      <p>{COPY.web.intro.body}</p>
      <button className="primary" onClick={() => act({ type: 'START_GAME' })}>{COPY.web.intro.start}</button>
      <button className="secondary" onClick={() => setRulesOpen(true)}>{COPY.web.intro.rules}</button>
      <small>{COPY.web.intro.seed(seed)}</small>
    </section>{rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage(COPY.web.tutorialReset); }} />}</main>;
  }

  if (result.status === 'win' || result.status === 'lose') {
    return <main className="result-shell"><section className="result-card">
      <ArtPlaceholder location="结算场景" purpose="根据通关或失败表现最终情绪" ratio="16:9" />
      <p className="eyebrow">{result.status === 'win' ? COPY.web.result.winEyebrow : COPY.web.result.lossEyebrow(state.dayIndex)}</p>
      <h1>{result.status === 'win' ? COPY.web.result.winTitle : COPY.web.result.lossTitle}</h1>
      <p>{COPY.web.result.balance} <strong>¥{state.balance}</strong></p>
      <div className="day-log">{state.dailyLog.map(record => <div key={record.day}><strong>Day {record.day}</strong><span>{record.isWorkDay ? `${record.arriveHHMM ?? '—'} · ${record.isLate ? COPY.web.result.late : COPY.web.result.onTime}` : COPY.web.result.weekend}</span><span>¥{record.balanceAfter}</span></div>)}</div>
      <button className="primary" onClick={restart}>{COPY.web.result.restart}</button>
    </section></main>;
  }

  const active = state as ActiveGameState;
  return <main className="game-shell">
    <StatusBar state={active} onRules={() => setRulesOpen(true)} />
    {message && <div className="toast" role="alert">{message}</div>}
    <section className="screen-card">
      {active.phase === 'bedtime' && <BedtimeScreen state={active} act={act} />}
      {active.phase === 'sleeping' && <SleepingScreen state={active} act={act} />}
      {active.phase === 'wakeup' && <WakeupScreen state={active} act={act} />}
      {active.phase === 'commute' && <CommuteScreen state={active} act={act} />}
      {active.phase === 'office' && <OfficeScreen state={active} act={act} />}
      {active.phase === 'bribe' && <BribeScreen state={active} act={act} />}
    </section>
    {tutorial && <TutorialCard id={tutorial} onDismiss={dismissTutorial} />}
    {rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage(COPY.web.tutorialResetInGame); }} />}
  </main>;
}

type ScreenProps<T extends ActiveGameState> = {
  state: T;
  act: (action: Action | readonly Action[]) => GameResult;
};

function BedtimeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'bedtime' }>>) {
  const [alarm, setAlarm] = useState(state.alarmMin ?? ALARM_MIN);
  const permanentOwned = (id: ShopItemId) => id !== 'dora' && state.inventory[id];
  const pending = (id: ShopItemId) => id !== 'dora' && state.pendingArrivals[id];
  return <>
    <div className="screen-heading"><div><p className="eyebrow">Day {state.dayIndex} · {state.isWorkDay ? COPY.web.bedtime.workday : COPY.web.bedtime.weekend}</p><h2>{state.isWorkDay ? COPY.web.bedtime.workdayTitle : COPY.web.bedtime.weekendTitle}</h2></div><div className="forecast"><span>{state.weatherToday === 'snow' ? COPY.web.bedtime.snow : COPY.web.bedtime.clear}</span><span>{COPY.events.name(state.eventToday)}</span></div></div>
    <ArtPlaceholder location="卧室夜景" purpose="承载睡前、商店和闹钟设置的主场景" />
    <h3>{COPY.web.bedtime.shop}</h3><div className="shop-grid">{SHOP.map(item => <button key={item.id} className="shop-item" disabled={permanentOwned(item.id) || pending(item.id)} onClick={() => act({ type: 'BUY_ITEM', itemId: item.id })}><strong>{item.name}<span>¥{item.price}</span></strong><small>{permanentOwned(item.id) ? COPY.web.bedtime.owned : pending(item.id) ? COPY.web.bedtime.pending : item.note}</small></button>)}</div>
    {state.isWorkDay ? <div className="alarm-panel"><label htmlFor="alarm">{COPY.web.bedtime.alarm} <strong>{formatClock(alarm)}</strong></label><input id="alarm" type="range" min="420" max="600" step="5" value={alarm} onChange={event => setAlarm(Number(event.target.value))} />
      {state.inventory.dora > 0 && !state.doraUsedTonight && <button className="secondary" onClick={() => act({ type: 'USE_DORA_TONIGHT' })}>{COPY.web.bedtime.useDora(state.inventory.dora)}</button>}
      <button className="primary" onClick={() => act([
        { type: 'SET_ALARM', alarmMin: alarm },
        { type: 'START_SLEEP' },
      ])}>{COPY.web.bedtime.sleep}</button></div>
      : <button className="primary" onClick={() => act({ type: 'PASS_WEEKEND' })}>{COPY.web.bedtime.rest}</button>}
  </>;
}

function SleepingScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'sleeping' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="睡眠过渡" purpose="表现时间流逝、入睡等待与夜色变化" ratio="16:9" /><p className="eyebrow">SOL {state.solTonight} 分钟</p><h2>{COPY.web.sleeping.alarm(formatClock(state.alarmMin))}</h2><p>{COPY.web.sleeping.sleepSummary(formatClock(state.solTonight), Math.floor(state.actualSleepMin / 60), state.actualSleepMin % 60)}</p><button className="primary" onClick={() => act({ type: 'WAKE_UP' })}>{COPY.web.sleeping.wake}</button></div>;
}

function WakeupScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'wakeup' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="起床 / 闹钟" purpose="表现 snooze 次数和清晨状态" /><p className="eyebrow">{COPY.web.wakeup.now} {currentTime(state)}</p><h2>{COPY.web.wakeup.snooze(state.snoozeCount)}</h2><div className="metric-row"><div><small>{COPY.web.wakeup.debt}</small><strong>{Math.round(state.sleepDebt)} 分</strong></div><div><small>{COPY.web.wakeup.routine}</small><strong>{state.routineMin} 分</strong></div><div><small>{COPY.web.wakeup.leaveAt}</small><strong>{formatClock(state.alarmMin + state.routineMin)}</strong></div></div><button className="primary" onClick={() => act({ type: 'CONTINUE_TO_COMMUTE' })}>{COPY.web.wakeup.continue}</button></div>;
}

function CommuteScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'commute' }>>) {
  const options = [
    { id: 'subway' as const, name: COPY.web.commute.subway, cost: config.COMMUTE_SUBWAY_COST, time: config.COMMUTE_SUBWAY_MIN, risk: COPY.web.commute.subwayRisk },
    { id: 'express' as const, name: COPY.web.commute.express, cost: config.COMMUTE_EXPRESS_COST, time: config.COMMUTE_EXPRESS_MIN, risk: COPY.web.commute.expressRisk },
    { id: 'premium' as const, name: COPY.web.commute.premium, cost: config.COMMUTE_PREMIUM_COST, time: config.COMMUTE_PREMIUM_MIN, risk: COPY.web.commute.premiumRisk },
  ];
  return <><div className="screen-heading"><div><p className="eyebrow">{COPY.web.commute.leave} · {currentTime(state)}</p><h2>{COPY.web.commute.title}</h2></div><div className="deadline">09:00<br/><small>{COPY.web.commute.deadline}</small></div></div><ArtPlaceholder location="城市通勤" purpose="根据天气与所选交通方式展示通勤场景" ratio="16:9" /><div className="commute-grid">{options.map(option => <button key={option.id} disabled={state.balance < option.cost} onClick={() => act({ type: 'CHOOSE_COMMUTE', choice: option.id })}><strong>{option.name}<span>¥{option.cost}</span></strong><b>{option.time} 分钟</b><small>{option.risk}</small></button>)}</div></>;
}

function OfficeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'office' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="公司打卡机" purpose="展示到达公司、打卡结果和当日结算" /><p className="eyebrow">{COPY.web.office.success}</p><h2>{COPY.web.office.onTime(formatClock(state.arriveMin))}</h2>{state.commuteCancelled && <p>{COPY.web.office.expressCancelled}</p>}{state.subwayFailed && <p>{COPY.web.office.subwayFailed}</p>}<p>{COPY.web.office.end(state.balance)}</p><button className="primary" onClick={() => act({ type: 'CONTINUE_TO_NEXT_DAY' })}>{COPY.web.office.next}</button></div>;
}

function BribeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'bribe' }>>) {
  return <div className="center-screen danger"><ArtPlaceholder location="主管办公室" purpose="首次迟到时揭示补救机制；形成意外与压力" /><p className="eyebrow">{COPY.web.bribe.late(formatClock(state.arriveMin))}</p><h2>{COPY.web.bribe.title}</h2>{state.commuteCancelled && <p>{COPY.web.bribe.expressCancelled}</p>}{state.subwayFailed && <p>{COPY.web.bribe.subwayFailed}</p>}<p>{COPY.web.bribe.body(config.BRIBE_COST)}</p><button className="primary danger-button" disabled={state.balance < config.BRIBE_COST} onClick={() => act({ type: 'CHOOSE_BRIBE' })}>{COPY.web.bribe.pay(config.BRIBE_COST)}</button><button className="secondary" onClick={() => act({ type: 'DECLINE_BRIBE' })}>{COPY.web.bribe.decline}</button></div>;
}
