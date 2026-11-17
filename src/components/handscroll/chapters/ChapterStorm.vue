<script setup lang="ts">
import type { Chapter, MediaSpec } from '@/data/chapters'
import { assetUrl } from '@/utils/assets'

import ChapterShell from '../ChapterShell.vue'
import ChapterText from '../ChapterText.vue'
import ScrollImage from '../ScrollImage.vue'

/**
 * 贰 · 风起水浸
 *
 * 台风与内涝合成一页。版式跟卷首一致：左图右文，
 * 图不再铺满整页当背景，正文也不压在图上。
 */
const media: MediaSpec = {
  src: assetUrl('/assets/mulberry-fishpond-1.jpg'),
  title: '灾后塘面',
  description:
    '台风与内涝过去之后，塘水一旦缺氧，鱼就会成片翻肚浮上水面。对一户养殖人家来说，这一塘往往就是一整年的收成。',
  fit: 'cover',
  position: 'center 55%',
}

const text: readonly string[] = [
  '台风从南海上来。气压先落，塘水先闷，鱼浮到水面换气；塘基要加固，棚架要压牢，人在塘边守到风停。',
  '风压掀棚，暴雨灌塘，这是养殖户最怕的两件事；它们常常一起来。一夜之间，增氧机停了、塘水漫过基围、鱼顺着缺口跑，一年的账就被改写。',
  '厄尔尼诺并不只是多雨或少雨，它放大的，是极端：该来的时候不来，来的时候又过头。经验还在，但天气不再按经验办事——二〇一八年九月的超强台风山竹，就是这样一次提醒。',
  '内涝退得比潮水慢。水漫过基围，塘与塘连成一片；水一退，缺氧的塘翻底，鱼先翻肚。水面上的白点，是这一年最先看见的灾情。',
  '一塘鱼，就是一户人家一整年的收成。翻一次塘，账本要从头算起，贷款却不会等人；有人连夜抽水，有人只能站在堤上看着。',
  '灾后第一件事，是清塘、换水、补苗。水浸过的地要很久才重新长出底气，而下一场雨，往往不等你准备好。',
]

defineProps<{ chapter: Chapter; index: number; active?: boolean }>()

const emit = defineEmits<{
  'open-media': [media: MediaSpec]
}>()
</script>

<template>
  <ChapterShell :chapter="chapter" :index="index" :active="active">
    <div class="storm">
      <ScrollImage class="storm__figure" :media="media" @open-media="emit('open-media', $event)" />
      <ChapterText class="storm__text" :text="text" />
    </div>
  </ChapterShell>
</template>

<style scoped>
/* 与卷首（ChapterOpening）同一套骨架：左图右文，中间一道呼吸 */
.storm {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: clamp(20px, 3vw, 56px);
  height: 100%;
  padding: clamp(16px, 3.4vh, 44px) clamp(18px, 3.4vw, 60px);
}

.storm__figure {
  align-self: stretch;
  min-height: 0;
}

.storm__text {
  align-self: center;
  justify-self: start;
  max-width: 860px;
}
</style>
