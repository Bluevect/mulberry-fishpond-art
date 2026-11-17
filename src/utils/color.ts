/**
 * 色彩工具：在 OKLab 色彩空间里做插值。
 *
 * 为什么不用 sRGB 直接插？「灾后灰蓝 → 桑基翠绿」要穿过大量中间色，sRGB 线性插值
 * 会在中途发灰发脏；OKLab 的感知均匀性可以让蓝→绿沿着一条干净的路径过渡。
 */

/** 一套主题色。字段名与 CSS 变量一一对应（见 paletteCssVars）。 */
export interface Palette {
  /** 绢面主色 */
  paper: string
  /** 绢面暗部 / 装裱接缝 */
  paperDeep: string
  /** 大面积墨色氛围 */
  wash: string
  /** 主墨色 */
  ink: string
  /** 次级墨色 */
  inkSoft: string
  /** 框线 / 界格 */
  line: string
}

type Rgb = readonly [number, number, number]
type Oklab = readonly [number, number, number]

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** 解析 #abc / #aabbcc，返回 0-255 的 sRGB 三元组。 */
export function parseHex(input: string): Rgb {
  const match = HEX_PATTERN.exec(input.trim())
  const digits = match?.[1]
  if (!digits) throw new Error(`无法解析颜色值：${input}`)

  const full = digits.length === 3 ? [...digits].map((char) => char + char).join('') : digits

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ]
}

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value: number): number {
  const c = Math.min(1, Math.max(0, value))
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

/** sRGB(0-255) → OKLab。 */
export function rgbToOklab(rgb: Rgb): Oklab {
  const r = srgbToLinear(rgb[0])
  const g = srgbToLinear(rgb[1])
  const b = srgbToLinear(rgb[2])

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** OKLab → sRGB(0-255)，超出色域的分量直接夹紧。 */
export function oklabToRgb([L, A, B]: Oklab): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3

  const to255 = (value: number) => Math.round(linearToSrgb(value) * 255)

  return [
    to255(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    to255(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    to255(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** 解析结果缓存：滚动时每帧要对 6 个颜色做插值，避免重复解析字符串。 */
const labCache = new Map<string, Oklab>()

function toOklab(hex: string): Oklab {
  const cached = labCache.get(hex)
  if (cached) return cached
  const lab = rgbToOklab(parseHex(hex))
  labCache.set(hex, lab)
  return lab
}

/** 在 OKLab 空间把两个颜色按 t ∈ [0, 1] 混合。 */
export function mixOklab(from: string, to: string, t: number): string {
  if (t <= 0 || from === to) return from
  if (t >= 1) return to

  const a = toOklab(from)
  const b = toOklab(to)
  return toHex(
    oklabToRgb([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]),
  )
}

/** 逐字段混合两套主题色。 */
export function mixPalette(from: Palette, to: Palette, t: number): Palette {
  if (t <= 0) return from
  if (t >= 1) return to
  return {
    paper: mixOklab(from.paper, to.paper, t),
    paperDeep: mixOklab(from.paperDeep, to.paperDeep, t),
    wash: mixOklab(from.wash, to.wash, t),
    ink: mixOklab(from.ink, to.ink, t),
    inkSoft: mixOklab(from.inkSoft, to.inkSoft, t),
    line: mixOklab(from.line, to.line, t),
  }
}

/** 把主题色映射成可直接写入元素 style 的 CSS 变量表。 */
export function paletteCssVars(palette: Palette): Record<string, string> {
  return {
    '--paper': palette.paper,
    '--paper-deep': palette.paperDeep,
    '--wash': palette.wash,
    '--ink': palette.ink,
    '--ink-soft': palette.inkSoft,
    '--line': palette.line,
  }
}
