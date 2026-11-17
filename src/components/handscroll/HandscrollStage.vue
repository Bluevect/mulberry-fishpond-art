<script setup lang="ts">
/**
 * 长卷舞台：竖向滚动的跑道 + sticky 视口 + 横向长卷。
 *
 * 结构与几何约定见 docs/handscroll-contract.md 第 3、4 节：
 *   - 外层 .handscroll 的高度（跑道）由滚动引擎按像素写入；
 *   - 内层 .handscroll__stage 用 position: sticky 钉住 100vh；
 *   - 开卷 / 平移 / 卷束 / 主题色全部是根节点上的 CSS 变量，脚本逐帧写；
 *   - 本组件只在模板里绑一个离散状态 activeIndex（章节提亮、刻度轨高亮）。
 */

import { ref, type Component } from 'vue'

import type { Chapter, MediaSpec } from '@/data/chapters'
import { useHandscrollProgress } from '@/composables/useHandscrollProgress'

import MediaLightbox from '@/components/handscroll/MediaLightbox.vue'
import OnboardingHint from '@/components/handscroll/OnboardingHint.vue'
import PaperTexture from '@/components/handscroll/PaperTexture.vue'
import ProgressRail from '@/components/handscroll/ProgressRail.vue'
import ScrollRoller from '@/components/handscroll/ScrollRoller.vue'
import SealMark from '@/components/handscroll/SealMark.vue'

import ChapterColophon from '@/components/handscroll/chapters/ChapterColophon.vue'
import ChapterCycle from '@/components/handscroll/chapters/ChapterCycle.vue'
import ChapterOpening from '@/components/handscroll/chapters/ChapterOpening.vue'
import ChapterStorm from '@/components/handscroll/chapters/ChapterStorm.vue'

/**
 * 章节 id → 版式组件。
 * 每一页的排版是各自写的，舞台只负责把数据塞进去、把点击事件接住。
 */
const CHAPTER_VIEWS: Record<string, Component> = {
  opening: ChapterOpening,
  storm: ChapterStorm,
  cycle: ChapterCycle,
  colophon: ChapterColophon,
}

function chapterView(id: string): Component {
  return CHAPTER_VIEWS[id] ?? ChapterOpening
}

const props = defineProps<{
  chapters: readonly Chapter[]
}>()

const rootEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const bandEl = ref<HTMLElement | null>(null)
const stripEl = ref<HTMLElement | null>(null)

/** 当前弹窗里的图；null 表示弹窗关闭。 */
const activeMedia = ref<MediaSpec | null>(null)

function openMedia(media: MediaSpec): void {
  activeMedia.value = media
}

function closeMedia(): void {
  activeMedia.value = null
}

const { activeIndex, reducedMotion } = useHandscrollProgress(
  { root: rootEl, stage: stageEl, band: bandEl, strip: stripEl },
  () => props.chapters,
)
</script>

<template>
  <!-- aria-labelledby 指向页面里视觉隐藏的 h1（见 ScrollStoryView），
       长卷本身没有可读文字，靠它给读屏一个区域名。 -->
  <section
    ref="rootEl"
    class="handscroll"
    aria-labelledby="story-title"
    :data-motion="reducedMotion ? 'reduced' : 'full'"
  >
    <div ref="stageEl" class="handscroll__stage">
      <!-- 墨色氛围底：桌面 / 空气的暗部，用主题的 wash、ink、paper 混出来 -->
      <div class="handscroll__sky" aria-hidden="true" />

      <!-- 居中的横向画带：它的宽度就是绢面全开时的宽度 -->
      <div ref="bandEl" class="handscroll__band">
        <!-- 绢面区域：左右边缘由 --reveal 从中心推向画带两侧 -->
        <div class="handscroll__sheet">
          <div class="handscroll__paper">
            <!-- 横向长条：宽度为所有章节之和，由 --pan 整体左移 -->
            <div ref="stripEl" class="handscroll__strip">
              <!-- 每页一个版式组件：排版各写各的，数据从这里灌下去 -->
              <component
                :is="chapterView(chapter.id)"
                v-for="(chapter, index) in chapters"
                :key="chapter.id"
                :chapter="chapter"
                :index="index"
                :active="index === activeIndex"
                @open-media="openMedia"
              />
            </div>
            <PaperTexture class="handscroll__texture" />
          </div>

          <!-- 两个卷束骑在绢面左右边缘：开卷时从中央叠合处向两侧推开 -->
          <ScrollRoller side="left" />
          <ScrollRoller side="right" />
        </div>
      </div>

      <!-- 右侧读卷刻度轨（组件自身不定位） -->
      <div class="handscroll__rail">
        <ProgressRail :count="chapters.length" :active="activeIndex" />
      </div>

      <!-- 右下落款印章（组件自身不定位） -->
      <div class="handscroll__seal">
        <SealMark />
      </div>
    </div>

    <!-- 首次进入的阅读提示：收起时是左上角一枚说明图标 -->
    <OnboardingHint />

    <!-- 图片说明弹窗：挂在根节点上（不在 stage 里），
         这样 position: fixed 不受舞台的 overflow 影响，又能继承主题色变量 -->
    <MediaLightbox :media="activeMedia" @close="closeMedia" />
  </section>
</template>

<style scoped>
/* ============================================================================
 * 长卷舞台
 * ----------------------------------------------------------------------------
 * 这里只负责「框」与几何：所有随滚动变化的量都从根节点的 CSS 变量读。
 * 卷束与动画由 ScrollRoller、ChapterPanel 等组件自己画。
 * ========================================================================== */

.handscroll {
  position: relative;
  width: 100%;
  /* 跑道高度兜底：脚本挂载后会按「视口 + 开卷行程 + 平移行程」写成像素值。 */
  height: 220vh;
  background: color-mix(in oklab, var(--ink) 84%, transparent);

  /* 画带左右留白：装裱留边之外，再给画面呼吸的边距。
     左右对称，保证长卷始终居中；右侧刻度轨正好落在留白里。 */
  --band-gutter: clamp(0px, 5.2vw, 130px);
  /* 绫边宽度（纯装饰，不参与 --paper-w 的量取） */
  --silk-edge: clamp(5px, 0.7vw, 12px);
  /* 画心边缘的暗角 / 投影宽度 */
  --edge-shade: clamp(16px, 2.6vh, 44px);
}

/* ---- sticky 视口 --------------------------------------------------------- */

.handscroll__stage {
  position: sticky;
  top: 0;
  /* dvh 跟随移动端地址栏的收放；不认识 dvh 的浏览器留在上一行的 100vh。 */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  isolation: isolate;
}

/* 四周压暗，把视线收进画面中央（只压氛围底，不压绢面）。 */
.handscroll__stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: calc(var(--z-band) - 1);
  pointer-events: none;
  background: radial-gradient(
    ellipse 94% 82% at 50% 48%,
    transparent 48%,
    color-mix(in oklab, var(--ink) 56%, transparent) 100%
  );
}

/* ---- 墨色氛围底 --------------------------------------------------------- */

.handscroll__sky {
  position: absolute;
  inset: 0;
  z-index: var(--z-sky);
  pointer-events: none;
  background:
    /* 画带后方的一层薄光，像案上的漫反射 */
    radial-gradient(
      ellipse 78% 58% at 50% 46%,
      color-mix(in oklab, var(--paper) 16%, transparent) 0%,
      color-mix(in oklab, var(--wash) 26%, transparent) 34%,
      transparent 72%
    ),
    /* 左下更重的一团墨，呼应长卷从冷到暖的走向 */
    radial-gradient(
        ellipse 54% 46% at 4% 96%,
        color-mix(in oklab, var(--ink) 55%, transparent) 0%,
        transparent 66%
      ),
    /* 右上一点点纸色，避免暗底死板 */
    radial-gradient(
        ellipse 42% 36% at 98% 2%,
        color-mix(in oklab, var(--paper) 12%, transparent) 0%,
        transparent 64%
      ),
    /* 上下压暗的线性墨晕 */
    linear-gradient(
        180deg,
        color-mix(in oklab, var(--ink) 62%, transparent) 0%,
        color-mix(in oklab, var(--ink) 10%, transparent) 30%,
        color-mix(in oklab, var(--ink) 10%, transparent) 70%,
        color-mix(in oklab, var(--ink) 58%, transparent) 100%
      );
}

/* ---- 画带 --------------------------------------------------------------- */

.handscroll__band {
  position: absolute;
  top: 50%;
  left: calc(var(--mount-pad) + var(--band-gutter));
  right: calc(var(--mount-pad) + var(--band-gutter));
  height: var(--band-height);
  transform: translateY(-50%);
  z-index: var(--z-band);
}

/* ---- 绢面：开卷窗口 ----------------------------------------------------- */

.handscroll__sheet {
  position: absolute;
  top: 0;
  bottom: 0;
  /* reveal = 0 时左右都停在 50%（合拢）；reveal = 1 时推到画带两侧。
     两点之间是对称的，所以卷束从中线向两边推开。 */
  left: calc(50% - 50% * var(--reveal));
  right: calc(50% - 50% * var(--reveal));
  z-index: var(--z-paper);
  /* 卷轴投在案面上的影子：用 box-shadow 而不是 filter，
     因为左右边缘每帧都在变，filter 会为整块画面重新离屏合成。 */
  box-shadow:
    0 clamp(12px, 2.4vh, 30px) clamp(24px, 5vh, 56px)
      color-mix(in oklab, var(--ink) 62%, transparent),
    0 0 clamp(10px, 2vh, 24px) color-mix(in oklab, var(--ink) 42%, transparent);
}

.handscroll__paper {
  position: absolute;
  inset: 0;
  /* clip 而不是 hidden：hidden 是可编程滚动的容器，Tab 到画面外的图时浏览器会
     把 scrollLeft 改掉，长条的 translate 就跟进度对不上了。clip 不允许滚动。 */
  overflow: hidden;
  overflow: clip;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--paper) 86%, var(--silk)) 0%,
    var(--paper) 34%,
    color-mix(in oklab, var(--paper) 94%, var(--paper-deep)) 72%,
    color-mix(in oklab, var(--paper) 88%, var(--paper-deep)) 100%
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--line) 52%, transparent),
    inset 0 0 var(--edge-shade) color-mix(in oklab, var(--paper-deep) 62%, transparent);
}

/* 绫边：左右上下各一条暖白的装裱边，压在画心最外层。 */
.handscroll__paper::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      color-mix(in oklab, var(--silk) 92%, var(--paper)) 0,
      color-mix(in oklab, var(--silk) 70%, var(--paper-deep)) var(--silk-edge),
      transparent calc(var(--silk-edge) + 1px)
    ),
    linear-gradient(
      270deg,
      color-mix(in oklab, var(--silk) 92%, var(--paper)) 0,
      color-mix(in oklab, var(--silk) 70%, var(--paper-deep)) var(--silk-edge),
      transparent calc(var(--silk-edge) + 1px)
    ),
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--silk) 86%, var(--paper)) 0,
      color-mix(in oklab, var(--silk) 64%, var(--paper-deep)) var(--silk-edge),
      transparent calc(var(--silk-edge) + 1px)
    ),
    linear-gradient(
      0deg,
      color-mix(in oklab, var(--silk) 86%, var(--paper)) 0,
      color-mix(in oklab, var(--silk) 64%, var(--paper-deep)) var(--silk-edge),
      transparent calc(var(--silk-edge) + 1px)
    );
}

/* 画心边缘的投影：让绢面看起来是凹进去的，并给裁切边一点重量。 */
.handscroll__paper::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      color-mix(in oklab, var(--ink) 32%, transparent) 0,
      transparent var(--edge-shade)
    ),
    linear-gradient(
      270deg,
      color-mix(in oklab, var(--ink) 32%, transparent) 0,
      transparent var(--edge-shade)
    ),
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--ink) 22%, transparent) 0,
      transparent calc(var(--edge-shade) * 0.7)
    ),
    linear-gradient(
      0deg,
      color-mix(in oklab, var(--ink) 22%, transparent) 0,
      transparent calc(var(--edge-shade) * 0.7)
    );
  box-shadow: inset 0 0 calc(var(--edge-shade) * 0.9)
    color-mix(in oklab, var(--ink) 20%, transparent);
}

/* ---- 横向长条：由 --pan 平移 -------------------------------------------- */

.handscroll__strip {
  display: flex;
  align-items: stretch;
  width: max-content;
  min-width: 100%;
  height: 100%;
  /* 100% 是长条自身宽度：溢出宽度 = 长条宽 - 绢面宽，按 --pan 左移。
     纯 calc，不需要每帧算 px；1px 误差都发生在浏览器里。 */
  transform: translate3d(calc((100% - var(--paper-w)) * var(--pan) * -1), 0, 0);
  will-change: transform;
  backface-visibility: hidden;
}

/* 纹理盖在长条之上、绫边之下；样式细节由 PaperTexture 自己画。
   这里提高一级选择器优先级，确保层级不被组件自身样式覆盖。 */
.handscroll__paper .handscroll__texture {
  z-index: 2;
}

/* ---- 右侧刻度轨 / 右下印章（组件自身不定位，由舞台摆位） ---------------- */

.handscroll__rail {
  position: absolute;
  top: 50%;
  right: var(--rail-inset);
  width: var(--rail-w);
  height: clamp(160px, 46vh, 420px);
  transform: translateY(-50%);
  z-index: var(--z-chrome);
  opacity: 0.88;
}

.handscroll__seal {
  position: absolute;
  right: var(--rail-inset);
  bottom: clamp(18px, 4.4vh, 56px);
  z-index: var(--z-chrome);
}

/* ---- 小屏：让位给画面 ---------------------------------------------------- */

@media (max-width: 720px) {
  .handscroll {
    --band-gutter: clamp(10px, 3vw, 22px);
  }

  /* 刻度轨收不起来也不该压住绢面，小屏直接让位。 */
  .handscroll__rail {
    display: none;
  }

  .handscroll__seal {
    right: clamp(8px, 2.4vw, 14px);
    bottom: clamp(10px, 2.4vh, 22px);
  }
}

/* 视口很矮时（横屏手机），印章往上收一点，别和画带抢位置。 */
@media (max-height: 620px) {
  .handscroll__seal {
    bottom: clamp(8px, 2vh, 16px);
  }

  .handscroll__rail {
    height: clamp(120px, 38vh, 300px);
  }
}

/* 极矮的横屏：画带已经占满，右下角没有落章的位置，直接收起。 */
@media (max-height: 480px) {
  .handscroll__seal {
    display: none;
  }
}
</style>
