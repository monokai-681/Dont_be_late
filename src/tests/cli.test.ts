import { runCli, type CliIo } from '../cli';
import { COPY } from '../content/zh-CN';

function scriptedIo(answers: string[]): { io: CliIo; output: () => string } {
  const remaining = [...answers];
  const written: string[] = [];
  return {
    io: {
      question: async prompt => {
        written.push(prompt);
        const answer = remaining.shift();
        if (answer === undefined) throw new Error(`No scripted answer left for: ${prompt}`);
        return answer;
      },
      write: text => written.push(text),
    },
    output: () => written.join(''),
  };
}

describe('interactive CLI', () => {
  test('plays a complete reproducible game without creating Day 13', async () => {
    const answers = [''];
    const workDays = new Set([1, 2, 3, 4, 5, 8, 9, 10, 11, 12]);
    for (let day = 1; day <= 12; day += 1) {
      if (workDays.has(day)) {
        answers.push('0', '07:00', '1', '');
      } else {
        answers.push('0', '');
      }
    }
    const fixture = scriptedIo(answers);
    const result = await runCli(fixture.io, { rng: () => 0.999999 });

    expect(result.status).toBe('win');
    if (result.status !== 'win') return;
    expect(result.state.dayIndex).toBe(12);
    expect(result.state.dailyLog).toHaveLength(12);
    expect(fixture.output()).toContain('通关！');
    expect(fixture.output()).toContain('5%故障，额外15分钟');
    expect(fixture.output()).toContain('昨晚 00:45 入睡');
    expect(fixture.output()).not.toContain('Day 13');
  });

  test('reprompts an invalid alarm and supports declining the first bribe', async () => {
    const fixture = scriptedIo([
      '',
      '0',
      '06:59',
      '10:00',
      '1',
      'n',
    ]);
    const result = await runCli(fixture.io, { rng: () => 0.999999 });

    expect(result.status).toBe('lose');
    if (result.status !== 'lose') return;
    expect(result.reason).toBe('REFUSED_BRIBE');
    expect(fixture.output()).toContain('闹钟必须在 06:00～10:00 之间');
    expect(fixture.output()).toContain(COPY.loseReasons.REFUSED_BRIBE);
  });

  test('reports invalid shop input and a rejected unaffordable purchase', async () => {
    const fixture = scriptedIo([
      '',
      'x',
      '5',
      '0',
      '10:00',
      '1',
      'n',
    ]);
    const result = await runCli(fixture.io, { rng: () => 0.999999 });

    expect(result.status).toBe('lose');
    expect(fixture.output()).toContain('请输入 0～5');
    expect(fixture.output()).toContain('余额不足');
  });
});
