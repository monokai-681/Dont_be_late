/**
 * 可复现随机数发生器 RNG
 * ---------------------------------------------------------------
 * 所有需要随机性的地方**必须通过参数注入 Rng 函数**，禁止直接调用 Math.random()。
 * 这样模拟器出了极端案例，同一个 seed 重跑就能精确复现，单元测试也完全确定。
 *
 * 算法：mulberry32（4 步 xorshift，周期 2^32，速度快质量够）
 * ---------------------------------------------------------------
 */

/** 返回 [0, 1) 的伪随机数，用法和 Math.random 一样 */
export type Rng = () => number;

/**
 * 从数字 seed 创建可复现 RNG。
 * 相同 seed → 相同随机序列。
 */
export function createRng(seed: number): Rng {
  // seed 压到 32 位无符号整数
  let s = (seed >>> 0) || 0xdeadbeef;
  return function rng(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 从任意字符串（比如玩家 id / 日期）生成 seed 再创建 RNG。
 * 用于后期的分享/排行榜功能（同样名字 = 同样的随机局）。
 */
export function createRngFromString(str: string): Rng {
  let hash = 2166136261 >>> 0; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return createRng(hash >>> 0);
}

/** 方便的工具：从 [min, max] 取整数（闭区间） */
export function rngInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('rngInt:min and max must be integers');
  }
  if (min > max) {
    throw new RangeError('rngInt:min must be less than or equal to max');
  }
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** 方便的工具：在 [0, arr.length) 里取一个索引；arr 为空抛错 */
export function rngPickIndex<T>(rng: Rng, arr: readonly T[]): number {
  if (arr.length === 0) throw new Error('rngPickIndex: empty array');
  return Math.floor(rng() * arr.length);
}
