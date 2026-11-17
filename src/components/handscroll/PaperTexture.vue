<script setup lang="ts">
import { useId } from 'vue'

/**
 * 两种 id 都需要在页面里唯一：同一页面若挂多块纹理，
 * 共用 filter/pattern id 会让后面的纹理吃到前面的参数。
 */
const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const grainFilterId = `paper-grain-filter-${uid}`
const grainPatternId = `paper-grain-pattern-${uid}`
</script>

<template>
  <div class="paper-texture" aria-hidden="true">
    <!--
      绢面颗粒：feTurbulence 生成纤维噪点，压成灰度后收窄明暗，
      再铺进一个 180×180 的 pattern 里平铺——
      整卷绢面可能上千万像素宽，逐像素滤镜会拖慢首屏，平铺才是安全做法。
    -->
    <svg class="paper-texture__grain" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="grainFilterId"
          x="0"
          y="0"
          width="180"
          height="180"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.86"
            numOctaves="3"
            seed="23"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.55" intercept="0.25" />
            <feFuncG type="linear" slope="0.55" intercept="0.25" />
            <feFuncB type="linear" slope="0.55" intercept="0.25" />
            <feFuncA type="linear" slope="0.55" intercept="0" />
          </feComponentTransfer>
        </filter>
        <pattern :id="grainPatternId" width="180" height="180" patternUnits="userSpaceOnUse">
          <rect width="180" height="180" :filter="`url(#${grainFilterId})`" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" :fill="`url(#${grainPatternId})`" />
    </svg>

    <!-- 两条几乎看不见的横向纤维，负责破掉颗粒的均匀感。 -->
    <span class="paper-texture__fiber paper-texture__fiber--high" />
    <span class="paper-texture__fiber paper-texture__fiber--low" />
  </div>
</template>

<style scoped>
/*
 * 纹理只做「叠印」：mix-blend-mode: multiply 让颗粒吃进纸色，
 * 整体透明度封在 0.11，无论主题怎么变都不会把绢面压脏。
 */
.paper-texture {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.11;
}

.paper-texture__grain {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.paper-texture__fiber {
  position: absolute;
  right: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--ink-soft) 38%, transparent) 6%,
    color-mix(in srgb, var(--ink-soft) 38%, transparent) 94%,
    transparent 100%
  );
}

.paper-texture__fiber--high {
  top: 18%;
}

.paper-texture__fiber--low {
  top: 63%;
  opacity: 0.5;
}

/*
 * 色温：--tone = 0 时整张绢偏冷灰（叠墨青），= 1 时偏暖（叠纸背色）。
 * 用透明度而不是换色，纹理始终跟着主题走。
 */
.paper-texture::before,
.paper-texture::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.paper-texture::before {
  background: radial-gradient(
    120% 90% at 50% 0%,
    color-mix(in srgb, var(--paper-deep) 70%, transparent),
    transparent 72%
  );
  opacity: calc(var(--tone) * 0.85);
}

.paper-texture::after {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ink-soft) 45%, transparent),
    transparent 58%
  );
  opacity: calc((1 - var(--tone)) * 0.85);
}
</style>
