<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    glyph?: string
    size?: number
  }>(),
  { glyph: '桑', size: 44 },
)

/** 尺寸只当 CSS 变量用，字体、内框都跟着它等比缩放。 */
const sealSize = computed(() => {
  const raw = Number.isFinite(props.size) ? props.size : 44
  return `${Math.max(12, Math.round(raw))}px`
})
</script>

<template>
  <div class="seal" :style="{ '--seal-size': sealSize }" aria-hidden="true">
    <span class="seal__border" />
    <span class="seal__glyph">{{ glyph }}</span>
  </div>
</template>

<style scoped>
/*
 * 朱文方印：--seal 铺底，四周留一道纸色内框，字腔同样取纸色。
 * 圆角左右不对称 + 轻微旋转，再点几点「印泥缺肉」，避免像贴图。
 */
.seal {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--seal-size, 44px);
  height: var(--seal-size, 44px);
  background: var(--seal);
  border-radius: 3px 2px 4px 2px / 2px 4px 2px 3px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--seal) 45%, transparent),
    0 1px 2px color-mix(in srgb, var(--ink) 22%, transparent);
  opacity: 0.93;
  transform: rotate(-1.6deg);
}

.seal__border {
  position: absolute;
  inset: 3px;
  border: 1px solid color-mix(in srgb, var(--paper) 78%, transparent);
  border-radius: 1px;
}

.seal__glyph {
  position: relative;
  font-family: var(--font-serif);
  font-size: calc(var(--seal-size, 44px) * 0.58);
  font-weight: 600;
  line-height: 1;
  color: color-mix(in srgb, var(--paper) 94%, transparent);
  text-shadow: 0 0 calc(var(--seal-size, 44px) * 0.06)
    color-mix(in srgb, var(--paper) 45%, transparent);
}

/* 印泥的缺口：三粒极小的纸色斑点，压在印面上。 */
.seal::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image:
    radial-gradient(
      circle at 24% 21%,
      color-mix(in srgb, var(--paper) 34%, transparent) 0 1px,
      transparent 1.6px
    ),
    radial-gradient(
      circle at 72% 59%,
      color-mix(in srgb, var(--paper) 30%, transparent) 0 0.8px,
      transparent 1.4px
    ),
    radial-gradient(
      circle at 39% 84%,
      color-mix(in srgb, var(--paper) 32%, transparent) 0 0.7px,
      transparent 1.2px
    );
  opacity: 0.6;
  pointer-events: none;
}
</style>
