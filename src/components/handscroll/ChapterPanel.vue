<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import type { Chapter, FrameSpec } from '@/data/chapters'
import InkFrame from './InkFrame.vue'

const props = defineProps<{
  chapter: Chapter
  index: number
  active?: boolean
}>()

/** 章节宽度交给 CSS：--chapter-span 是叙事节奏的唯一来源。 */
const chapterStyle = computed<CSSProperties>(() => ({
  '--chapter-span': `${props.chapter.span}`,
}))

/** 大字序号左右交替，避免六章排下来形成呆板的单侧水印。 */
const ordinalOnLeft = computed(() => props.index % 2 === 1)

/** 空框坐标即画布百分比，父级只负责把百分比转成绝对定位。 */
function frameStyle(frame: FrameSpec): CSSProperties {
  return {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.w}%`,
    height: `${frame.h}%`,
  }
}
</script>

<template>
  <section
    class="chapter"
    :class="{ 'chapter--active': active, 'chapter--ordinal-left': ordinalOnLeft }"
    :style="chapterStyle"
    :data-chapter="chapter.id"
    :data-index="index"
  >
    <!-- 章节序号只做版面装饰：极大的字号 + 极低的墨色，压在框线之下。 -->
    <span class="chapter__ordinal" aria-hidden="true">{{ chapter.ordinal }}</span>

    <div class="chapter__canvas">
      <div
        v-for="(frame, frameIndex) in chapter.frames"
        :key="`${chapter.id}-${frameIndex}`"
        class="chapter__frame"
        :data-kind="frame.kind"
        :style="frameStyle(frame)"
      >
        <InkFrame :kind="frame.kind" :columns="frame.columns" />
      </div>
    </div>

    <!-- 章节交界处的界行，让整卷有「格」的呼吸。 -->
    <span class="chapter__edge" aria-hidden="true" />
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

.chapter__canvas {
  position: absolute;
  top: clamp(14px, 3.6vh, 44px);
  right: var(--chapter-gutter);
  bottom: clamp(14px, 3.6vh, 44px);
  left: var(--chapter-gutter);
  z-index: 1;
}

.chapter__frame {
  position: absolute;
}

/*
 * 章序号：衬线大字，只在当前章亮起（opacity 0.06），靠 right/left 交替换边。
 * 只亮一章，是为了避免相邻两章的大字在交界处叠成一团。
 */
.chapter__ordinal {
  position: absolute;
  z-index: 0;
  top: 0;
  right: calc(var(--chapter-gutter) * 0.2);
  font-family: var(--font-serif);
  font-size: clamp(110px, 20vh, 230px);
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
  opacity: 0.06;
}

.chapter--ordinal-left .chapter__ordinal {
  top: auto;
  right: auto;
  bottom: 0;
  left: calc(var(--chapter-gutter) * 0.2);
}

/* 章节右缘的界行：上下淡出，只在中段留下一条墨线。 */
.chapter__edge {
  position: absolute;
  top: 4%;
  right: 0;
  bottom: 4%;
  z-index: 2;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--line) 14%,
    var(--line) 86%,
    transparent 100%
  );
  opacity: 0.3;
}

@media (prefers-reduced-motion: reduce) {
  .chapter,
  .chapter__ordinal {
    transition: none;
  }
}
</style>
