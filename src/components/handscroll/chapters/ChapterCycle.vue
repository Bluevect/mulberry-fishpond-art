<script setup lang="ts">
import type { Chapter, MediaSpec } from '@/data/chapters'

import ChapterShell from '../ChapterShell.vue'
import ChapterText from '../ChapterText.vue'
import ScrollImage from '../ScrollImage.vue'

/** 叁 · 断链与桑基 —— 先讲断在哪儿，再讲它本来怎么转起来。图与文字都写在这里。 */
const media: MediaSpec = {
  src: '/assets/mulberry-fishpond-ecosystem-cycle.jpg',
  title: '桑基鱼塘的循环',
  description:
    '桑叶养蚕、蚕沙喂鱼、塘泥肥桑——桑基鱼塘把种植与养殖串成一个闭环：基是缓冲，泥是肥料，水是活的。系统的冗余，正是它面对极端天气时的韧性来源。（图为湖州桑基鱼塘系统的循环模式，顺德桑基鱼塘同属这一传统农业形态。）',
  fit: 'contain',
  blend: 'multiply',
}

const text: readonly string[] = [
  '桑基鱼塘断在哪儿？断在桑不值钱、蚕没人养、泥不再还田；也断在年轻人一批批离开塘基。链条不是一天断的，是一环一环松掉的。',
  '塘基撂荒，塘泥外运，循环就断了一环。断掉的不是某一种作物，而是系统里彼此兜底的那几层：没有桑，蚕就没有饲料；没有泥，基就瘦。',
  '单点的系统，经不起一次极端：一塘水、一季鱼、一场风。脆弱，往往不是天灾造成的，而是结构里少了一层。',
  '桑叶养蚕，蚕沙喂鱼，塘泥肥桑。三个简单的动作，把种植与养殖串成一个闭环：桑吃土，蚕吃桑，鱼吃蚕沙，泥回到基上，几百年不散。',
  '基是缓冲，挡住了水，也留住了土；塘是容器，接住了雨，也养住了鱼。冗余，就是它的余地——多一道基，就少一分被一次极端打倒的风险。',
  '循环不是复古，是把冗余重新装回系统。多一层塘基，就多一分缓过来的可能，也多一分灾后重启的底气；老办法里藏着今天的答案。',
]

defineProps<{ chapter: Chapter; index: number; active?: boolean }>()

const emit = defineEmits<{
  'open-media': [media: MediaSpec]
}>()
</script>

<template>
  <ChapterShell :chapter="chapter" :index="index" :active="active">
    <div class="cycle">
      <ChapterText class="cycle__text" :text="text" />
      <div class="cycle__figure">
        <ScrollImage :media="media" @open-media="emit('open-media', $event)" />
      </div>
    </div>
  </ChapterShell>
</template>

<style scoped>
.cycle {
  display: grid;
  grid-template-columns: minmax(320px, 600px) minmax(0, 1fr);
  gap: clamp(24px, 3.4vw, 72px);
  align-items: center;
  height: 100%;
  padding: clamp(16px, 3.4vh, 44px) clamp(18px, 3.4vw, 64px);
}

.cycle__text {
  justify-self: start;
}

.cycle__figure {
  align-self: stretch;
  min-height: 0;
}
</style>
