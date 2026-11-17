<script setup lang="ts">
/**
 * 卷轴本体：木轴 + 卷束。
 *
 * 骑在绢面左右边缘上（position: absolute 相对 .handscroll__sheet），由舞台的
 * --roll-l / --roll-r 控制粗细：
 *   - 合拢时两侧都为 1，两个卷束在画面中央叠成一根粗卷；
 *   - 全开后左侧越读越粗（已读部分卷起），右侧越来越细（待读部分减少）。
 *
 * 全部用 CSS 画：木轴的圆柱感靠横向明暗渐变，卷束的纸层靠细密竖纹 + 两端压暗。
 * 不引入图片、字体或第三方库。
 */
defineProps<{
  /** 骑在绢面的哪一侧 */
  side: 'left' | 'right'
}>()
</script>

<template>
  <div class="roller" :class="`roller--${side}`" aria-hidden="true">
    <!-- 木轴：比卷束长，两端露出轴头 -->
    <div class="roller__shaft" />
    <!-- 卷束：纸卷的粗细，宽度随 --roll-l / --roll-r 变化 -->
    <div class="roller__bundle" />
    <!-- 签条：卷合着时贴在卷面外层的题签。一开卷就淡出，只在卷首出现。 -->
    <div class="roller__label" />
  </div>
</template>

<style scoped>
.roller {
  /* 锚点贴在绢面边缘；宽度为 0，子元素以它为中线向两侧展开。 */
  position: absolute;
  top: calc(-1 * var(--roller-overhang));
  bottom: calc(-1 * var(--roller-overhang));
  width: 0;
  z-index: var(--z-roller);
  pointer-events: none;
}

.roller--left {
  left: 0;
  /* 左侧用已读进度；投影落在绢面一侧（向右）。 */
  --roller-roll: var(--roll-l, 1);
  --roller-shadow-x: calc(var(--roller-w) * 0.55);
}

.roller--right {
  right: 0;
  /* 右侧用待读进度；投影落在绢面一侧（向左）。 */
  --roller-roll: var(--roll-r, 1);
  --roller-shadow-x: calc(var(--roller-w) * -0.55);
}

/* ---- 木轴 ---------------------------------------------------------------- */

.roller__shaft {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--roller-w);
  transform: translateX(-50%);
  border-radius: calc(var(--roller-w) * 0.5);
  /* 圆柱感：两侧暗、偏左 1/3 处一道高光；底色是 --wood（墨掺朱砂的暗檀色），
     高光里混入绫色，读起来像上了漆的木轴而不是金属杆。 */
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--wood) 86%, var(--ink)) 0%,
    var(--wood) 16%,
    color-mix(in oklab, var(--wood) 54%, var(--silk)) 42%,
    var(--wood) 70%,
    color-mix(in oklab, var(--wood) 80%, var(--ink)) 100%
  );
  box-shadow:
    0 0 clamp(6px, 1.2vh, 16px) color-mix(in oklab, var(--ink) 55%, transparent),
    inset 0 0 0 1px color-mix(in oklab, var(--ink) 32%, transparent);
}

/* 轴头：在露出段靠近端部的一小圈，比轴杆略粗。 */
.roller__shaft::before,
.roller__shaft::after {
  content: '';
  position: absolute;
  left: 50%;
  width: calc(var(--roller-w) * 1.85);
  height: clamp(4px, 0.8vh, 11px);
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--wood) 82%, var(--ink)) 0%,
    color-mix(in oklab, var(--wood) 68%, var(--silk)) 46%,
    color-mix(in oklab, var(--wood) 84%, var(--ink)) 100%
  );
  box-shadow: 0 0 clamp(4px, 0.8vh, 10px) color-mix(in oklab, var(--ink) 50%, transparent);
}

.roller__shaft::before {
  top: max(2px, calc(var(--roller-overhang) * 0.16));
}

.roller__shaft::after {
  bottom: max(2px, calc(var(--roller-overhang) * 0.16));
}

/* ---- 卷束 ---------------------------------------------------------------- */

.roller__bundle {
  position: absolute;
  top: var(--roller-overhang);
  bottom: var(--roller-overhang);
  left: 0;
  /* 合拢时最粗（--roller-bundle 倍）；全开后随卷束进度收细。
     卷束直径不能小于木轴，否则会露出轴杆两侧，所以给一个略大于轴径的下限。 */
  width: max(
    calc(var(--roller-w) * var(--roller-bundle) * var(--roller-roll, 1)),
    calc(var(--roller-w) * 1.12)
  );
  transform: translateX(-50%);
  border-radius: calc(var(--roller-w) * 0.45);
  background:
    /* 纸层卷边：细密竖纹 */
    repeating-linear-gradient(
      90deg,
      color-mix(in oklab, var(--ink) 7%, transparent) 0 1px,
      transparent 1px 4px
    ),
    /* 上下两端压暗，暗示卷起的绢边 */
    linear-gradient(
        180deg,
        color-mix(in oklab, var(--ink) 20%, transparent) 0%,
        transparent 6%,
        transparent 94%,
        color-mix(in oklab, var(--ink) 22%, transparent) 100%
      ),
    /* 圆柱明暗 */
    linear-gradient(
        90deg,
        color-mix(in oklab, var(--paper-deep) 72%, var(--ink)) 0%,
        var(--paper-deep) 14%,
        color-mix(in oklab, var(--paper) 90%, var(--silk)) 40%,
        color-mix(in oklab, var(--paper) 96%, var(--silk)) 52%,
        var(--paper-deep) 80%,
        color-mix(in oklab, var(--paper-deep) 70%, var(--ink)) 100%
      );
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--ink) 20%, transparent),
    inset 0 0 clamp(5px, 1vh, 12px) color-mix(in oklab, var(--ink) 26%, transparent),
    var(--roller-shadow-x, 0px) 0 clamp(10px, 2vh, 30px)
      color-mix(in oklab, var(--ink) 50%, transparent);
}

/* 卷束上的竖向高光，让圆柱表面有起伏。 */
.roller__bundle::after {
  content: '';
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 33%;
  width: 24%;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in oklab, var(--silk) 52%, transparent) 16%,
    color-mix(in oklab, var(--paper) 66%, transparent) 50%,
    color-mix(in oklab, var(--silk) 42%, transparent) 84%,
    transparent 100%
  );
  opacity: 0.55;
  filter: blur(0.5px);
}

/* 合拢时两个卷束在画面中央叠合；右侧略微偏上的一点高光差异，
   让重叠处有一道接触阴影，读起来像两根卷贴在一起而不是一根。 */
.roller--right .roller__bundle::after {
  left: 30%;
  width: 26%;
  opacity: 0.68;
}

/* ---- 签条 ----------------------------------------------------------------- */

/*
 * 卷合状态的那块题签：一块压了暗边的暖白细长条，贴在卷面外层。
 * 只在开卷前后出现（--reveal > 0.17 时已经完全淡出），
 * 左右两个卷束在合拢时位置重合，所以看起来只有一张。
 */
.roller__label {
  position: absolute;
  top: 50%;
  left: 0;
  width: calc(var(--roller-w) * var(--roller-bundle) * 1.06);
  height: 24%;
  transform: translate(-50%, -50%);
  border-radius: 1px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--silk) 94%, var(--paper)) 0%,
    color-mix(in oklab, var(--silk) 72%, var(--paper-deep)) 62%,
    color-mix(in oklab, var(--silk) 58%, var(--paper-deep)) 100%
  );
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--ink) 24%, transparent),
    0 1px clamp(2px, 0.5vh, 6px) color-mix(in oklab, var(--ink) 34%, transparent);
  /* 开卷到 1/6 之后就不再需要题签了 */
  opacity: clamp(0, calc(1 - var(--reveal, 0) * 6), 1);
}
</style>
