import { useEffect, useMemo, useState } from 'react';
import {
  ALARM_MIN,
  DEFAULT_BALANCE_CONFIG,
  createInitialState,
  createRngFromString,
  reducer,
  type Action,
  type ActiveGameState,
  type EventId,
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

const config = DEFAULT_BALANCE_CONFIG;

const TUTORIALS: Record<MechanicId, { title: string; body: string }> = {
  sleepDebt: { title: '你欠下了睡眠债', body: '睡得越少，睡眠债越高，第二天越可能多按几次 snooze。旧债每天会恢复一半。' },
  delivery: { title: '次日到货', body: '永久道具购买后进入配送，下一天开始时自动生效。' },
  dora: { title: 'DORA 当晚生效', body: '每颗降低今晚的入睡等待时间；每晚最多使用一颗。' },
  weather: { title: '下雪了', body: '地铁不受下雪影响；快车和专车会增加通勤时间。' },
  event: { title: '城市事件', body: '城市事件会拖慢快车和专车，地铁仍不受影响。' },
  bribe: { title: '主管给了一个选择', body: '支付 180 元可以让这次迟到不计入记录，但整局只有一次机会。' },
};

const SHOP: Array<{ id: ShopItemId; name: string; price: number; note: string }> = [
  { id: 'pillow', name: '枕头', price: config.SHOP_PRICE_PILLOW, note: '次日到货 · 缩短 SOL 6 分钟' },
  { id: 'eyeMask', name: '眼罩', price: config.SHOP_PRICE_EYE_MASK, note: '次日到货 · 缩短 SOL 4 分钟' },
  { id: 'earPlugs', name: '耳塞', price: config.SHOP_PRICE_EAR_PLUGS, note: '次日到货 · 缩短 SOL 3 分钟' },
  { id: 'dora', name: 'DORA', price: config.SHOP_PRICE_DORA_PER_PILL, note: '当晚入库 · 缩短 SOL 15 分钟' },
  { id: 'smartLamp', name: '智能台灯', price: config.SHOP_PRICE_SMART_LAMP, note: '次日到货 · snooze 期望 ×0.65' },
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
      <div><small>时间</small><strong>{WEEKDAYS[state.dayIndex]} · {currentTime(state)}</strong></div>
      <div><small>进度</small><strong>{progressText(state)}</strong></div>
      <div><small>睡眠债</small><strong>{Math.round(state.sleepDebt)} 分</strong></div>
      <div><small>余额</small><strong>¥{state.balance}</strong></div>
      <button className="icon-button" onClick={onRules} aria-label="打开规则手册">规则</button>
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
        <div className="modal-title"><h2 id="rules-title">规则手册</h2><button onClick={onClose}>关闭</button></div>
        <article><h3>打卡目标</h3><p>在 Day 1～12 中完成 10 个工作日打卡。超过 09:00 到达算迟到。</p></article>
        <article><h3>每天晚上</h3><p>查看预报、购买道具并设置 07:00～10:00 的闹钟。余额不能为负。</p></article>
        <article><h3>通勤</h3><p>地铁便宜且免疫灾害；快车便宜但可能取消；专车昂贵但不会取消。</p></article>
        {[...discovered].map(id => <article key={id}><h3>{TUTORIALS[id].title}</h3><p>{TUTORIALS[id].body}</p></article>)}
        {locked > 0 && <div className="locked-rules" aria-label={`${locked}项未发现机制`}><strong>▸ 尚有 {locked} 项机制未发现</strong><span>机制触发后会自动加入规则手册</span></div>}
        <footer className="tutorial-settings">
          <div><strong>教学与辅助</strong><p>教学提示每台设备只强制显示一次。</p></div>
          <button onClick={onResetTutorial}>重新显示教学提示</button>
        </footer>
      </section>
    </div>
  );
}

function TutorialCard({ id, onDismiss }: { id: MechanicId; onDismiss: () => void }) {
  return (
    <aside className="tutorial-card" role="status">
      <span>新机制</span><h3>{TUTORIALS[id].title}</h3><p>{TUTORIALS[id].body}</p>
      <button onClick={onDismiss}>知道了</button>
    </aside>
  );
}

function eventLabel(event: EventId): string {
  if (event === 'concert') return '演唱会散场';
  if (event === 'expo') return '漫展散场';
  if (event === 'marathon') return '马拉松封路';
  if (event === 'holidayRush') return '节前高峰';
  return '无城市事件';
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
      const text: Record<string, string> = {
        INSUFFICIENT_FUNDS: '余额不足。', ALREADY_OWNED: '已经拥有。', ALREADY_PENDING: '正在配送中。',
        INVALID_ALARM: '请选择 07:00～10:00、5 分钟步长的闹钟。', NO_DORA: '没有 DORA。', DORA_ALREADY_USED: '今晚已经用过。',
      };
      setMessage(text[next.reason] ?? '现在不能这样做。');
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
      <p className="eyebrow">年末 · 十个工作日</p><h1>别迟到</h1>
      <p>每天晚上做准备，早晨选通勤，在 09:00 前赶到公司。规则会在第一次遇到时逐步说明。</p>
      <button className="primary" onClick={() => act({ type: 'START_GAME' })}>开始第一晚</button>
      <button className="secondary" onClick={() => setRulesOpen(true)}>规则手册</button>
      <small>本局 seed：{seed}</small>
    </section>{rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage('教学提示已重置。'); }} />}</main>;
  }

  if (result.status === 'win' || result.status === 'lose') {
    return <main className="result-shell"><section className="result-card">
      <ArtPlaceholder location="结算场景" purpose="根据通关或失败表现最终情绪" ratio="16:9" />
      <p className="eyebrow">{result.status === 'win' ? '成功打卡 10 / 10' : `止步 Day ${state.dayIndex}`}</p>
      <h1>{result.status === 'win' ? '你没有迟到。' : '这次没赶上。'}</h1>
      <p>最终余额 <strong>¥{state.balance}</strong></p>
      <div className="day-log">{state.dailyLog.map(record => <div key={record.day}><strong>Day {record.day}</strong><span>{record.isWorkDay ? `${record.arriveHHMM ?? '—'} · ${record.isLate ? '迟到' : '准时'}` : '周末恢复'}</span><span>¥{record.balanceAfter}</span></div>)}</div>
      <button className="primary" onClick={restart}>再来一局</button>
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
    {rulesOpen && <RulesDialog discovered={discovered} onClose={() => setRulesOpen(false)} onResetTutorial={() => { resetTutorialSeen(); setTutorialSeen(new Set()); setMessage('教学提示已重置；再次遇到机制时会重新显示。'); }} />}
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
    <div className="screen-heading"><div><p className="eyebrow">Day {state.dayIndex} · {state.isWorkDay ? '睡前准备' : '周末'}</p><h2>{state.isWorkDay ? '明早别迟到。' : '今晚可以放心睡。'}</h2></div><div className="forecast"><span>{state.weatherToday === 'snow' ? '❄ 下雪' : '○ 无雪'}</span><span>{eventLabel(state.eventToday)}</span></div></div>
    <ArtPlaceholder location="卧室夜景" purpose="承载睡前、商店和闹钟设置的主场景" />
    <h3>商店</h3><div className="shop-grid">{SHOP.map(item => <button key={item.id} className="shop-item" disabled={permanentOwned(item.id) || pending(item.id)} onClick={() => act({ type: 'BUY_ITEM', itemId: item.id })}><strong>{item.name}<span>¥{item.price}</span></strong><small>{permanentOwned(item.id) ? '已拥有' : pending(item.id) ? '配送中' : item.note}</small></button>)}</div>
    {state.isWorkDay ? <div className="alarm-panel"><label htmlFor="alarm">闹钟 <strong>{formatClock(alarm)}</strong></label><input id="alarm" type="range" min="420" max="600" step="5" value={alarm} onChange={event => setAlarm(Number(event.target.value))} />
      {state.inventory.dora > 0 && !state.doraUsedTonight && <button className="secondary" onClick={() => act({ type: 'USE_DORA_TONIGHT' })}>使用 DORA（剩余 {state.inventory.dora}）</button>}
      <button className="primary" onClick={() => act([
        { type: 'SET_ALARM', alarmMin: alarm },
        { type: 'START_SLEEP' },
      ])}>睡觉</button></div>
      : <button className="primary" onClick={() => act({ type: 'PASS_WEEKEND' })}>好好休息</button>}
  </>;
}

function SleepingScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'sleeping' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="睡眠过渡" purpose="表现时间流逝、入睡等待与夜色变化" ratio="16:9" /><p className="eyebrow">SOL {state.solTonight} 分钟</p><h2>闹钟将在 {formatClock(state.alarmMin)} 响起</h2><p>实际睡眠 {Math.floor(state.actualSleepMin / 60)} 小时 {state.actualSleepMin % 60} 分钟</p><button className="primary" onClick={() => act({ type: 'WAKE_UP' })}>闹钟响了</button></div>;
}

function WakeupScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'wakeup' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="起床 / 闹钟" purpose="表现 snooze 次数和清晨状态" /><p className="eyebrow">现在 {currentTime(state)}</p><h2>你按了 {state.snoozeCount} 次 snooze</h2><div className="metric-row"><div><small>睡眠债</small><strong>{Math.round(state.sleepDebt)} 分</strong></div><div><small>晨间流程</small><strong>{state.routineMin} 分</strong></div><div><small>预计出门</small><strong>{formatClock(state.alarmMin + state.routineMin)}</strong></div></div><button className="primary" onClick={() => act({ type: 'CONTINUE_TO_COMMUTE' })}>准备出门</button></div>;
}

function CommuteScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'commute' }>>) {
  const options = [
    { id: 'subway' as const, name: '地铁', cost: config.COMMUTE_SUBWAY_COST, time: config.COMMUTE_SUBWAY_MIN, risk: '免疫天气和事件' },
    { id: 'express' as const, name: '快车', cost: config.COMMUTE_EXPRESS_COST, time: config.COMMUTE_EXPRESS_MIN, risk: '30% 取消；灾害会加时' },
    { id: 'premium' as const, name: '专车', cost: config.COMMUTE_PREMIUM_COST, time: config.COMMUTE_PREMIUM_MIN, risk: '不取消；灾害仍会加时' },
  ];
  return <><div className="screen-heading"><div><p className="eyebrow">出门 · {currentTime(state)}</p><h2>选择通勤方式</h2></div><div className="deadline">09:00<br/><small>打卡截止</small></div></div><ArtPlaceholder location="城市通勤" purpose="根据天气与所选交通方式展示通勤场景" ratio="16:9" /><div className="commute-grid">{options.map(option => <button key={option.id} disabled={state.balance < option.cost} onClick={() => act({ type: 'CHOOSE_COMMUTE', choice: option.id })}><strong>{option.name}<span>¥{option.cost}</span></strong><b>{option.time} 分钟</b><small>{option.risk}</small></button>)}</div></>;
}

function OfficeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'office' }>>) {
  return <div className="center-screen"><ArtPlaceholder location="公司打卡机" purpose="展示到达公司、打卡结果和当日结算" /><p className="eyebrow">打卡成功</p><h2>{formatClock(state.arriveMin)} · 准时</h2>{state.commuteCancelled && <p>快车取消过一次，重新叫车后到达。</p>}<p>今日结束，余额 ¥{state.balance}</p><button className="primary" onClick={() => act({ type: 'CONTINUE_TO_NEXT_DAY' })}>进入下一天</button></div>;
}

function BribeScreen({ state, act }: ScreenProps<Extract<ActiveGameState, { phase: 'bribe' }>>) {
  return <div className="center-screen danger"><ArtPlaceholder location="主管办公室" purpose="首次迟到时揭示补救机制；形成意外与压力" /><p className="eyebrow">迟到 · {formatClock(state.arriveMin)}</p><h2>主管把你叫到一边。</h2><p>支付 ¥{config.BRIBE_COST}，这次迟到可以不计入记录。整局只有一次机会。</p><button className="primary danger-button" disabled={state.balance < config.BRIBE_COST} onClick={() => act({ type: 'CHOOSE_BRIBE' })}>支付 ¥{config.BRIBE_COST}</button><button className="secondary" onClick={() => act({ type: 'DECLINE_BRIBE' })}>拒绝</button></div>;
}
