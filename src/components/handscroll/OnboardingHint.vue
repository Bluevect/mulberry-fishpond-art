<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 首次进入的阅读提示。
 *
 * 第一次打开时自动展开，说明「怎么读这卷」：向下滚动展开、点图看说明、右侧是读卷刻度。
 * 关掉之后不消失，而是收成左上角的一枚「说明」小图标，随时可以再点开。
 *
 * 记住是否看过：localStorage（隐私模式下读写会抛错，这里直接忽略，退化成每次都提示）。
 */

const STORAGE_KEY = 'mulberry-handscroll:onboarding-seen'

const props = withDefaults(
  defineProps<{
    /** 自动弹出的延迟（毫秒）：等开卷动画起手后再出现，别抢注意力 */
    openDelay?: number
  }>(),
  { openDelay: 900 },
)

const open = ref(false)
const panelEl = ref<HTMLElement | null>(null)
const buttonEl = ref<HTMLButtonElement | null>(null)

let timer: number | null = null
let returnFocusTo: HTMLElement | null = null

function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 隐私模式等场景忽略即可
  }
}

async function openPanel(): Promise<void> {
  if (open.value) return
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  open.value = true
  await Promise.resolve()
  panelEl.value?.focus()
}

function closePanel(): void {
  if (!open.value) return
  open.value = false
  markSeen()
  const target = returnFocusTo ?? buttonEl.value
  target?.focus?.()
  returnFocusTo = null
}

function toggle(): void {
  if (open.value) closePanel()
  else void openPanel()
}

onMounted(() => {
  if (hasSeen()) return
  timer = window.setTimeout(() => {
    timer = null
    void openPanel()
  }, props.openDelay)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearTimeout(timer)
})
</script>

<template>
  <div class="onboarding" :data-open="open">
    <!-- 收起来时的按钮：说明图标 -->
    <button
      ref="buttonEl"
      class="onboarding__button"
      type="button"
      aria-label="阅读说明"
      :aria-expanded="open"
      aria-controls="onboarding-panel"
      @click="toggle"
    >
      <svg class="onboarding__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4" />
        <circle cx="12" cy="7.7" r="1.05" fill="currentColor" />
        <path
          d="M12 10.6v6.1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <!-- 展开的说明卡：从图标位置长出来 -->
    <Transition name="hint">
      <div
        v-if="open"
        id="onboarding-panel"
        ref="panelEl"
        class="onboarding__panel"
        role="dialog"
        aria-labelledby="onboarding-title"
        tabindex="-1"
        @keydown.escape="closePanel"
      >
        <span class="onboarding__accent" aria-hidden="true" />
        <h2 id="onboarding-title" class="onboarding__title">如何读这卷</h2>

        <ul class="onboarding__list">
          <li class="onboarding__item">向下滚动，画卷会慢慢展开、向左推移。</li>
          <li class="onboarding__item">点画面里的图，弹出它的说明；按 <kbd>Esc</kbd> 关闭。</li>
          <li class="onboarding__item">右侧的刻度，是这一卷读到第几页。</li>
        </ul>

        <button class="onboarding__confirm" type="button" @click="closePanel">知道了</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.onboarding {
  position: fixed;
  top: clamp(12px, 2.6vh, 28px);
  left: clamp(12px, 2.6vw, 32px);
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  pointer-events: none;
}

/* ---------------------------------------------------------------- 图标按钮 */

.onboarding__button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  color: color-mix(in oklab, var(--ink) 82%, var(--ink-soft));
  background: color-mix(in oklab, var(--paper) 92%, var(--silk));
  border: 1px solid color-mix(in oklab, var(--line) 55%, transparent);
  border-radius: 2px;
  box-shadow: 0 2px 14px color-mix(in oklab, var(--ink) 22%, transparent);
  cursor: pointer;
  pointer-events: auto;
  opacity: 0.9;
  transition:
    opacity 200ms var(--ease-out-soft),
    box-shadow 200ms var(--ease-out-soft);
}

.onboarding__button:hover,
.onboarding__button:focus-visible {
  opacity: 1;
  box-shadow: 0 3px 20px color-mix(in oklab, var(--ink) 30%, transparent);
}

.onboarding__icon {
  width: 20px;
  height: 20px;
  display: block;
}

/* 展开时图标弱化，避免和面板标题打架 */
.onboarding[data-open='true'] .onboarding__button {
  opacity: 0.55;
}

/* ---------------------------------------------------------------- 说明卡 */

.onboarding__panel {
  position: relative;
  width: min(320px, calc(100vw - 32px));
  padding: clamp(14px, 2.2vh, 22px) clamp(14px, 1.8vw, 22px);
  background: color-mix(in oklab, var(--paper) 94%, var(--silk));
  border: 1px solid color-mix(in oklab, var(--line) 60%, transparent);
  box-shadow:
    inset 0 0 0 4px color-mix(in oklab, var(--paper) 96%, transparent),
    inset 0 0 0 5px color-mix(in oklab, var(--line) 24%, transparent),
    0 10px 36px color-mix(in oklab, var(--ink) 26%, transparent);
  font-family: var(--font-serif);
  color: color-mix(in oklab, var(--ink) 90%, var(--ink-soft));
  pointer-events: auto;
  transform-origin: top left;
  outline: none;
}

/* 题头：一道朱砂短线 */
.onboarding__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 44px;
  height: 3px;
  background: var(--seal);
  opacity: 0.85;
}

.onboarding__title {
  margin: 0 0 0.7em;
  font-size: clamp(0.95rem, 1.3vw, 1.05rem);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.onboarding__list {
  margin: 0 0 0.9em;
  padding: 0;
  list-style: none;
}

.onboarding__item {
  position: relative;
  margin: 0 0 0.45em;
  padding-left: 1.1em;
  font-size: clamp(0.78rem, 1vw, 0.86rem);
  line-height: 1.9;
  letter-spacing: 0.02em;
}

/* 行首的朱砂小点 */
.onboarding__item::before {
  content: '';
  position: absolute;
  top: 0.85em;
  left: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--seal);
  opacity: 0.75;
}

.onboarding__item kbd {
  padding: 0 0.3em;
  font-family: var(--font-serif);
  font-size: 0.92em;
  border: 1px solid color-mix(in oklab, var(--line) 60%, transparent);
  border-radius: 2px;
}

.onboarding__confirm {
  display: inline-block;
  padding: 0.45em 1.2em;
  font-family: var(--font-serif);
  font-size: clamp(0.78rem, 1vw, 0.86rem);
  letter-spacing: 0.12em;
  color: color-mix(in oklab, var(--paper) 94%, var(--silk));
  background: var(--seal);
  border: 0;
  border-radius: 2px;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 200ms var(--ease-out-soft);
}

.onboarding__confirm:hover,
.onboarding__confirm:focus-visible {
  opacity: 1;
}

/* ---------------------------------------------------------------- 进出场 */

.hint-enter-active,
.hint-leave-active {
  transition:
    opacity 220ms var(--ease-out-soft),
    transform 260ms var(--ease-out-soft);
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translate(-6px, -6px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .onboarding__button,
  .onboarding__confirm {
    transition: none;
  }

  .hint-enter-active,
  .hint-leave-active {
    transition: none;
  }
}
</style>
