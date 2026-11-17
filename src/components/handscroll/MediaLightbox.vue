<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import type { MediaSpec } from '@/data/chapters'

/**
 * 图片说明弹窗。
 *
 * 刻意不用 <Teleport>：它挂在舞台根节点（.handscroll）下，
 * 那里没有 transform / filter 的祖先，position: fixed 依然相对视口；
 * 同时还能继承根节点上的主题色变量，弹窗会跟着当前章节一起冷暖变化。
 */
const props = defineProps<{ media: MediaSpec | null }>()

const emit = defineEmits<{
  close: []
}>()

const dialogEl = ref<HTMLElement | null>(null)
const closeEl = ref<HTMLButtonElement | null>(null)

const titleId = 'media-lightbox-title'

/** 打开前聚焦的元素：关闭后把焦点还回去，键盘用户不会迷路。 */
let returnFocusTo: HTMLElement | null = null

const imageStyle = computed(() => ({
  objectFit: props.media?.fit ?? 'contain',
  objectPosition: props.media?.position ?? 'center',
}))

function close(): void {
  emit('close')
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  // 弹窗里只有「关闭」一个可聚焦点，Tab 就地在弹窗与按钮之间循环。
  if (event.key === 'Tab') {
    event.preventDefault()
    if (document.activeElement === closeEl.value) dialogEl.value?.focus()
    else closeEl.value?.focus()
  }
}

watch(
  () => props.media,
  async (media) => {
    if (typeof window === 'undefined') return

    if (media !== null) {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      window.addEventListener('keydown', handleKeydown)
      await nextTick()
      closeEl.value?.focus()
      return
    }

    window.removeEventListener('keydown', handleKeydown)
    returnFocusTo?.focus()
    returnFocusTo = null
  },
  // 组件挂载时 media 可能已经有值（受控用法），所以立刻跑一次
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Transition name="lightbox">
    <!-- 点遮罩关闭；滚轮 / 触摸在弹窗打开时不透到长卷上 -->
    <div
      v-if="media"
      class="lightbox"
      role="presentation"
      @click.self="close"
      @wheel.prevent
      @touchmove.prevent
    >
      <div
        ref="dialogEl"
        class="lightbox__dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <button
          ref="closeEl"
          class="lightbox__close"
          type="button"
          aria-label="关闭说明"
          @click="close"
        >
          <span class="lightbox__close-mark" aria-hidden="true" />
        </button>

        <figure class="lightbox__figure">
          <img class="lightbox__img" :src="media.src" :alt="media.title" :style="imageStyle" />
        </figure>

        <div class="lightbox__copy">
          <h2 :id="titleId" class="lightbox__title">{{ media.title }}</h2>
          <p class="lightbox__text">{{ media.description }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---------------------------------------------------------------- 遮罩 */

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: clamp(14px, 3.4vw, 48px);
  background: color-mix(in oklab, var(--void) 86%, transparent);
  backdrop-filter: blur(3px);
}

/* ---------------------------------------------------------------- 弹窗 */

/*
 * 一张从卷上裁下来的画片：绢底、绫边、双线框，和长卷是同一套材料。
 * 图片在左、文字在右，窄屏改为上下。
 */
.lightbox__dialog {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: clamp(14px, 2.2vw, 32px);
  align-items: center;
  width: min(1040px, 100%);
  max-height: min(86vh, 780px);
  padding: clamp(14px, 1.8vw, 26px);
  overflow: auto;
  background:
    radial-gradient(
      120% 100% at 50% 0%,
      color-mix(in oklab, var(--paper) 92%, var(--silk)) 0%,
      var(--paper) 62%
    ),
    var(--paper);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--line) 70%, transparent),
    inset 0 0 0 6px color-mix(in oklab, var(--silk) 88%, transparent),
    inset 0 0 0 7px color-mix(in oklab, var(--line) 40%, transparent),
    0 28px 80px color-mix(in oklab, var(--void) 70%, transparent);
  outline: none;
}

/* 图片区：示意图用 contain 留边时，露出比绢面略深的底。 */
.lightbox__figure {
  display: grid;
  place-items: center;
  min-height: 0;
  margin: 0;
  background: color-mix(in oklab, var(--paper) 78%, var(--paper-deep));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--line) 52%, transparent);
}

.lightbox__img {
  display: block;
  width: 100%;
  max-height: min(62vh, 560px);
  height: auto;
  object-fit: contain;
}

/* ---------------------------------------------------------------- 文字 */

.lightbox__copy {
  min-width: 0;
}

.lightbox__title {
  position: relative;
  margin: 0 0 clamp(10px, 1.4vw, 18px);
  padding-bottom: 0.5em;
  font-family: var(--font-serif);
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink);
}

/* 标题下的一条朱砂细线 */
.lightbox__title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: clamp(28px, 6vw, 56px);
  height: 2px;
  background: var(--seal);
  opacity: 0.8;
}

.lightbox__text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(0.86rem, 1.05vw, 0.95rem);
  line-height: 2;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
  text-align: justify;
}

/* ---------------------------------------------------------------- 关闭 */

.lightbox__close {
  position: absolute;
  top: clamp(6px, 1vw, 12px);
  right: clamp(6px, 1vw, 12px);
  z-index: 2;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--seal);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--seal) 60%, transparent);
  cursor: pointer;
  opacity: 0.86;
  transition:
    opacity 200ms var(--ease-out-soft),
    transform 200ms var(--ease-out-soft);
}

.lightbox__close:hover,
.lightbox__close:focus-visible {
  opacity: 1;
  transform: rotate(90deg);
}

/* 用两条线画 ×，页面上不出现文字 */
.lightbox__close-mark {
  position: relative;
  width: 13px;
  height: 13px;
}

.lightbox__close-mark::before,
.lightbox__close-mark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: color-mix(in oklab, var(--paper) 92%, transparent);
}

.lightbox__close-mark::before {
  transform: rotate(45deg);
}

.lightbox__close-mark::after {
  transform: rotate(-45deg);
}

/* ---------------------------------------------------------------- 进出场 */

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 240ms var(--ease-out-soft);
}

.lightbox-enter-active .lightbox__dialog,
.lightbox-leave-active .lightbox__dialog {
  transition:
    transform 320ms var(--ease-out-soft),
    opacity 240ms var(--ease-out-soft);
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-from .lightbox__dialog,
.lightbox-leave-to .lightbox__dialog {
  transform: translateY(10px) scale(0.99);
  opacity: 0;
}

/* ---------------------------------------------------------------- 窄屏 */

@media (max-width: 720px) {
  .lightbox__dialog {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    max-height: 90vh;
  }

  .lightbox__img {
    max-height: 38vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox__close {
    transition: none;
  }
}
</style>
