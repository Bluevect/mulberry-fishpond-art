<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count: number
  active: number
}>()

/**
 * 刻度从 6% 排到 94%，给上下留出一点「卷边」的余量。
 * 只有 count === 1 时才居中，避免除零。
 */
const ticks = computed(() => {
  const total = Math.max(0, Math.floor(props.count))
  return Array.from({ length: total }, (_, index) => ({
    index,
    active: index === props.active,
    offset: total > 1 ? 6 + (index / (total - 1)) * 88 : 50,
  }))
})
</script>

<template>
  <div class="progress-rail" :data-active="active" aria-hidden="true">
    <span class="progress-rail__spine" />
    <span
      v-for="tick in ticks"
      :key="tick.index"
      class="progress-rail__tick"
      :class="{ 'progress-rail__tick--active': tick.active }"
      :style="{ top: `${tick.offset}%` }"
    />
  </div>
</template>

<style scoped>
/*
 * 自身不定位：舞台的 .handscroll__rail 负责摆位，
 * 这里只把父容器撑满并画出竖向刻度。
 */
.progress-rail {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 轨心：一条上下淡出的细线，比刻度更先被眼睛忽略。 */
.progress-rail__spine {
  position: absolute;
  top: 6%;
  bottom: 6%;
  left: 50%;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--line) 45%, transparent) 14%,
    color-mix(in srgb, var(--line) 45%, transparent) 86%,
    transparent 100%
  );
  transform: translateX(-0.5px);
}

.progress-rail__tick {
  position: absolute;
  left: 50%;
  width: 13px;
  height: 1px;
  background: color-mix(in srgb, var(--line) 50%, transparent);
  transform: translate(-50%, -50%);
  transition:
    width 260ms var(--ease-out-soft),
    height 260ms var(--ease-out-soft),
    background-color 260ms var(--ease-out-soft);
}

/* 当前章：朱砂色、更粗也更长，像在刻尺上点了一笔。 */
.progress-rail__tick--active {
  width: 27px;
  height: 2px;
  background: var(--seal);
}

@media (prefers-reduced-motion: reduce) {
  .progress-rail__tick {
    transition: none;
  }
}
</style>
