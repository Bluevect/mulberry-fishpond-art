<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import type { FrameKind } from '@/data/chapters'

const props = defineProps<{
  kind: FrameKind
  columns?: number
}>()

/** text 栏位的合法范围：至少一格，最多十二格，避免异常数据画出过密的线。 */
const columnCount = computed(() => {
  const raw = props.columns ?? 1
  if (!Number.isFinite(raw)) return 1
  return Math.max(1, Math.min(12, Math.round(raw)))
})

/** 只画内部分隔线：columns 格需要 columns - 1 条竖线。 */
const columnRules = computed(() => {
  const count = columnCount.value
  if (count < 2) return []
  return Array.from({ length: count - 1 }, (_, index) => index + 1)
})

function ruleStyle(index: number): CSSProperties {
  return { left: `${(index / columnCount.value) * 100}%` }
}

/** data 框的刻度：中间密、两头略收，长短相间，读起来像一把尺。 */
const dataTicks = computed(() => {
  const total = 9
  return Array.from({ length: total }, (_, index) => ({
    index,
    major: index % 2 === 0,
    style: { left: `${6 + (index / (total - 1)) * 88}%` } as CSSProperties,
  }))
})
</script>

<template>
  <div
    class="ink-frame"
    :class="`ink-frame--${kind}`"
    :data-kind="kind"
    :data-columns="kind === 'text' ? columnCount : undefined"
    aria-hidden="true"
  >
    <!-- figure：外粗内细的双线框 + 四角田字小标 + 极淡对角线 / 十字辅助线 -->
    <template v-if="kind === 'figure'">
      <span class="ink-frame__figure-outer" />
      <span class="ink-frame__figure-inner" />
      <span class="ink-frame__figure-diagonal" />
      <span class="ink-frame__figure-cross" />
      <span class="ink-frame__corner ink-frame__corner--tl" />
      <span class="ink-frame__corner ink-frame__corner--tr" />
      <span class="ink-frame__corner ink-frame__corner--bl" />
      <span class="ink-frame__corner ink-frame__corner--br" />
    </template>

    <!-- plate：最轻的单线框 + 右下一个小角标 -->
    <template v-else-if="kind === 'plate'">
      <span class="ink-frame__plate-frame" />
      <span class="ink-frame__plate-mark" />
    </template>

    <!-- text：四周单线框 + 等距竖排界格 -->
    <template v-else-if="kind === 'text'">
      <span class="ink-frame__text-frame" />
      <span
        v-for="rule in columnRules"
        :key="rule"
        class="ink-frame__rule"
        :style="ruleStyle(rule)"
      />
    </template>

    <!-- note：细虚线框 + 左上折角 -->
    <template v-else-if="kind === 'note'">
      <span class="ink-frame__note-frame" />
      <span class="ink-frame__fold" />
    </template>

    <!-- data：细框 + 基准线 + 长短刻度 -->
    <template v-else>
      <span class="ink-frame__data-frame" />
      <span class="ink-frame__baseline" />
      <span
        v-for="tick in dataTicks"
        :key="tick.index"
        class="ink-frame__tick"
        :class="{ 'ink-frame__tick--major': tick.major }"
        :style="tick.style"
      />
    </template>
  </div>
</template>

<style scoped>
/*
 * 五种框共用一套「墨线」：颜色全部由主题变量调和而成。
 * 为什么比直觉偏深：1px 的边框落在分数像素上会被抗锯齿摊成两半，
 * 视觉亮度大约只有设定值的一半，所以这里取到接近满值，让界格真的看得见。
 */
.ink-frame {
  --frame-strong: color-mix(in srgb, var(--ink-soft) 88%, transparent);
  --frame-line: color-mix(in srgb, var(--line) 94%, transparent);
  --frame-rule: color-mix(in srgb, var(--line) 74%, transparent);
  --frame-faint: color-mix(in srgb, var(--line) 62%, transparent);
  --frame-guide: color-mix(in srgb, var(--ink-soft) 26%, transparent);

  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ---------------------------------------------------------------- figure */

.ink-frame__figure-outer {
  position: absolute;
  inset: 0;
  border: 2px solid var(--frame-strong);
}

.ink-frame__figure-inner {
  position: absolute;
  inset: 5px;
  border: 1px solid var(--frame-faint);
}

.ink-frame__figure-diagonal {
  position: absolute;
  inset: 10px;
  background-image:
    linear-gradient(
      to top right,
      transparent calc(50% - 0.5px),
      var(--frame-guide) calc(50% - 0.5px),
      var(--frame-guide) calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    ),
    linear-gradient(
      to bottom right,
      transparent calc(50% - 0.5px),
      var(--frame-guide) calc(50% - 0.5px),
      var(--frame-guide) calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    );
}

.ink-frame__figure-cross {
  position: absolute;
  inset: 10px;
  background-image:
    linear-gradient(var(--frame-guide), var(--frame-guide)),
    linear-gradient(var(--frame-guide), var(--frame-guide));
  background-repeat: no-repeat;
  background-position:
    50% 50%,
    50% 50%;
  background-size:
    1px 100%,
    100% 1px;
  opacity: 0.7;
}

/* 四角「田」字小标：一个描边小方格，内部再压一个十字。 */
.ink-frame__corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid var(--frame-line);
  background-image:
    linear-gradient(var(--frame-line), var(--frame-line)),
    linear-gradient(var(--frame-line), var(--frame-line));
  background-repeat: no-repeat;
  background-position:
    50% 50%,
    50% 50%;
  background-size:
    1px 100%,
    100% 1px;
}

.ink-frame__corner--tl {
  top: 10px;
  left: 10px;
}

.ink-frame__corner--tr {
  top: 10px;
  right: 10px;
}

.ink-frame__corner--bl {
  bottom: 10px;
  left: 10px;
}

.ink-frame__corner--br {
  right: 10px;
  bottom: 10px;
}

/* ----------------------------------------------------------------- plate */

.ink-frame__plate-frame {
  position: absolute;
  inset: 0;
  border: 1px solid var(--frame-line);
}

.ink-frame__plate-mark {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 13px;
  height: 13px;
  border-right: 1px solid var(--frame-strong);
  border-bottom: 1px solid var(--frame-strong);
}

.ink-frame__plate-mark::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 3px;
  height: 3px;
  background: var(--frame-strong);
}

/* ------------------------------------------------------------------ text */

.ink-frame__text-frame {
  position: absolute;
  inset: 0;
  border: 1px solid var(--frame-line);
}

.ink-frame__rule {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  color: var(--frame-rule);
  background: currentColor;
  transform: translateX(-0.5px);
}

/* 每根界格上下各点一个小横头，模仿版刻的界行。 */
.ink-frame__rule::before,
.ink-frame__rule::after {
  content: '';
  position: absolute;
  left: -2.5px;
  width: 6px;
  height: 1px;
  background: currentColor;
}

.ink-frame__rule::before {
  top: 0;
}

.ink-frame__rule::after {
  bottom: 0;
}

/* ------------------------------------------------------------------ note */

.ink-frame__note-frame {
  position: absolute;
  inset: 0;
  border: 1px dashed var(--frame-faint);
}

/* 折角：一个斜向折痕，外加一片更淡的折页投影。 */
.ink-frame__fold {
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  background-image: linear-gradient(
    to bottom right,
    transparent calc(50% - 0.5px),
    var(--frame-strong) calc(50% - 0.5px),
    var(--frame-strong) calc(50% + 0.5px),
    transparent calc(50% + 0.5px)
  );
}

.ink-frame__fold::before {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  background: color-mix(in srgb, var(--paper-deep) 16%, transparent);
}

/* ------------------------------------------------------------------ data */

.ink-frame__data-frame {
  position: absolute;
  inset: 0;
  border: 1px solid var(--frame-faint);
}

.ink-frame__baseline {
  position: absolute;
  right: 6%;
  bottom: 26%;
  left: 6%;
  height: 1px;
  background: var(--frame-line);
}

.ink-frame__tick {
  position: absolute;
  bottom: 26%;
  width: 1px;
  height: 14%;
  background: var(--frame-faint);
  transform: translateX(-0.5px);
}

.ink-frame__tick--major {
  height: 26%;
  background: var(--frame-line);
}
</style>
