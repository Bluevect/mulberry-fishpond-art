/**
 * 长卷的「骨架参数」：每页占多宽、什么色温、用什么主题色。
 *
 * **这里不放内容。** 图、文字、弹窗说明都直接写在各自的页面组件里
 * （`components/handscroll/chapters/Chapter*.vue`），改哪一页就只改那个文件。
 *
 * 这些参数之所以留在这里，是因为滚动与配色要跨页计算：
 * 跑道长度、章节边界、色温插值都需要一张总表。
 */

import { mixPalette, type Palette } from '@/utils/color'
import { clamp, inverseLerp, lerp, smoothstep } from '@/utils/math'

/**
 * 一页的图（类型定义在这里，内容写在页面组件里）。
 *
 * 素材的来源与授权状态见 README「素材来源」一节（现有三张图带图库水印，仅供内部演示）。
 */
export interface MediaSpec {
  /**
   * 图的实际地址。页面组件里用 `assetUrl('/assets/xxx.jpg')` 生成：
   * 部署到 GitHub Pages 项目页时会自动补上 `/<repo>/` 前缀，不要写死 `/assets/...`。
   */
  src: string
  /** 标题：弹窗标题，同时作为按钮的无障碍名称 */
  title: string
  /** 弹窗正文：一两句话，跟着图走，不要写成长文 */
  description: string
  /** 照片用 cover 铺满（会裁切）；示意图用 contain，别裁掉标注 */
  fit?: 'cover' | 'contain'
  /** 裁切重心（CSS object-position），只对 cover 有意义 */
  position?: string
  /** 白底示意图用 multiply 融进绢面，去掉生硬的白底 */
  blend?: 'multiply'
}

export interface Chapter {
  /** 稳定 id，同时用来选版式组件（见 HandscrollStage 的分发表） */
  id: string
  /** 卷上序号，用汉字大写，作为版面设计元素 */
  ordinal: string
  /** 本章在长卷中占的宽度（单位 vw），决定叙事节奏 */
  span: number
  /** 本章的色温：0 = 灾后灰蓝，1 = 桑基翠绿 */
  tone: number
  /** 本章中心处的主题色，滚动时在相邻章之间做 OKLab 插值 */
  palette: Palette
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

/** 水浸：全卷最暗的一段，墨色压到最低。 */
const FLOOD: Palette = {
  paper: '#adbac1',
  paperDeep: '#84959d',
  wash: '#3d4f5c',
  ink: '#0d1920',
  inkSoft: '#2f424c',
  line: '#5d6e76',
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
  { id: 'opening', ordinal: '壹', span: 124, tone: 0, palette: STORM },
  { id: 'storm', ordinal: '贰', span: 140, tone: 0.12, palette: FLOOD },
  { id: 'cycle', ordinal: '叁', span: 150, tone: 0.72, palette: MULBERRY },
  { id: 'colophon', ordinal: '肆', span: 96, tone: 1, palette: COLOPHON },
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
