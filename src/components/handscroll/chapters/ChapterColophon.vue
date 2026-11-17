<script setup lang="ts">
import type { Chapter, MediaSpec } from '@/data/chapters'
import { assetUrl } from '@/utils/assets'

import ChapterShell from '../ChapterShell.vue'
import ChapterText from '../ChapterText.vue'
import ScrollImage from '../ScrollImage.vue'

/**
 * 肆 · 落款
 *
 * 收卷的一页：左边收束的文字，右边是城市一侧望过去的江与沙洲。
 * 页宽只有整屏的六成左右，留白收得住，不再空一整页。
 */
const media: MediaSpec = {
  src: assetUrl('/assets/mulberry-fishpond-3.jpg'),
  title: '江对岸的城市',
  description:
    '从城市一侧的高处望出去：水道、江心沙洲与对岸的天际线挤在同一个画面里。塘基退到远处，城市一点点逼近——这一卷要问的，正是它们还能不能共存。',
  fit: 'cover',
  position: 'center 52%',
}

const text: readonly string[] = [
  '水盈与韧性——大汕岛渔业的生态回响。水会来，也会退；要留住的，不是某一季的收成，而是能恢复的那部分。',
  '保护桑基鱼塘，不是保存一个旧样子，而是留下一种会缓冲、能恢复的生产方式——它不只属于过去，也属于未来。',
  '愿塘水常盈，愿岛上有桑，愿每一次极端天气过去之后，都还有人愿意回到塘边，把塘重新养起来。',
]

defineProps<{ chapter: Chapter; index: number; active?: boolean }>()

const emit = defineEmits<{
  'open-media': [media: MediaSpec]
}>()
</script>

<template>
  <ChapterShell :chapter="chapter" :index="index" :active="active">
    <div class="colophon">
      <ChapterText class="colophon__text" :text="text" />
      <ScrollImage
        class="colophon__figure"
        :media="media"
        @open-media="emit('open-media', $event)"
      />
    </div>
  </ChapterShell>
</template>

<style scoped>
.colophon {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
  gap: clamp(20px, 3vw, 48px);
  align-items: center;
  height: 100%;
  padding: clamp(16px, 3.4vh, 44px) clamp(18px, 3.4vw, 56px);
}

.colophon__text {
  justify-self: start;
  max-width: 620px;
}

.colophon__figure {
  align-self: center;
  height: min(78%, 460px);
}
</style>
