/**
 * 长卷的内容结构。
 *
 * 这一版只有骨架：没有文案、没有图片，只有「框」。
 * 每个 Chapter 描述一章在长卷里占多宽、用什么色温、以及版面上有哪些空框。
 * 之后补内容时，只需要往 frames 里填图/文，不需要动组件和滚动逻辑。
 */

import { mixPalette, type Palette } from '@/utils/color'
import { clamp, inverseLerp, lerp, smoothstep } from '@/utils/math'

/** 空框的类型决定视觉样式，不承载内容。 */
export type FrameKind =
  /** 主图框：大幅画面（区位图、台风路径、塘基剖面……） */
  | 'figure'
  /** 插图框：版面里的小幅配图 */
  | 'plate'
  /** 文字栏：画出竖排界格，等待灌入正文 */
  | 'text'
  /** 注记框：图注、出处、小字批注 */
  | 'note'
  /** 数据框：之后放指标卡 / 折线 / 柱状 */
  | 'data'

/**
 * 一个空框在章节画布中的位置，单位是该章画布的百分比。
 * 画布 = 章节宽度去掉左右留白后的区域，高度为整条画带。
 */
export interface FrameSpec {
  kind: FrameKind
  /** 左边界，0-100 */
  x: number
  /** 上边界，0-100 */
  y: number
  /** 宽度，0-100 */
  w: number
  /** 高度，0-100 */
  h: number
  /** 仅 text 使用：竖排界格的栏数。留空按面积自动推断。 */
  columns?: number
}

export interface Chapter {
  /** 稳定 id，用于 v-for key 与后续锚点 */
  id: string
  /** 卷上序号，用汉字大写，作为版面设计元素 */
  ordinal: string
  /** 本章在长卷中占的宽度（单位 vw），决定叙事节奏 */
  span: number
  /** 本章的色温：0 = 灾后灰蓝，1 = 桑基翠绿 */
  tone: number
  /** 本章中心处的主题色，滚动时在相邻章之间做 OKLab 插值 */
  palette: Palette
  /** 版面骨架 */
  frames: FrameSpec[]
}

/** 「灾后灰蓝」——卷首，风雨未至或刚过。 */
const STORM: Palette = {
  paper: '#c5cfd2',
  paperDeep: '#a3b0b6',
  wash: '#5d707b',
  ink: '#16232a',
  inkSoft: '#3f515a',
  line: '#6c7d84',
}

/** 更深一层的阴云：台风登陆时的压顶感。 */
const GALE: Palette = {
  paper: '#b6c1c7',
  paperDeep: '#8c9ca4',
  wash: '#46596a',
  ink: '#101c24',
  inkSoft: '#34474f',
  line: '#62737b',
}

/** 水浸：全卷最暗的一段，墨色压到最低。 */
const FLOOD: Palette = {
  paper: '#adbac1',
  paperDeep: '#84959d',
  wash: '#3d4f5c',
  ink: '#0d1920',
  inkSoft: '#2f424c',
  line: '#5d6e76',
}

/** 断链：冷暖之间的过渡带，灰蓝里透出一点青苔色。 */
const BREAK: Palette = {
  paper: '#bcc6bd',
  paperDeep: '#93a293',
  wash: '#52685c',
  ink: '#14231d',
  inkSoft: '#38483f',
  line: '#6a7a6b',
}

/** 桑基：桑叶绿开始占据画面。 */
const MULBERRY: Palette = {
  paper: '#cbd6b8',
  paperDeep: '#a3b18b',
  wash: '#4f6f45',
  ink: '#172413',
  inkSoft: '#3a4d2f',
  line: '#78895e',
}

/** 卷尾：桑基翠绿 + 暖绢，作为落款处的收束。 */
const COLOPHON: Palette = {
  paper: '#d7dcc0',
  paperDeep: '#b2bd93',
  wash: '#5a7a48',
  ink: '#1b2a15',
  inkSoft: '#405134',
  line: '#86966a',
}

export const chapters: readonly Chapter[] = [
  {
    id: 'opening',
    ordinal: '壹',
    span: 124,
    tone: 0,
    palette: STORM,
    frames: [
      { kind: 'figure', x: 4, y: 10, w: 46, h: 78 },
      { kind: 'text', x: 56, y: 12, w: 17, h: 46, columns: 3 },
      { kind: 'note', x: 77, y: 30, w: 17, h: 28 },
      { kind: 'data', x: 56, y: 62, w: 38, h: 14 },
    ],
  },
  {
    id: 'gale',
    ordinal: '贰',
    span: 154,
    tone: 0.04,
    palette: GALE,
    frames: [
      { kind: 'figure', x: 2, y: 8, w: 56, h: 80 },
      { kind: 'data', x: 62, y: 10, w: 32, h: 18 },
      { kind: 'text', x: 62, y: 34, w: 32, h: 44, columns: 5 },
      { kind: 'note', x: 62, y: 82, w: 32, h: 10 },
    ],
  },
  {
    id: 'flood',
    ordinal: '叁',
    span: 136,
    tone: 0.12,
    palette: FLOOD,
    frames: [
      { kind: 'figure', x: 4, y: 10, w: 40, h: 80 },
      { kind: 'text', x: 50, y: 12, w: 14, h: 58, columns: 2 },
      { kind: 'text', x: 66, y: 12, w: 14, h: 58, columns: 2 },
      { kind: 'data', x: 50, y: 76, w: 30, h: 14 },
      { kind: 'note', x: 82, y: 12, w: 12, h: 58 },
    ],
  },
  {
    id: 'break',
    ordinal: '肆',
    span: 148,
    tone: 0.38,
    palette: BREAK,
    frames: [
      { kind: 'figure', x: 4, y: 10, w: 56, h: 80 },
      { kind: 'text', x: 64, y: 12, w: 28, h: 28, columns: 4 },
      { kind: 'data', x: 64, y: 44, w: 28, h: 16 },
      { kind: 'note', x: 64, y: 66, w: 28, h: 24 },
    ],
  },
  {
    id: 'mulberry',
    ordinal: '伍',
    span: 154,
    tone: 0.72,
    palette: MULBERRY,
    frames: [
      { kind: 'figure', x: 2, y: 8, w: 42, h: 84 },
      { kind: 'text', x: 48, y: 10, w: 22, h: 34, columns: 4 },
      { kind: 'figure', x: 48, y: 50, w: 22, h: 42 },
      { kind: 'text', x: 74, y: 10, w: 20, h: 46, columns: 3 },
      { kind: 'data', x: 74, y: 62, w: 20, h: 30 },
    ],
  },
  {
    id: 'colophon',
    ordinal: '陸',
    span: 128,
    tone: 1,
    palette: COLOPHON,
    frames: [
      { kind: 'figure', x: 4, y: 12, w: 36, h: 76 },
      { kind: 'text', x: 46, y: 14, w: 24, h: 38, columns: 3 },
      { kind: 'note', x: 46, y: 58, w: 24, h: 28 },
      { kind: 'plate', x: 74, y: 14, w: 18, h: 34 },
      { kind: 'data', x: 74, y: 54, w: 18, h: 34 },
    ],
  },
]

/** 每章中心在整卷中的归一化位置（0 → 1），供色温插值使用。 */
export function chapterCenters(list: readonly Chapter[] = chapters): number[] {
  const total = list.reduce((sum, chapter) => sum + chapter.span, 0) || 1
  const centers: number[] = []
  let cursor = 0
  for (const chapter of list) {
    centers.push((cursor + chapter.span / 2) / total)
    cursor += chapter.span
  }
  return centers
}

export interface Theme {
  palette: Palette
  /** 0 = 灾后灰蓝，1 = 桑基翠绿 */
  tone: number
}

/**
 * 根据「当前视口中心在整卷中的位置」求主题色。
 *
 * focus ∈ [0, 1]，0 是卷首、1 是卷尾。相邻两章之间用 smoothstep 过渡，
 * 避免在章节交界处出现生硬的换色。
 */
export function themeAt(focus: number, list: readonly Chapter[] = chapters): Theme {
  const first = list[0]
  if (!first) throw new Error('长卷至少需要一章')
  const last = list[list.length - 1] ?? first

  const centers = chapterCenters(list)
  const position = clamp(focus)
  const firstCenter = centers[0] ?? 0

  if (position <= firstCenter) return { palette: first.palette, tone: first.tone }

  for (let i = 1; i < list.length; i += 1) {
    const center = centers[i]
    const previousCenter = centers[i - 1] ?? 0
    const chapter = list[i]
    const previous = list[i - 1]
    if (center === undefined || chapter === undefined || previous === undefined) break
    if (position > center) continue

    const t = smoothstep(inverseLerp(previousCenter, center, position))
    return {
      palette: mixPalette(previous.palette, chapter.palette, t),
      tone: lerp(previous.tone, chapter.tone, t),
    }
  }

  return { palette: last.palette, tone: last.tone }
}
