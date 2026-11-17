<script setup lang="ts">
import type { Chapter, MediaSpec } from '@/data/chapters'

import ChapterShell from '../ChapterShell.vue'
import ChapterText from '../ChapterText.vue'
import ScrollImage from '../ScrollImage.vue'

/** 壹 · 岛与塘 —— 这一页的图与文字就写在这里。 */
const media: MediaSpec = {
  src: '/assets/mulberry-fishpond-2.jpg',
  title: '岛与塘',
  description:
    '从高处看，大汕岛被水道围成一整片塘基：一格一格的鱼塘、基围与村落，再远处是顺德的城区楼群。水一涨，这座岛就是最先承压的地方。',
  fit: 'cover',
  position: 'center 62%',
}

const text: readonly string[] = [
  '珠三角的水网把大汕岛围成一座沙洲。岛上没有山，只有一格一格的鱼塘和基围：塘是水，基是土，村落在两者之间长出来。从高处看，塘基像写在江面上的字，一横一竖都靠水养着。',
  '塘基种桑，塘水养鱼，桑叶养蚕，蚕沙喂鱼——一条链子走了几百年。岛上的日子就长在这套循环上：早上看水色，午后看天色，夜里听风向。',
  '水一涨，岛是最先承压的地方；风一过，塘是最先翻底的地方。岛的脆弱，从来不是抽象的词，它是堤上的一道裂缝、塘边的一夜守候、账本上少掉的一行数。',
]

defineProps<{ chapter: Chapter; index: number; active?: boolean }>()

const emit = defineEmits<{
  'open-media': [media: MediaSpec]
}>()
</script>

<template>
  <ChapterShell :chapter="chapter" :index="index" :active="active">
    <div class="opening">
      <ScrollImage
        class="opening__figure"
        :media="media"
        @open-media="emit('open-media', $event)"
      />
      <ChapterText class="opening__text" :text="text" />
    </div>
  </ChapterShell>
</template>

<style scoped>
.opening {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: clamp(20px, 3vw, 56px);
  height: 100%;
  padding: clamp(16px, 3.4vh, 44px) clamp(18px, 3.4vw, 60px);
}

.opening__figure {
  align-self: stretch;
  min-height: 0;
}

.opening__text {
  align-self: center;
  justify-self: start;
  max-width: 820px;
}
</style>
