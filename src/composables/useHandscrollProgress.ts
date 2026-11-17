/**
 * 长卷滚动引擎。
 *
 * 把「竖向滚动」换算成「开卷」与「平移」两段进度，再逐帧把结果写成舞台根节点上的
 * CSS 变量：--progress / --reveal / --pan / --roll-l / --roll-r / --paper-w / --tone
 * 以及六个主题色。几何与颜色全部交给 CSS，脚本只负责这一步换算。
 *
 * 为什么按像素算：开卷与平移的手感必须与视口高度无关地保持一致，用百分比硬拆
 * 会在不同屏幕上忽快忽慢（见 docs/handscroll-contract.md 第 6 节）。
 *
 * 为什么逐帧写 style 而不是 ref：这些值每帧都在变，一旦进入模板就会让整棵组件树
 * 重渲染。这里只有「当前章节」与「是否减少动态效果」两个离散状态用 ref。
 */

import {
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

import { themeAt, type Chapter } from '@/data/chapters'
import { paletteCssVars, type Palette } from '@/utils/color'
import { clamp, easeOutCubic, lerp } from '@/utils/math'

/** 平移距离 = 长条溢出宽度 × 该比例。小于 1，让横向平移比开卷稍缓。 */
const PAN_RATIO = 0.72

/** 开卷滚动距离 = 视口高度 × 该系数。 */
const UNROLL_RATIO = 0.8

/** 卷束粗细：合拢时为 1；全开后按 pan 在 [ROLL_FLOOR, ROLL_FLOOR + ROLL_RANGE] 间变化。 */
const ROLL_FLOOR = 0.12
const ROLL_RANGE = 0.85

/** 系统偏好：减少动态效果。开卷阶跃完成，只保留平移。 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * 开发辅助：URL 上带 ?p=0.5 时，直接以该进度渲染（不改变页面滚动位置）。
 *
 * 用途是截图 / 设计评审 / 对着稿子核对版面。之所以「直接改进度」而不是「滚到某处」：
 * 1) 不会和路由的 scrollBehavior 抢滚动位置；
 * 2) 无头浏览器截取滚动后的 sticky 画面时经常拿到未合成的空帧，直接渲染则稳定可截。
 */
const DEV_PROGRESS_PARAM = 'p'

/** 量不到视口高度（jsdom、display:none 等）时的兜底，避免除零。 */
const FALLBACK_VIEWPORT_HEIGHT = 800

/** 读取 ?p= 开发参数；没有、非法或非开发环境时返回 null。 */
function readDevProgress(): number | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get(DEV_PROGRESS_PARAM)
  if (raw === null) return null
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? clamp(value) : null
}

/** 舞台需要被脚本驱动的 DOM 锚点。 */
export interface HandscrollProbe {
  /** 舞台根节点：CSS 变量与跑道高度都写在这里 */
  root: Ref<HTMLElement | null>
  /** 画带：它的宽度就是绢面全开时的可视宽度（--paper-w 的来源） */
  band: Ref<HTMLElement | null>
  /** 横向长条：内容宽度决定平移行程 */
  strip: Ref<HTMLElement | null>
  /** sticky 视口：量高度用；不传则退回 window.innerHeight */
  stage?: Ref<HTMLElement | null>
}

export interface HandscrollProgress {
  /** 视口中心所在章节（离散状态，供章节提亮与刻度轨使用） */
  activeIndex: Readonly<Ref<number>>
  /** 系统是否偏好减少动态效果 */
  reducedMotion: Readonly<Ref<boolean>>
  /** 重新量取尺寸并立即写一帧 */
  measure: () => void
  /** 立即写一帧（会取消已排队的 rAF） */
  applyFrame: () => void
}

/** measure() 的产物。只在这里更新，applyFrame() 只读。 */
interface Metrics {
  viewportHeight: number
  paperWidth: number
  stripWidth: number
  originY: number
  unrollScroll: number
  panScroll: number
  panDistance: number
  totalScroll: number
  /** 每一章在长条上的归一化结束位置；量不到时为 null，退回按 span 估算 */
  chapterEdges: readonly number[] | null
}

/** 把数值裁到指定小数位再写进 style，避免 0.30000000000000004 这类长尾。 */
function formatNumber(value: number, digits = 4): string {
  const factor = 10 ** digits
  return String(Math.round(value * factor) / factor)
}

/**
 * 视口中心落在第几章。
 * 优先用 measure() 量到的真实像素边界；拿不到时退回按 span 估算（交界处归后一章）。
 */
function chapterIndexAt(
  focus: number,
  chapters: readonly Chapter[],
  edges: readonly number[] | null,
): number {
  const position = clamp(focus)

  // 优先用真实像素边界：小屏上章节有 640px 最小宽度，按 span 估算会偏。
  if (edges !== null && edges.length === chapters.length) {
    for (let index = 0; index < edges.length; index += 1) {
      const edge = edges[index]
      if (edge !== undefined && position < edge) return index
    }
    return Math.max(0, edges.length - 1)
  }

  const totalSpan = chapters.reduce((sum, chapter) => sum + chapter.span, 0)
  if (totalSpan <= 0) return 0

  const cursorTarget = position * totalSpan
  let cursor = 0
  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index]
    if (chapter === undefined) continue
    cursor += chapter.span
    if (cursorTarget < cursor) return index
  }
  return Math.max(0, chapters.length - 1)
}

/** 量每一章的真实宽度，换成归一化的结束边界；拿不到时返回 null。 */
function measureChapterEdges(
  stripEl: HTMLElement,
  expectedCount: number,
  stripWidth: number,
): number[] | null {
  if (expectedCount <= 0 || stripWidth <= 0) return null
  const children = Array.from(stripEl.children)
  if (children.length !== expectedCount) return null

  const widths: number[] = []
  let total = 0
  for (const child of children) {
    const width = child.getBoundingClientRect().width
    if (!(width > 0)) return null
    widths.push(width)
    total += width
  }
  if (total <= 0) return null

  // 用 stripWidth（与 focus 同一把尺）做分母，保证边缘章节也能被正确命中。
  const edges: number[] = []
  let cursor = 0
  for (const width of widths) {
    cursor += width
    edges.push(cursor / stripWidth)
  }
  return edges
}

/** 量视口高度：优先用 sticky 视口自身的高度，保证与跑道公式一致。 */
function resolveViewportHeight(stage: HTMLElement | null): number {
  const stageHeight = stage?.clientHeight ?? 0
  if (stageHeight > 0) return stageHeight

  const windowHeight = typeof window === 'undefined' ? 0 : window.innerHeight
  return windowHeight > 0 ? windowHeight : FALLBACK_VIEWPORT_HEIGHT
}

/** 能力判断：jsdom / 极旧浏览器可能没有 rAF，退回定时器。 */
function requestFrame(callback: () => void): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback)
  return setTimeout(callback, 16) as unknown as number
}

function cancelFrame(handle: number): void {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle)
    return
  }
  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>)
}

/**
 * 安装滚动引擎。
 *
 * 必须在组件 setup 中调用（内部使用 onMounted / onBeforeUnmount）。
 * 进度、卷束、主题色都是「写 CSS 变量」而不是返回值，模板只需要 activeIndex。
 */
export function useHandscrollProgress(
  probe: HandscrollProbe,
  chapters: MaybeRefOrGetter<readonly Chapter[]>,
): HandscrollProgress {
  const metrics: Metrics = {
    viewportHeight: 0,
    paperWidth: 0,
    stripWidth: 0,
    originY: 0,
    unrollScroll: 0,
    panScroll: 0,
    panDistance: 0,
    totalScroll: 0,
    chapterEdges: null,
  }

  const activeIndex = ref(0)

  const motionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(REDUCED_MOTION_QUERY)
      : null
  const reducedMotion = ref(motionQuery?.matches ?? false)

  /** 已写入根节点的主题色变量：值没变就跳过 setProperty，避免静止时白写。 */
  const writtenColors = new Map<string, string>()
  let frameHandle: number | null = null
  let observer: ResizeObserver | null = null

  /** 非空时忽略真实滚动，直接按这个进度渲染（仅 ?p= 开发参数）。 */
  const devProgress = readDevProgress()

  function writePalette(rootEl: HTMLElement, palette: Palette): void {
    for (const [name, value] of Object.entries(paletteCssVars(palette))) {
      if (writtenColors.get(name) === value) continue
      writtenColors.set(name, value)
      rootEl.style.setProperty(name, value)
    }
  }

  /** 一帧：只读 window.scrollY，尺寸全部来自上一次 measure()。 */
  function applyFrame(): void {
    frameHandle = null
    const rootEl = probe.root.value
    if (rootEl === null) return

    const scrollY = typeof window === 'undefined' ? 0 : window.scrollY || 0
    const travel =
      devProgress === null
        ? clamp(scrollY - metrics.originY, 0, metrics.totalScroll)
        : devProgress * metrics.totalScroll
    const progress = metrics.totalScroll > 0 ? clamp(travel / metrics.totalScroll) : 0

    const unrollRatio =
      metrics.unrollScroll > 0 ? clamp(travel / metrics.unrollScroll) : travel > 0 ? 1 : 0
    // 减少动态效果：开卷阶跃完成（合拢即全开），平移照旧。
    const reveal = reducedMotion.value ? (unrollRatio > 0 ? 1 : 0) : easeOutCubic(unrollRatio)

    const pan =
      metrics.panScroll > 0 ? clamp((travel - metrics.unrollScroll) / metrics.panScroll) : 0
    const rollLeft = lerp(1, ROLL_FLOOR + ROLL_RANGE * pan, reveal)
    const rollRight = lerp(1, ROLL_FLOOR + ROLL_RANGE * (1 - pan), reveal)

    // 视口中心在整卷中的归一化位置（contract §6）。
    const focus =
      metrics.stripWidth > 0
        ? clamp((pan * metrics.panDistance + metrics.paperWidth / 2) / metrics.stripWidth)
        : 0

    const list = toValue(chapters)
    const style = rootEl.style

    style.setProperty('--progress', formatNumber(progress))
    style.setProperty('--reveal', formatNumber(reveal))
    style.setProperty('--pan', formatNumber(pan))
    style.setProperty('--roll-l', formatNumber(rollLeft))
    style.setProperty('--roll-r', formatNumber(rollRight))

    if (list.length > 0) {
      const theme = themeAt(focus, list)
      style.setProperty('--tone', formatNumber(theme.tone, 3))
      // 主题色是连续变化的，静止时一帧都不必写（见 writePalette 的缓存）。
      writePalette(rootEl, theme.palette)

      const nextIndex = chapterIndexAt(focus, list, metrics.chapterEdges)
      if (nextIndex !== activeIndex.value) activeIndex.value = nextIndex
    }
  }

  /** 取消排队中的 rAF 并立刻写一帧（尺寸变化、?p= 渲染、reduce-motion 切换时用）。 */
  function runFrame(): void {
    if (frameHandle !== null) {
      cancelFrame(frameHandle)
      frameHandle = null
    }
    applyFrame()
  }

  function scheduleFrame(): void {
    if (frameHandle !== null) return
    frameHandle = requestFrame(() => {
      frameHandle = null
      applyFrame()
    })
  }

  /**
   * 量一次尺寸并立刻写一帧。
   * 只有这里会读布局：strip 的内容宽度、画带宽度、根节点的文档纵坐标、视口高度。
   */
  function measure(): void {
    const rootEl = probe.root.value
    if (rootEl === null) return

    const bandEl = probe.band.value
    const stripEl = probe.strip.value
    const stageEl = probe.stage?.value ?? null

    const viewportHeight = resolveViewportHeight(stageEl)
    // 画带宽度 = 绢面全开时的可视宽度：.handscroll__paper 铺满 .handscroll__sheet，
    // 而 sheet 全开时正好等于画带宽度。
    const paperWidth = bandEl ? bandEl.getBoundingClientRect().width : 0
    const stripWidth = stripEl
      ? Math.max(stripEl.scrollWidth, stripEl.getBoundingClientRect().width)
      : 0
    const scrollY = typeof window === 'undefined' ? 0 : window.scrollY || 0
    // 根节点在文档里的绝对纵坐标；之后每帧只读 scrollY，不再碰布局。
    const originY = rootEl.getBoundingClientRect().top + scrollY

    const unrollScroll = viewportHeight * UNROLL_RATIO
    const panDistance = Math.max(0, stripWidth - paperWidth)
    const panScroll = panDistance * PAN_RATIO
    const totalScroll = unrollScroll + panScroll

    metrics.viewportHeight = viewportHeight
    metrics.paperWidth = paperWidth
    metrics.stripWidth = stripWidth
    metrics.originY = originY
    metrics.unrollScroll = unrollScroll
    metrics.panScroll = panScroll
    metrics.panDistance = panDistance
    metrics.totalScroll = totalScroll
    metrics.chapterEdges = stripEl
      ? measureChapterEdges(stripEl, toValue(chapters).length, stripWidth)
      : null

    // 跑道高度 = 视口 + 开卷行程 + 平移行程（contract §6），脚本未执行时由 CSS 兜底。
    rootEl.style.height = `${Math.round(viewportHeight + totalScroll)}px`
    // 绢面宽度只在尺寸变化时变，放在这里写，逐帧的 applyFrame 不必重复。
    rootEl.style.setProperty('--paper-w', `${formatNumber(paperWidth, 2)}px`)

    // 首帧 / 尺寸变化后立刻校正一次，避免初始状态与滚动位置错位。
    runFrame()
  }

  function handleScroll(): void {
    scheduleFrame()
  }

  function handleResize(): void {
    measure()
  }

  function handleMotionChange(event: MediaQueryListEvent): void {
    reducedMotion.value = event.matches
    runFrame()
  }

  function setupObserver(): void {
    if (typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver(() => {
      measure()
    })
    observer = resizeObserver

    const bandEl = probe.band.value
    const stripEl = probe.strip.value
    const stageEl = probe.stage?.value ?? null
    if (bandEl !== null) resizeObserver.observe(bandEl)
    if (stripEl !== null) resizeObserver.observe(stripEl)
    // 视口高度变化（移动端地址栏收起、分屏拖动）不会触发 window.resize，
    // 但会改变 sticky 视口的高度，进而改变开卷行程，所以要一起观察。
    if (stageEl !== null) resizeObserver.observe(stageEl)
  }

  onMounted(() => {
    measure()

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleResize)
    }

    if (motionQuery !== null) {
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', handleMotionChange)
      } else if (typeof motionQuery.addListener === 'function') {
        // Safari 13 及更早版本只实现了已废弃的 addListener。
        motionQuery.addListener(handleMotionChange)
      }
    }

    setupObserver()
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }

    if (motionQuery !== null) {
      if (typeof motionQuery.removeEventListener === 'function') {
        motionQuery.removeEventListener('change', handleMotionChange)
      } else if (typeof motionQuery.removeListener === 'function') {
        motionQuery.removeListener(handleMotionChange)
      }
    }

    observer?.disconnect()
    observer = null

    if (frameHandle !== null) {
      cancelFrame(frameHandle)
      frameHandle = null
    }
  })

  return {
    activeIndex: readonly(activeIndex),
    reducedMotion: readonly(reducedMotion),
    measure,
    applyFrame: runFrame,
  }
}
