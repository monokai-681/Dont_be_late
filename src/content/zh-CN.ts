/**
 * 玩家可见的简体中文文案唯一来源。
 *
 * Web 与 CLI 都从这里读取共享的规则、物品、事件和失败文案；修改文字时优先改这里，
 * 不要为了改文案而进入 engine。带参数的条目使用函数，保证数值仍由运行时配置提供。
 */

import type { ActionRejectedReason, EventId, LoseReason, ShopItemId } from '../engine';
import type { MechanicId } from '../web/model';

const itemNames: Record<Exclude<ShopItemId, 'dora'>, string> & { dora: string } = {
  pillow: '深睡枕头',
  eyeMask: '遮光眼罩',
  earPlugs: '耳塞',
  dora: 'DORA',
  smartLamp: '智能台灯',
};

const eventNames: Record<Exclude<EventId, null>, string> = {
  concert: '演唱会封路',
  expo: '漫展开幕',
  marathon: '马拉松封路',
  holidayRush: '节前高峰',
};

const rejected: Record<ActionRejectedReason, string> = {
  INVALID_ALARM: '请选择 06:00～10:00、5 分钟步长的闹钟。',
  ALARM_NOT_SET: '请先设置闹钟。',
  INSUFFICIENT_FUNDS: '余额不足。',
  ALREADY_OWNED: '已经拥有。',
  ALREADY_PENDING: '正在配送中。',
  INVALID_QUANTITY: '购买数量无效。',
  NO_DORA: '没有 DORA。',
  DORA_ALREADY_USED: '今晚已经吃过。',
};

const loseReasons: Record<LoseReason, string> = {
  CANNOT_AFFORD_BRIBE: '你迟到了，这下真的被公司开除了……',
  REFUSED_BRIBE: '你拒绝了贿赂行为！一生正气！佩服！',
  SECOND_LATE: '已经第二次迟到了……',
  CANNOT_AFFORD_COMMUTE: '穷得叮当响，甚至没钱坐地铁了……',
};

export const COPY = {
  items: itemNames,
  events: {
    name: (event: EventId, empty = '交通正常') => event === null ? empty : eventNames[event],
  },
  rejected,
  loseReasons,
  tutorials: {
    sleepDebt: { title: '你欠下了睡债', body: '你没睡够 8 小时，欠下了睡债。', points: ['睡债会导致更多的贪睡。', '旧睡债每日衰减 50%。'] },
    delivery: { title: '次日到货', body: '永久道具购买后进入配送，下一天开始时自动生效。' },
    dora: { title: 'DORA 当晚生效', body: '每颗降低今晚的入睡等待时间；每晚最多使用一颗。' },
    weather: { title: '下雪了', body: '地铁不受下雪影响；快车和专车会增加通勤时间。' },
    event: { title: '交通受阻', body: '交通受阻会拖慢快车和专车，地铁仍不受影响。' },
    bribe: { title: '可以贿赂主管', body: '支付 180 元可以让这次迟到不计入记录，但再迟到就不行了哦。' },
  } satisfies Record<MechanicId, { title: string; body: string; points?: readonly string[] }>,
  shop: {
    pillow: '次日到货；小幅缩短入睡时间',
    eyeMask: '次日到货；小幅缩短入睡时间',
    earPlugs: '次日到货；小幅缩短入睡时间',
    doraDelivery: '立即配送',
    dora: '缩短入睡时间',
    smartLamp: '次日到货；降低贪睡次数约1/3',
  },
  web: {
    fallbackRejected: '现在不能这样做。',
    tutorialReset: '教学提示已重置。',
    tutorialResetInGame: '教学提示已重置；再次遇到机制时会重新显示。',
    status: { debt: '睡债', balance: '余额', rules: '规则', rulesAria: '打开规则手册' },
    tutorialCard: { eyebrow: '新机制', dismiss: '知道了' },
    rules: {
      title: '规则手册', close: '关闭', goalTitle: '打卡目标',
      goalBody: '在 Day 1～12 中完成 10 个工作日打卡。超过 09:00 到达算迟到。',
      nightTitle: '每天晚上', nightBody: '查看预报、购买道具并设置 06:00～10:00 的闹钟。余额不能为负。',
      commuteTitle: '通勤', commuteBody: '地铁便宜并免疫天气和交通状况，但睡债太高时可能坐过站。快车便宜但可能取消；专车昂贵但不会取消。',
      locked: (count: number) => `▸ 尚有 ${count} 项机制未发现`,
      lockedAria: (count: number) => `${count}项未发现机制`, lockedBody: '机制触发后会自动加入规则手册',
      supportTitle: '教学与辅助', supportBody: '教学提示每台设备只强制显示一次。', reset: '重新显示教学提示',
    },
    intro: {
      eyebrow: '不能再迟到了！', title: '别迟到',
      body: '你是公司的「迟到大王」。本年度你已经迟到 19 次，再迟到一次就要被开除了！',
      objective: '本年度还剩最后两周，10 个工作日。你需要：',
      rules: [
        '每个工作日 0:00 购买助眠物品，设置闹钟时间。',
        '每个工作日早上根据通勤条件选择通勤方式，在 09:00 之前赶到公司，避免迟到。',
        '每天睡不够 8 小时会产生「睡债」。「睡债」会增加赖床时间，触发相关通勤事件。',
      ],
      closing: '撑过年度最后 10 个工作日吧！', start: '开始第一晚', rulesLabel: '规则手册', seed: (seed: string) => `本局 seed：${seed}`,
    },
    result: { winEyebrow: '成功打卡 10 / 10', lossEyebrow: (day: number) => `止步 Day ${day}`, totalDebt: (minutes: number) => `总睡债 ${minutes} 分钟`, winTitle: '你没有迟到。', lossTitle: '迟到了。', balance: '最终余额', restart: '再来一局', copyTelemetry: '复制调试 JSON', telemetryCopied: '调试 JSON 已复制，可直接发送给开发者。', telemetryCopyFailed: '复制失败，请使用支持剪贴板权限的浏览器。', onTime: '准时', late: '迟到', weekend: '周末补觉' },
    bedtime: {
      workday: '睡前准备', conditionsTitle: '明早通勤条件',
      subtitle: (weekday: string, time: string) => `现在是${weekday}凌晨${time}，准备入睡。`,
      forecastWeather: '天气', forecastEvent: '交通', snow: '❄ 下雪', clear: '☀ 晴朗',
      shop: '商店', shopHint: '点击加入；再次点击取消', owned: '已拥有', pending: '配送中', selected: '已加入购物车',
      cart: '🛒 购物车', cartTotal: '合计', cartEstimatedBalance: (balance: number) => `确认后预计余额：¥${balance}`,
      cartOverBudget: '余额不足，请移除部分商品。',
      removeFromCart: (name: string) => `从购物车移除${name}`, confirmCart: (total: number) => `确认购买 · ¥${total}`,
      resolveCart: '请先确认或取消购物车。', alarm: '闹钟', firstAlarmAdviceTitle: '💡 第一次玩？', firstAlarmAdviceBody: '建议先设为 07:15。早上优先选择地铁；即使贪睡两次，仍可在 08:58 到达。', firstAlarmAdviceDismiss: '知道了', useDora: (count: number) => `使用 DORA（剩余 ${count}）`, sleep: '睡觉', rest: '好好休息',
    },
    sleeping: { alarm: (time: string) => `闹钟将在 ${time} 响起`, sleepSummary: (start: string, hours: number, minutes: number) => `你在 ${start} 入睡，实际睡了 ${hours} 小时 ${minutes} 分钟`, wake: '闹钟响了' },
    wakeup: { now: '现在', snooze: (count: number) => `你按了 ${count} 次 snooze`, debt: '睡债', routine: '晨间流程', leaveAt: '预计出门', continue: '准备出门' },
    commute: {
      title: '准备出门', now: '现在', deadline: '距离打卡还剩',
      minutesToDeadline: (minutes: number) => minutes >= 0 ? `${minutes} 分钟` : `超时 ${-minutes} 分钟`,
      conditionsTitle: '今日通勤条件', morningSummary: '今早情况',
      sleepSummary: (sleepAt: string, duration: string, alarm: string) => `你昨晚 ${sleepAt} 入睡，共睡了 ${duration}，闹钟在 ${alarm} 响起。`,
      debtSummary: (newDebt: number, totalDebt: number) => `今日新增睡债 ${newDebt} 分钟，睡债目前共计 ${totalDebt} 分钟。`,
      snoozeSummary: (count: number, minutes: number) => count === 0 ? '你没有按贪睡，直接起床。' : `你按了 ${count} 次贪睡，共贪睡 ${minutes} 分钟。贪睡时间不计入睡眠时间。`,
      routineSummary: (minutes: number) => `起床后，穿衣、洗漱、化妆共计 ${minutes} 分钟。`,
      subway: '地铁', express: '快车', premium: '专车',
      subwayRisk: '免疫天气交通；高睡债可能坐过站', expressRisk: '小心快车司机取消订单', premiumRisk: '专车不会取消订单',
      choosePrompt: '选择一种通勤方式', confirm: (name: string) => `确认乘坐${name}`,
    },
    office: { success: '打卡成功', onTime: (time: string) => `${time} · 准时`, expressCancelled: '快车被取消一次，重新叫车后到达。', subwayFailed: '地铁发生信号故障，额外耽误了 15 分钟。', subwayMissedStop: '你因太困在地铁上睡着坐过站了，用时增加了 20 分钟。', end: (balance: number) => `今日结束，余额 ¥${balance}`, next: '进入下一天' },
    bribe: { title: '主管把你叫到一边。', expressCancelled: '快车取消过一次，重新叫车后仍然迟到了。', subwayFailed: '地铁发生信号故障，额外耽误了 15 分钟。', subwayMissedStop: '你因太困在地铁上睡着坐过站了，用时增加了 20 分钟。', body: (cost: number) => `你懂什么意思，用 ¥${cost} 贿赂主管，这次迟到可以不计入记录，下不为例。`, pay: (cost: number) => `支付 ¥${cost}`, decline: '拒绝' },
  },
  cli: {
    title: '《别迟到》—— 连续完成 10 个工作日的打卡。', start: '按回车开始：',
    rejected: {
      INVALID_ALARM: '闹钟必须在 06:00～10:00 之间，并以 5 分钟为步长。',
      ALARM_NOT_SET: '请先设置闹钟。',
      INSUFFICIENT_FUNDS: '余额不足。',
      ALREADY_OWNED: '这个永久道具已经拥有。',
      ALREADY_PENDING: '这个永久道具已经在配送中。',
      INVALID_QUANTITY: '购买数量无效。',
      NO_DORA: '库存中没有 DORA。',
      DORA_ALREADY_USED: '今晚已经使用过 DORA。',
    } satisfies Record<ActionRejectedReason, string>,
    eventEmpty: '交通正常', clear: '晴朗', snow: '下雪',
    shopPrompt: '购买：', invalidShop: '请输入 0～5。', alarmPrompt: '设置闹钟（06:00～10:00，5分钟步长）：',
    commutePrompt: '选择通勤：', invalidCommute: '请输入 1、2 或 3。',
    restPrompt: '今天不用打卡。按回车好好休息：', doraPrompt: '今晚使用一颗 DORA？(y/N)：',
    nextDay: '按回车进入下一天：', expressCancelled: '快车被取消过一次，重新叫车成功。',
    subwayFailed: (minutes: number) => `地铁发生信号故障，额外耽误了 ${minutes} 分钟。`,
    subwayMissedStop: (minutes: number) => `你因太困在地铁上睡着坐过站了，用时增加了 ${minutes} 分钟。`,
    sleepSummary: (start: string, hours: number, minutes: number, debt: number, snoozes: number) => `昨晚 ${start} 入睡，睡了 ${hours}小时${minutes}分；睡债 ${debt.toFixed(1)}；snooze ${snoozes} 次。`,
  },
} as const;
