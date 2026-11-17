<script setup lang="ts">
import { chapters } from '@/data/chapters'
import HandscrollStage from '@/components/handscroll/HandscrollStage.vue'
</script>

<template>
  <main class="story">
    <!-- 长卷本身没有可读文字，标题只提供给读屏与搜索引擎；舞台用 aria-labelledby 指向它 -->
    <h1 id="story-title" class="story__title">
      顺德桑基鱼塘 - 极端天气下的渔业生态脆弱性与生态抗灾启示
    </h1>

    <HandscrollStage :chapters="chapters" />
  </main>
</template>

<style scoped>
.story {
  position: relative;
  min-height: 100vh;
}

/* 视觉隐藏，但保留在无障碍树中 */
.story__title {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
