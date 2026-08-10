import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALARM_MAX,
  ALARM_MIN,
  ALARM_STEP,
  CLOCKIN_DEADLINE,
  DEFAULT_BALANCE_CONFIG,
  ROUTINE_BASE,
  SNOOZE_PER,
  createInitialState,
  createRngFromString,
  reducer,
  type Action,
  type ActiveGameState,
  type CommuteId,
  type GameResult,
  type ShopItemId,
} from '../engine';
import {
  discoveriesForState,
  currentTime,
  formatClock,
  formatDuration,
  statusDayLabel,
  WEEKDAYS,
  type MechanicId,
} from './model';
import {
  loadDiscovered,
  loadFirstAlarmAdviceSeen,
  loadTutorialSeen,
  resetTutorialSeen,
  saveDiscovered,
  saveFirstAlarmAdviceSeen,
  saveTutorialSeen,
} from './learning';
import { COPY } from '../content/zh-CN';

const config = DEFAULT_BALANCE_CONFIG;

const TUTORIALS = COPY.tutorials;

const SHOP: Array<{ id: ShopItemId; name: string; price: number; note: string; delivery?: string }> = [
  { id: 'dora', name: COPY.items.dora, price: config.SHOP_PRICE_DORA_PER_PILL, delivery: COPY.shop.doraDelivery, note: COPY.shop.dora },
  { id: 'pillow', name: COPY.items.pillow, price: config.SHOP_PRICE_PILLOW, note: COPY.shop.pillow },
  { id: 'eyeMask', name: COPY.items.eyeMask, price: config.SHOP_PRICE_EYE_MASK, note: COPY.shop.eyeMask },
  { id: 'earPlugs', name: COPY.items.earPlugs, price: config.SHOP_PRICE_EAR_PLUGS, note: COPY.shop.earPlugs },
  { id: 'smartLamp', name: COPY.items.smartLamp, price: config.SHOP_PRICE_SMART_LAMP, note: COPY.shop.smartLamp },
];

function StatusBar({ state, onRules }: { state: ActiveGameState; onRules: () => void }) {
  return (
    <header className="status-bar">
      <div className="status-day"><strong>{statusDayLabel(state.dayIndex)}</strong></div>
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
    <aside className="tutorial-card" role="dialog" aria-modal="true" aria-labelledby={`tutorial-${id}-title`}>
      <span>{COPY.web.tutorialCard.eyebrow}</span><h3 id={`tutorial-${id}-title`}>{TUTORIALS[id].title}</h3><p>{TUTORIALS[id].body}</p>{id === 'sleepDebt' && <ul>{COPY.tutorials.sleepDebt.points.map(point => <li key={point}>{point}</li>)}</ul>}
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
      <h1>{COPY.web.intro.title}</h1>
      <p className="intro-description">{COPY.web.intro.body}</p>
      <p className="intro-objective">{COPY.web.intro.objective}</p>
      <ul className="intro-rules">{COPY.web.intro.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <p className="intro-closing">{COPY.web.intro.closing}</p>
      <button className="primary" onClick={() => act({ type: 'START_GAME' })}>{COPY.web.intro.start}</button>
      <button className="secondary" onClick={() => setRulesOpen(true)}>{COPY.web.intro.rulesLabel}</button>
      <small>{COPY.web.intro.seed(seed)}</small>
    </section>{rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage(COPY.web.tutorialReset); }} />}</main>;
  }

  if (result.status === 'win' || result.status === 'lose') {
    return <main className="result-shell"><section className="result-card">
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
      {active.phase === 'commute' && <CommuteScreen state={active} act={act} />}
      {active.phase === 'office' && <OfficeScreen state={active} act={act} />}
      {active.phase === 'bribe' && <BribeScreen state={active} act={act} />}
    </section>
    {tutorial && <><div className="tutorial-backdrop" aria-hidden="true" /><TutorialCard id={tutorial} onDismiss={dismissTutorial} /></>}
    {rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage(COPY.web.tutorialResetInGame); }} />}
  </main>;
}

type ScreenProps<T extends ActiveGameState> = {
  state: T;
  act: (action: Action | readonly Action[]) => GameResult;
};

function ScreenStateHeading({ time, icon, status, subtitle }: { time: string; icon: string; status: string; subtitle?: string }) {
  return <header className="screen-heading screen-state-heading"><div><h2><time>{time}</time><span className="screen-state-icon" aria-hidden="true">{icon}</span>{status}</h2>{subtitle && <p className="eyebrow">{subtitle}</p>}</div></header>;
}

function CommuteConditions({
  title,
  weather,
  event,
}: {
  title: string;
  weather: Extract<ActiveGameState, { phase: 'bedtime' }>['weatherToday'];
  event: Extract<ActiveGameState, { phase: 'bedtime' }>['eventToday'];
}) {
  return <section className="commute-conditions" aria-label={title}>
    <h3>{title}</h3>
    <div className="info-pair">
      <div><small>{COPY.web.bedtime.forecastWeather}</small><strong>{weather === 'snow' ? COPY.web.bedtime.snow : COPY.web.bedtime.clear}</strong></div>
      <div><small>{COPY.web.bedtime.forecastEvent}</small><strong>{COPY.events.name(event)}</strong></div>
    </div>
  </section>;
}

function BedtimeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'bedtime' }>>) {
  const [alarm, setAlarm] = useState(state.alarmMin ?? ALARM_MIN);
  const [cart, setCart] = useState<Set<ShopItemId>>(() => new Set());
  const [showFirstAlarmAdvice, setShowFirstAlarmAdvice] = useState(() => state.dayIndex === 1 && !loadFirstAlarmAdviceSeen());
  const alarmHour = Math.floor(alarm / 60);
  const alarmMinute = alarm % 60;
  const alarmHours = Array.from({ length: ALARM_MAX / 60 - ALARM_MIN / 60 + 1 }, (_, index) => ALARM_MIN / 60 + index);
  const alarmMinutes = Array.from({ length: 60 / ALARM_STEP }, (_, index) => index * ALARM_STEP).filter(minute => alarmHour < ALARM_MAX / 60 || minute === 0);
  const setAlarmHour = (hour: number) => setAlarm(hour * 60 + (hour === ALARM_MAX / 60 ? 0 : alarmMinute));
  const setAlarmMinute = (minute: number) => setAlarm(alarmHour * 60 + minute);
  const permanentOwned = (id: ShopItemId) => id !== 'dora' && state.inventory[id];
  const pending = (id: ShopItemId) => id !== 'dora' && state.pendingArrivals[id];
  const cartItems = SHOP.filter(item => cart.has(item.id));
  const cartTotal = cartItems.reduce((total, item) => total + item.price, 0);
  const cartOverBudget = cartTotal > state.balance;
  const toggleCartItem = (itemId: ShopItemId) => setCart(previous => {
    const next = new Set(previous);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    return next;
  });
  const confirmCart = () => {
    if (cartItems.length === 0 || cartOverBudget) return;
    const next = act(cartItems.map(item => ({ type: 'BUY_ITEM' as const, itemId: item.id })));
    if (next.status === 'playing') setCart(new Set());
  };
  const cartPending = cart.size > 0;
  const dismissFirstAlarmAdvice = () => {
    saveFirstAlarmAdviceSeen();
    setShowFirstAlarmAdvice(false);
  };
  return <div className="page-layout bedtime-page">
    <ScreenStateHeading time={currentTime(state)} icon="🌙" status={COPY.web.bedtime.workday} subtitle={COPY.web.bedtime.subtitle(WEEKDAYS[state.dayIndex], currentTime(state))} />
    {state.isWorkDay && <CommuteConditions title={COPY.web.bedtime.conditionsTitle} weather={state.weatherToday} event={state.eventToday} />}
    <section className="shop-section"><div className="shop-heading"><h3>{COPY.web.bedtime.shop}</h3><small>{COPY.web.bedtime.shopHint}</small></div><div className="shop-grid">{SHOP.map(item => {
      const unavailable = permanentOwned(item.id) || pending(item.id);
      const selected = cart.has(item.id);
      return <button key={item.id} className={`shop-item${item.id === 'dora' ? ' dora-item' : ''}${selected ? ' selected' : ''}`} aria-pressed={selected} disabled={unavailable} onClick={() => toggleCartItem(item.id)}><span className="shop-copy"><strong>{item.name}</strong><small>{permanentOwned(item.id) ? COPY.web.bedtime.owned : pending(item.id) ? COPY.web.bedtime.pending : selected ? COPY.web.bedtime.selected : item.delivery ? <><b>{item.delivery}</b>；{item.note}</> : item.note}</small></span><span className="shop-price">¥{item.price}</span></button>;
    })}</div></section>
    {cartItems.length > 0 && <section className="cart-panel" aria-label={COPY.web.bedtime.cart}><div className="cart-heading"><h3>{COPY.web.bedtime.cart}</h3><strong>{COPY.web.bedtime.cartTotal} ¥{cartTotal}</strong></div><div className="cart-items">{cartItems.map(item => <button key={item.id} onClick={() => toggleCartItem(item.id)} aria-label={COPY.web.bedtime.removeFromCart(item.name)}>{item.name}<span>¥{item.price}</span></button>)}</div><p className="cart-balance">{COPY.web.bedtime.cartEstimatedBalance(state.balance - cartTotal)}</p>{cartOverBudget && <p className="cart-warning">{COPY.web.bedtime.cartOverBudget}</p>}<button className="primary cart-confirm" disabled={cartOverBudget} onClick={confirmCart}>{COPY.web.bedtime.confirmCart(cartTotal)}</button></section>}
    {state.isWorkDay ? <div className="alarm-panel">{showFirstAlarmAdvice && <aside className="alarm-advice"><strong>{COPY.web.bedtime.firstAlarmAdviceTitle}</strong><p>{COPY.web.bedtime.firstAlarmAdviceBody}</p><button type="button" onClick={dismissFirstAlarmAdvice}>{COPY.web.bedtime.firstAlarmAdviceDismiss}</button></aside>}<div className="alarm-row"><span className="alarm-label">{COPY.web.bedtime.alarm}</span><div className="alarm-wheels" aria-label="设置闹钟时间"><TimeWheel label="时" value={alarmHour} options={alarmHours} format={value => String(value).padStart(2, '0')} onChange={setAlarmHour} /><span className="alarm-separator" aria-hidden="true">:</span><TimeWheel label="分" value={alarmMinute} options={alarmMinutes} format={value => String(value).padStart(2, '0')} onChange={setAlarmMinute} /></div></div>
      {state.inventory.dora > 0 && !state.doraUsedTonight && <button className="secondary" onClick={() => act({ type: 'USE_DORA_TONIGHT' })}>{COPY.web.bedtime.useDora(state.inventory.dora)}</button>}
      <button className="primary" disabled={cartPending} onClick={() => act([
        { type: 'SET_ALARM', alarmMin: alarm },
        { type: 'START_SLEEP' },
        { type: 'WAKE_UP' },
        { type: 'CONTINUE_TO_COMMUTE' },
      ])}>{cartPending ? COPY.web.bedtime.resolveCart : COPY.web.bedtime.sleep}</button></div>
      : <button className="primary bedtime-rest" disabled={cartPending} onClick={() => act({ type: 'PASS_WEEKEND' })}>{cartPending ? COPY.web.bedtime.resolveCart : COPY.web.bedtime.rest}</button>}
  </div>;
}

function TimeWheel({ label, value, options, format, onChange }: { label: string; value: number; options: number[]; format: (value: number) => string; onChange: (value: number) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const index = options.indexOf(value);
    if (index >= 0 && viewportRef.current) viewportRef.current.scrollTop = index * 40;
  }, [options, value]);
  return <div className="time-wheel"><div ref={viewportRef} className="time-wheel-viewport" role="listbox" aria-label={`选择${label}`} onScroll={event => {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / 40)));
    if (options[index] !== value) onChange(options[index]);
  }}><div className="time-wheel-list">{options.map(option => <button key={option} type="button" role="option" aria-selected={option === value} className={option === value ? 'selected' : ''} onClick={() => onChange(option)}>{format(option)}</button>)}</div></div></div>;
}

function CommuteScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'commute' }>>) {
  const [selected, setSelected] = useState<CommuteId | null>(null);
  const now = state.alarmMin + state.routineMin;
  const remaining = CLOCKIN_DEADLINE - now;
  const snoozeMinutes = state.snoozeCount * SNOOZE_PER;
  const newDebt = Math.round(state.newDebtTonight);
  const totalDebt = Math.round(state.sleepDebt);
  const options = [
    { id: 'subway' as const, name: COPY.web.commute.subway, cost: config.COMMUTE_SUBWAY_COST, time: config.COMMUTE_SUBWAY_MIN, risk: COPY.web.commute.subwayRisk },
    { id: 'express' as const, name: COPY.web.commute.express, cost: config.COMMUTE_EXPRESS_COST, time: config.COMMUTE_EXPRESS_MIN, risk: COPY.web.commute.expressRisk },
    { id: 'premium' as const, name: COPY.web.commute.premium, cost: config.COMMUTE_PREMIUM_COST, time: config.COMMUTE_PREMIUM_MIN, risk: COPY.web.commute.premiumRisk },
  ];
  const selectedName = options.find(option => option.id === selected)?.name;
  return <div className="page-layout commute-page"><ScreenStateHeading time={currentTime(state)} icon="🚪" status={COPY.web.commute.title} /><div className="info-pair"><div><small>{COPY.web.commute.now}</small><strong>{formatClock(now)}</strong></div><div><small>{COPY.web.commute.deadline}</small><strong>{COPY.web.commute.minutesToDeadline(remaining)}</strong></div></div><CommuteConditions title={COPY.web.commute.conditionsTitle} weather={state.weatherToday} event={state.eventToday} /><section className="morning-story" aria-label={COPY.web.commute.morningSummary}><p>{COPY.web.commute.sleepSummary(formatClock(state.solTonight), formatDuration(state.actualSleepMin), formatClock(state.alarmMin))}</p><p>{COPY.web.commute.snoozeSummary(state.snoozeCount, snoozeMinutes)}</p>{newDebt > 0 && <p>{COPY.web.commute.debtSummary(newDebt, totalDebt)}</p>}<p>{COPY.web.commute.routineSummary(ROUTINE_BASE)}</p></section><div className="commute-actions"><div className="commute-grid">{options.map(option => <button key={option.id} className={selected === option.id ? 'selected' : ''} aria-pressed={selected === option.id} disabled={state.balance < option.cost} onClick={() => setSelected(option.id)}><span className="shop-copy commute-copy"><strong>{option.name}</strong><small>{option.risk}</small></span><span className="commute-meta"><b>{option.time} 分钟</b><span>¥{option.cost}</span></span></button>)}</div><button className="primary commute-confirm" disabled={!selected} onClick={() => selected && act({ type: 'CHOOSE_COMMUTE', choice: selected })}>{selectedName ? COPY.web.commute.confirm(selectedName) : COPY.web.commute.choosePrompt}</button></div></div>;
}

function OfficeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'office' }>>) {
  return <div className="page-layout outcome-page"><ScreenStateHeading time={currentTime(state)} icon="💼" status={COPY.web.office.success} /><div className="center-screen"><h2>{COPY.web.office.onTime(formatClock(state.arriveMin))}</h2>{state.commuteCancelled && <p>{COPY.web.office.expressCancelled}</p>}{state.subwayFailed && <p>{COPY.web.office.subwayFailed}</p>}{state.subwayMissedStop && <p>{COPY.web.office.subwayMissedStop}</p>}<p>{COPY.web.office.end(state.balance)}</p><button className="primary" onClick={() => act({ type: 'CONTINUE_TO_NEXT_DAY' })}>{COPY.web.office.next}</button></div></div>;
}

function BribeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'bribe' }>>) {
  return <div className="page-layout outcome-page danger"><ScreenStateHeading time={currentTime(state)} icon="⚠️" status={COPY.web.result.late} /><div className="center-screen"><h2>{COPY.web.bribe.title}</h2>{state.commuteCancelled && <p>{COPY.web.bribe.expressCancelled}</p>}{state.subwayFailed && <p>{COPY.web.bribe.subwayFailed}</p>}{state.subwayMissedStop && <p>{COPY.web.bribe.subwayMissedStop}</p>}<p>{COPY.web.bribe.body(config.BRIBE_COST)}</p><button className="primary danger-button" disabled={state.balance < config.BRIBE_COST} onClick={() => act({ type: 'CHOOSE_BRIBE' })}>{COPY.web.bribe.pay(config.BRIBE_COST)}</button><button className="secondary" onClick={() => act({ type: 'DECLINE_BRIBE' })}>{COPY.web.bribe.decline}</button></div></div>;
}
