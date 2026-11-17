<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 桑基鱼塘的循环图（canvas 手绘，不用图片）。
 *
 * 构图照着原来那张湖州模式图来：左边塘基上种桑、右边塘里养鱼、
 * 桑叶→蚕→蚕沙喂鱼、塘泥再运回基上肥桑。
 * 但**不画白底**：所有形状都用绢色与墨色半透明地画，像直接画在卷上。
 *
 * 交互：悬停亮起某一环，点画布或下方小签选中，底部给一句解释。
 * 粒子沿三条箭头流动；颜色每几帧从 CSS 变量读一次，跟着卷轴的冷暖变。
 */

interface CycleNode {
  key: string
  /** 小签上的字 */
  char: string
  /** 小字标签（给读屏） */
  label: string
  /** 画在画布上的标签字（比小签多一两个字） */
  labelText: string
  /** 标签位置（归一化坐标） */
  labelAt: { x: number; y: number }
  /** 选中时显示的解释 */
  caption: string
  /** 命中点（画布归一化坐标）——图画所在处 */
  anchor: { x: number; y: number }
  /** 命中半径，按画布短边的比例算 */
  hit: number
}

const NODES: readonly CycleNode[] = [
  {
    key: 'mulberry',
    char: '桑',
    label: '桑基',
    labelText: '桑',
    labelAt: { x: 0.16, y: 0.31 },
    caption: '桑基种桑：塘基上种桑，桑叶是蚕的饲料；基也是挡水的第一道土坡。',
    anchor: { x: 0.2, y: 0.52 },
    hit: 0.28,
  },
  {
    key: 'silkworm',
    char: '蚕',
    label: '养蚕',
    labelText: '蚕',
    labelAt: { x: 0.395, y: 0.09 },
    caption: '桑叶养蚕：岛上曾有蚕房，一季蚕就是一家人的现金。',
    anchor: { x: 0.395, y: 0.17 },
    hit: 0.2,
  },
  {
    key: 'fish',
    char: '鱼',
    label: '塘鱼',
    labelText: '鱼',
    labelAt: { x: 0.8, y: 0.6 },
    caption: '蚕沙喂鱼：蚕沙与青草下塘，喂草鱼与鲮鱼，塘水才活。',
    anchor: { x: 0.7, y: 0.68 },
    hit: 0.36,
  },
  {
    key: 'silt',
    char: '泥',
    label: '塘泥',
    labelText: '塘泥',
    labelAt: { x: 0.56, y: 0.89 },
    caption: '塘泥肥桑：塘泥起出来培到基上，桑长得旺，塘也清了。',
    anchor: { x: 0.47, y: 0.87 },
    hit: 0.2,
  },
]

/** 三条箭头：桑→蚕、蚕→鱼、泥→桑。坐标都是归一化的。 */
interface Flow {
  from: { x: number; y: number }
  control: { x: number; y: number }
  to: { x: number; y: number }
  /** 粒子跑完全程的时长系数 */
  speed: number
}

const FLOWS: readonly Flow[] = [
  {
    from: { x: 0.245, y: 0.48 },
    control: { x: 0.27, y: 0.24 },
    to: { x: 0.36, y: 0.19 },
    speed: 0.11,
  },
  {
    from: { x: 0.435, y: 0.22 },
    control: { x: 0.62, y: 0.26 },
    to: { x: 0.615, y: 0.5 },
    speed: 0.13,
  },
  {
    from: { x: 0.53, y: 0.8 },
    control: { x: 0.43, y: 0.9 },
    to: { x: 0.29, y: 0.72 },
    speed: 0.12,
  },
]

const DEFAULT_CAPTION = '桑叶养蚕、蚕沙喂鱼、塘泥肥桑：一条走了几百年的闭环。'

interface Palette {
  paper: string
  paperDeep: string
  wash: string
  ink: string
  inkSoft: string
  line: string
  seal: string
}

const FALLBACK_PALETTE: Palette = {
  paper: '#c5cfd2',
  paperDeep: '#a3b0b6',
  wash: '#5d707b',
  ink: '#16232a',
  inkSoft: '#3f515a',
  line: '#6c7d84',
  seal: '#a8342c',
}

const SERIF = '"Source Han Serif SC", "Noto Serif SC", "Songti SC", STSong, serif'

const rootEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const hoveredKey = ref<string | null>(null)
const selectedKey = ref<string | null>(null)

const caption = computed(() => {
  const key = hoveredKey.value ?? selectedKey.value
  return NODES.find((node) => node.key === key)?.caption ?? DEFAULT_CAPTION
})

const activeKey = computed(() => hoveredKey.value ?? selectedKey.value)

interface Metrics {
  width: number
  height: number
  /** 画布短边，用来缩放细节 */
  unit: number
}

let ctx: CanvasRenderingContext2D | null = null
let metrics: Metrics | null = null
let palette: Palette = FALLBACK_PALETTE
let frameCount = 0
let rafHandle: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let running = false
let reducedMotion = false

/** 从 CSS 变量读当前主题色（canvas 不会自己继承变量）。 */
function readPalette(element: Element): Palette {
  const style = window.getComputedStyle(element)
  const read = (name: string, fallback: string): string => {
    const value = style.getPropertyValue(name).trim()
    return value === '' ? fallback : value
  }
  return {
    paper: read('--paper', FALLBACK_PALETTE.paper),
    paperDeep: read('--paper-deep', FALLBACK_PALETTE.paperDeep),
    wash: read('--wash', FALLBACK_PALETTE.wash),
    ink: read('--ink', FALLBACK_PALETTE.ink),
    inkSoft: read('--ink-soft', FALLBACK_PALETTE.inkSoft),
    line: read('--line', FALLBACK_PALETTE.line),
    seal: read('--seal', FALLBACK_PALETTE.seal),
  }
}

function layout(): void {
  const canvas = canvasEl.value
  const root = rootEl.value
  if (!canvas || !root || !ctx) return

  const rect = root.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const dpr = Math.min(2, window.devicePixelRatio || 1)

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  metrics = { width, height, unit: Math.min(width, height) }
}

/** 归一化坐标 → 画布像素坐标。 */
function at(x: number, y: number): { x: number; y: number } {
  const m = metrics
  if (!m) return { x: 0, y: 0 }
  return { x: x * m.width, y: y * m.height }
}

/* ------------------------------------------------------------------ 静物 */

/** 塘基：左边一块土坡，从水里斜着升起来。 */
function drawDyke(): void {
  if (!ctx || !metrics) return
  const { width, height } = metrics
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(width * 0.01, height * 0.97)
  ctx.lineTo(width * 0.01, height * 0.74)
  ctx.bezierCurveTo(
    width * 0.1,
    height * 0.6,
    width * 0.22,
    height * 0.58,
    width * 0.33,
    height * 0.63,
  )
  ctx.bezierCurveTo(
    width * 0.41,
    height * 0.67,
    width * 0.43,
    height * 0.76,
    width * 0.4,
    height * 0.97,
  )
  ctx.closePath()
  ctx.globalAlpha = 0.34
  ctx.fillStyle = palette.paperDeep
  ctx.fill()
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1.2
  ctx.strokeStyle = palette.line
  ctx.stroke()
  ctx.restore()
}

/** 池塘：右边一片水面，几道波纹。 */
function drawPond(): void {
  if (!ctx || !metrics) return
  const { width, height } = metrics
  ctx.save()

  ctx.beginPath()
  ctx.ellipse(width * 0.7, height * 0.7, width * 0.3, height * 0.2, -0.03, 0, Math.PI * 2)
  ctx.globalAlpha = 0.2
  ctx.fillStyle = palette.wash
  ctx.fill()
  ctx.globalAlpha = 0.42
  ctx.lineWidth = 1.2
  ctx.strokeStyle = palette.line
  ctx.stroke()

  // 三道很淡的波纹
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 1
  ctx.strokeStyle = palette.line
  for (let i = 1; i <= 3; i += 1) {
    const rx = width * (0.3 - i * 0.055)
    const ry = height * (0.2 - i * 0.045)
    ctx.beginPath()
    ctx.ellipse(width * 0.7, height * 0.71, rx, ry, -0.03, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
  }
  ctx.restore()
}

/** 桑树：墨线树干 + 几团树冠。 */
function drawMulberry(treeX: number, baseY: number, scale: number): void {
  if (!ctx || !metrics) return
  const { width, height } = metrics
  const trunkTop = baseY - height * 0.11 * scale

  ctx.save()
  ctx.strokeStyle = palette.inkSoft
  ctx.globalAlpha = 0.55
  ctx.lineWidth = Math.max(1.4, 2.2 * scale)
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(treeX, baseY)
  ctx.lineTo(treeX, trunkTop)
  ctx.moveTo(treeX, trunkTop + height * 0.05 * scale)
  ctx.lineTo(treeX - width * 0.03 * scale, trunkTop + height * 0.01 * scale)
  ctx.moveTo(treeX, trunkTop + height * 0.05 * scale)
  ctx.lineTo(treeX + width * 0.03 * scale, trunkTop)
  ctx.stroke()

  const blobs = [
    { dx: 0, dy: 0, r: width * 0.05 * scale },
    { dx: -width * 0.037 * scale, dy: height * 0.022 * scale, r: width * 0.036 * scale },
    { dx: width * 0.037 * scale, dy: height * 0.022 * scale, r: width * 0.034 * scale },
  ]
  for (const blob of blobs) {
    ctx.globalAlpha = 0.22
    ctx.fillStyle = palette.wash
    ctx.beginPath()
    ctx.arc(treeX + blob.dx, trunkTop + blob.dy, blob.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.32
    ctx.strokeStyle = palette.line
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()
}

/** 鱼：几笔勾出的线鱼。 */
function drawFish(x: number, y: number, size: number, flip: boolean): void {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(flip ? -1 : 1, 1)
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = palette.inkSoft
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(0, 0, size, size * 0.42, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(size * 0.92, 0)
  ctx.lineTo(size * 1.5, -size * 0.4)
  ctx.lineTo(size * 1.5, size * 0.4)
  ctx.closePath()
  ctx.stroke()
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.arc(-size * 0.42, -size * 0.08, Math.max(0.8, size * 0.09), 0, Math.PI * 2)
  ctx.fillStyle = palette.inkSoft
  ctx.fill()
  ctx.restore()
}

/** 蚕：两枚小蚕身在桑叶上。 */
function drawSilkworm(): void {
  if (!ctx || !metrics) return
  const { width, height } = metrics
  const x = width * 0.395
  const y = height * 0.17

  ctx.save()
  // 底下的桑叶
  ctx.beginPath()
  ctx.ellipse(
    x - width * 0.02,
    y + height * 0.03,
    width * 0.05,
    height * 0.028,
    -0.25,
    0,
    Math.PI * 2,
  )
  ctx.globalAlpha = 0.2
  ctx.fillStyle = palette.wash
  ctx.fill()
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  ctx.strokeStyle = palette.line
  ctx.stroke()

  const worms = [
    { dx: 0, dy: 0, angle: -0.15 },
    { dx: width * 0.02, dy: height * 0.02, angle: 0.3 },
  ]
  for (const worm of worms) {
    ctx.beginPath()
    ctx.ellipse(x + worm.dx, y + worm.dy, width * 0.022, height * 0.011, worm.angle, 0, Math.PI * 2)
    ctx.globalAlpha = 0.75
    ctx.fillStyle = palette.paper
    ctx.fill()
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = palette.inkSoft
    ctx.lineWidth = 0.9
    ctx.stroke()
  }
  ctx.restore()
}

/** 塘泥：塘底挤出来的一团。 */
function drawSludge(): void {
  if (!ctx || !metrics) return
  const { width, height } = metrics
  const x = width * 0.47
  const y = height * 0.88

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(x, y, width * 0.05, height * 0.035, 0, 0, Math.PI * 2)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = palette.ink
  ctx.fill()
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = palette.inkSoft
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ 箭头 */

function quadPoint(flow: Flow, t: number): { x: number; y: number } {
  const a = at(flow.from.x, flow.from.y)
  const b = at(flow.control.x, flow.control.y)
  const c = at(flow.to.x, flow.to.y)
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  }
}

function drawFlows(time: number): void {
  // 在闭包里用局部引用，否则 TS 无法把模块级 ctx 收窄成非空
  const context = ctx
  if (!context) return

  FLOWS.forEach((flow, index) => {
    const fromNode = NODES[index]
    const toNode = NODES[(index + 1) % NODES.length]
    const highlighted = activeKey.value === fromNode?.key || activeKey.value === toNode?.key

    const start = quadPoint(flow, 0)
    const control = at(flow.control.x, flow.control.y)
    const end = quadPoint(flow, 1)

    context.save()
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.quadraticCurveTo(control.x, control.y, end.x, end.y)
    context.globalAlpha = highlighted ? 0.8 : 0.35
    context.lineWidth = highlighted ? 1.8 : 1.1
    context.strokeStyle = highlighted ? palette.seal : palette.line
    context.stroke()

    // 箭头
    const near = quadPoint(flow, 0.94)
    const angle = Math.atan2(end.y - near.y, end.x - near.x)
    const size = highlighted ? 7 : 5
    context.save()
    context.translate(end.x, end.y)
    context.rotate(angle)
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(-size, size * 0.5)
    context.lineTo(-size, -size * 0.5)
    context.closePath()
    context.globalAlpha = highlighted ? 0.9 : 0.45
    context.fillStyle = highlighted ? palette.seal : palette.line
    context.fill()
    context.restore()
    context.restore()

    // 粒子
    if (reducedMotion) return
    const particles = 3
    for (let p = 0; p < particles; p += 1) {
      const t = (time * flow.speed + p / particles) % 1
      const point = quadPoint(flow, t)
      context.save()
      context.beginPath()
      context.arc(point.x, point.y, highlighted ? 3.2 : 2.4, 0, Math.PI * 2)
      context.globalAlpha = highlighted ? 0.9 : 0.5
      context.fillStyle = palette.seal
      context.fill()
      context.restore()
    }
  })
}

/* ------------------------------------------------------------------ 文字 */

function drawLabels(): void {
  if (!ctx || !metrics) return
  const { unit } = metrics
  const fontSize = Math.max(12, Math.min(18, unit * 0.045))

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${fontSize}px ${SERIF}`

  for (const node of NODES) {
    const point = at(node.labelAt.x, node.labelAt.y)
    ctx.globalAlpha = 0.68
    ctx.fillStyle = palette.ink
    ctx.fillText(node.labelText, point.x, point.y)
  }

  ctx.restore()
}

/* ------------------------------------------------------------------ 渲染 */

function render(time: number): void {
  if (!ctx || !metrics) return
  frameCount += 1
  if (frameCount % 8 === 1) palette = readPalette(canvasEl.value ?? document.documentElement)

  const { width, height, unit } = metrics
  ctx.clearRect(0, 0, width, height)

  drawDyke()
  drawPond()
  drawMulberry(width * 0.15, height * 0.66, 1.15)
  drawMulberry(width * 0.28, height * 0.64, 0.95)
  drawSilkworm()
  drawFish(width * 0.63, height * 0.72, unit * 0.03, false)
  drawFish(width * 0.75, height * 0.76, unit * 0.024, true)
  drawFish(width * 0.67, height * 0.61, unit * 0.022, false)
  drawSludge()
  drawFlows(time)
  drawLabels()
}

function loop(now: number): void {
  if (!running) return
  render(now / 1000)
  rafHandle = window.requestAnimationFrame(loop)
}

function start(): void {
  if (running || !ctx) return
  if (reducedMotion) {
    render(0)
    return
  }
  running = true
  rafHandle = window.requestAnimationFrame(loop)
}

function stop(): void {
  running = false
  if (rafHandle !== null) {
    window.cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
}

/**
 * 把指针坐标换算成最近的一个环节：落在「图画」或「标签字」上都算。
 * 命中范围放大了一圈；实在落在空处时，兜底取半个短边内最近的环节，
 * 让整块画布都能触发箭头高亮。
 */
function nodeAtPoint(clientX: number, clientY: number): CycleNode | null {
  const canvas = canvasEl.value
  if (!canvas || !metrics) return null
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const unit = metrics.unit
  const labelSize = Math.max(12, Math.min(18, unit * 0.045))

  for (const node of NODES) {
    // 图画：一个够大的圆，盖住树 / 蚕 / 鱼群 / 塘泥
    const point = at(node.anchor.x, node.anchor.y)
    const radius = Math.max(34, unit * node.hit)
    if ((point.x - x) ** 2 + (point.y - y) ** 2 <= radius * radius) return node

    // 标签字：按字数估一个矩形（四周再留一点），悬停字也能触发
    const labelPoint = at(node.labelAt.x, node.labelAt.y)
    const halfWidth = (Array.from(node.labelText).length * labelSize) / 2 + 14
    const halfHeight = labelSize * 1.2
    if (Math.abs(x - labelPoint.x) <= halfWidth && Math.abs(y - labelPoint.y) <= halfHeight) {
      return node
    }
  }

  // 兜底：取最近的环节，但不超过半个短边，免得角落也乱亮
  let nearest: CycleNode | null = null
  let nearestDistance = unit * 0.5
  for (const node of NODES) {
    const point = at(node.anchor.x, node.anchor.y)
    const distance = Math.hypot(point.x - x, point.y - y)
    if (distance <= nearestDistance) {
      nearestDistance = distance
      nearest = node
    }
  }
  return nearest
}

function handlePointerMove(event: PointerEvent): void {
  const node = nodeAtPoint(event.clientX, event.clientY)
  hoveredKey.value = node?.key ?? null
  const canvas = canvasEl.value
  if (canvas) canvas.style.cursor = node ? 'pointer' : 'default'
}

function handlePointerLeave(): void {
  hoveredKey.value = null
}

function handleClick(event: MouseEvent): void {
  const node = nodeAtPoint(event.clientX, event.clientY)
  selectedKey.value = node && selectedKey.value !== node.key ? node.key : null
}

function selectNode(key: string): void {
  selectedKey.value = selectedKey.value === key ? null : key
}

onMounted(() => {
  const canvas = canvasEl.value
  const root = rootEl.value
  if (!canvas || !root) return

  ctx = canvas.getContext('2d')
  if (!ctx) return // jsdom 等环境没有 canvas 实现，直接不画

  reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  layout()
  palette = readPalette(canvas)
  render(0)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      layout()
      render(0)
    })
    resizeObserver.observe(root)
  }

  if (typeof IntersectionObserver !== 'undefined') {
    // 不在视口里就停掉动画，别在别的页面上白烧 CPU
    intersectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting)
      if (visible) start()
      else stop()
    })
    intersectionObserver.observe(root)
  } else {
    start()
  }
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  resizeObserver = null
  intersectionObserver?.disconnect()
  intersectionObserver = null
})
</script>

<template>
  <div ref="rootEl" class="cycle-canvas">
    <canvas
      ref="canvasEl"
      class="cycle-canvas__art"
      aria-hidden="true"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
      @click="handleClick"
    />

    <div class="cycle-canvas__chips" role="group" aria-label="选择循环环节">
      <button
        v-for="node in NODES"
        :key="node.key"
        class="cycle-canvas__chip"
        :class="{ 'cycle-canvas__chip--active': activeKey === node.key }"
        type="button"
        :aria-pressed="selectedKey === node.key"
        :aria-label="node.label"
        @click="selectNode(node.key)"
        @pointerenter="hoveredKey = node.key"
        @pointerleave="hoveredKey = null"
        @focus="hoveredKey = node.key"
        @blur="hoveredKey = null"
      >
        {{ node.char }}
      </button>
    </div>

    <p class="cycle-canvas__caption" aria-live="polite">{{ caption }}</p>
  </div>
</template>

<style scoped>
.cycle-canvas {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(8px, 1.2vh, 14px);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.cycle-canvas__art {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  display: block;
}

.cycle-canvas__chips {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.cycle-canvas__chip {
  width: 30px;
  height: 30px;
  padding: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1;
  color: color-mix(in oklab, var(--ink) 82%, var(--ink-soft));
  background: color-mix(in oklab, var(--paper) 88%, var(--silk));
  border: 1px solid color-mix(in oklab, var(--line) 52%, transparent);
  border-radius: 2px;
  cursor: pointer;
  opacity: 0.85;
  transition:
    opacity 200ms var(--ease-out-soft),
    color 200ms var(--ease-out-soft),
    border-color 200ms var(--ease-out-soft);
}

.cycle-canvas__chip:hover,
.cycle-canvas__chip:focus-visible {
  opacity: 1;
}

.cycle-canvas__chip--active {
  color: var(--paper);
  background: var(--seal);
  border-color: transparent;
  opacity: 1;
}

.cycle-canvas__caption {
  min-height: 2.6em;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(0.76rem, 0.95vw, 0.84rem);
  line-height: 1.9;
  letter-spacing: 0.02em;
  text-align: center;
  color: color-mix(in oklab, var(--ink) 86%, var(--ink-soft));
}

@media (prefers-reduced-motion: reduce) {
  .cycle-canvas__chip {
    transition: none;
  }
}
</style>
