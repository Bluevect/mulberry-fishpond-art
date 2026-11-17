/**
 * 与业务无关的数值工具。
 * 长卷的进度映射、缓动、卷束粗细都建立在这几个纯函数上。
 */

/** 把 value 夹在 [min, max] 区间内。 */
export function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** 线性插值：t = 0 返回 from，t = 1 返回 to。 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * inverseLerp 的反函数：把 value 从 [from, to] 映射到 [0, 1]。
 * from === to 时返回 0，避免除零。
 */
export function inverseLerp(from: number, to: number, value: number): number {
  if (from === to) return 0
  return (value - from) / (to - from)
}

/** 三次平滑（0 → 1 两端导数为 0），用于色温、透明度的柔和过渡。 */
export function smoothstep(t: number): number {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

/** 缓出：起手快、收尾慢。开卷动画使用这条曲线，像被手拉开。 */
export function easeOutCubic(t: number): number {
  return 1 - (1 - clamp(t)) ** 3
}

/** 缓入缓出：用于需要「两头都稳」的过渡。 */
export function easeInOutCubic(t: number): number {
  const x = clamp(t)
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2
}

/** 把 value 从 [inMin, inMax] 映射到 [outMin, outMax]，结果不夹紧。 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value))
}
