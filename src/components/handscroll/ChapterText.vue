<script setup lang="ts">
/**
 * 正文大块：把一页的文字裹进一个「大方块」里。
 *
 * 版式上刻意做成一块完整的纸：绢底、双层细边、投一点影，
 * 左上角压一道朱砂短线当题头；段落正常横排，首行缩进两个字。
 */
defineProps<{
  /** 段落数组：每一段渲染成一个自然段 */
  text: readonly string[]
}>()
</script>

<template>
  <div class="chapter-text">
    <span class="chapter-text__accent" aria-hidden="true" />
    <p v-for="(paragraph, index) in text" :key="index" class="chapter-text__p">{{ paragraph }}</p>
  </div>
</template>

<style scoped>
.chapter-text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.7em;
  padding: clamp(16px, 2.6vh, 34px) clamp(16px, 1.9vw, 36px);
  background: color-mix(in oklab, var(--paper) 93%, var(--silk));
  border: 1px solid color-mix(in oklab, var(--line) 62%, transparent);
  box-shadow:
    inset 0 0 0 5px color-mix(in oklab, var(--paper) 96%, transparent),
    inset 0 0 0 6px color-mix(in oklab, var(--line) 26%, transparent),
    0 3px 22px color-mix(in oklab, var(--ink) 12%, transparent);
  font-family: var(--font-serif);
  font-size: clamp(12px, 1.55vh, 17px);
  line-height: 2;
  letter-spacing: 0.02em;
  color: color-mix(in oklab, var(--ink) 90%, var(--ink-soft));
}

/* 题头：左上角一道朱砂短线，像题的签 */
.chapter-text__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: clamp(28px, 4vw, 52px);
  height: 3px;
  background: var(--seal);
  opacity: 0.8;
}

.chapter-text__p {
  margin: 0;
  text-align: justify;
  text-indent: 2em;
}

/* 最后一段不缩进，收尾更干净 */
.chapter-text__p:last-child {
  text-indent: 0;
}
</style>
