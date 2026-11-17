<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import type { Chapter } from '@/data/chapters'

/**
 * 一页长卷的外壳：宽度、色温、序号水印。
 *
 * 里面留一个空槽——每一页的排版由各自的版式组件决定，
 * 这层只负责所有页都必须一致的「卷」的骨架。
 */
const props = defineProps<{
  chapter: Chapter
  index: number
  active?: boolean
}>()

/** 章节宽度交给 CSS：--chapter-span 是叙事节奏的唯一来源。 */
const chapterStyle = computed<CSSProperties>(() => ({
  '--chapter-span': `${props.chapter.span}`,
}))

/** 序号左右交替，避免六页排下来形成呆板的单侧水印。 */
const ordinalOnLeft = computed(() => props.index % 2 === 1)
</script>

<template>
  <section
    class="chapter"
    :class="{ 'chapter--active': active, 'chapter--ordinal-left': ordinalOnLeft }"
    :style="chapterStyle"
    :data-chapter="chapter.id"
    :data-index="index"
  >
    <span class="chapter__ordinal" aria-hidden="true">{{ chapter.ordinal }}</span>

    <div class="chapter__inner">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.chapter {
  position: relative;
  flex: 0 0 auto;
  width: max(calc(var(--chapter-span, 100) * 1vw), 640px);
  height: 100%;
  overflow: hidden;
  opacity: 0.94;
  transition: opacity 620ms var(--ease-out-soft);
}

.chapter--active {
  opacity: 1;
}

/* 版式只在这个盒子里自由发挥 */
.chapter__inner {
  position: absolute;
  inset: 0;
}

/*
 * 序号水印：衬线大字、只在本页亮起（opacity 0.05），压在版式之下。
 * 位置留出边距，尽量不压到正文块。
 */
.chapter__ordinal {
  position: absolute;
  z-index: 0;
  top: 6%;
  right: calc(var(--chapter-gutter) * 0.3);
  font-family: var(--font-serif);
  font-size: clamp(120px, 22vh, 260px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
  opacity: 0;
  pointer-events: none;
  user-select: none;
  transition: opacity 700ms var(--ease-out-soft);
}

.chapter--active .chapter__ordinal {
  opacity: 0.05;
}

.chapter--ordinal-left .chapter__ordinal {
  top: auto;
  right: auto;
  bottom: 4%;
  left: calc(var(--chapter-gutter) * 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .chapter,
  .chapter__ordinal {
    transition: none;
  }
}
</style>
