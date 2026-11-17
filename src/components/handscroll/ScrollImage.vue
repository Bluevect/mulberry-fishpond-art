<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import type { MediaSpec } from '@/data/chapters'

/**
 * 卷上的图：整块可点，点开是说明弹层。
 *
 * 只留一道细边，不再套一层框——图自己撑起版面；
 * 照片会叠一层当前章节的 wash 色罩，白底示意图则直接用 multiply 融进绢面。
 */
const props = defineProps<{ media: MediaSpec }>()

const emit = defineEmits<{
  'open-media': [media: MediaSpec]
}>()

const isBlend = computed(() => props.media.blend === 'multiply')

const imageStyle = computed<CSSProperties>(() => ({
  objectFit: props.media.fit ?? 'cover',
  objectPosition: props.media.position ?? 'center',
}))
</script>

<template>
  <button
    class="scroll-image"
    :class="{ 'scroll-image--blend': isBlend }"
    type="button"
    :aria-label="`查看说明：${media.title}`"
    @click="emit('open-media', media)"
  >
    <img
      class="scroll-image__img"
      :src="media.src"
      :alt="media.title"
      :style="imageStyle"
      loading="lazy"
      decoding="async"
    />
  </button>
</template>

<style scoped>
.scroll-image {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: color-mix(in oklab, var(--paper-deep) 20%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 58%, transparent);
  box-shadow: 0 4px 26px color-mix(in oklab, var(--ink) 16%, transparent);
  cursor: zoom-in;
  transition:
    box-shadow 260ms var(--ease-out-soft),
    filter 260ms var(--ease-out-soft);
}

.scroll-image:hover,
.scroll-image:focus-visible {
  box-shadow: 0 6px 34px color-mix(in oklab, var(--ink) 24%, transparent);
}

.scroll-image__img {
  display: block;
  width: 100%;
  height: 100%;
  filter: saturate(0.72) contrast(1.02) brightness(0.99);
  transition: filter 260ms var(--ease-out-soft);
}

.scroll-image:hover .scroll-image__img,
.scroll-image:focus-visible .scroll-image__img {
  filter: saturate(0.86) contrast(1.03) brightness(1.01);
}

/* 照片：叠一层当前章节的色温，跟着卷轴冷暖变化 */
.scroll-image:not(.scroll-image--blend)::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--wash);
  mix-blend-mode: multiply;
  opacity: calc(0.16 + var(--tone) * 0.08);
  pointer-events: none;
}

/* 白底示意图：multiply 把白底吃掉，图像印在绢上 */
.scroll-image--blend {
  background: none;
  border-color: transparent;
  box-shadow: none;
}

.scroll-image--blend .scroll-image__img {
  mix-blend-mode: multiply;
  filter: saturate(0.86) contrast(1.02);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-image,
  .scroll-image__img {
    transition: none;
  }
}
</style>
