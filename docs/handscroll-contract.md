# 长卷实现契约

这一版：**每页的版式各自写**，不再有通用的「框阵」。
`chapters.ts` 只描述每页的内容（宽度、色温、图、正文），排版由
`components/handscroll/chapters/Chapter*.vue` 每个文件自己决定。

## 1. 结构

```
src/components/handscroll/
├─ HandscrollStage.vue      舞台：跑道、sticky 视口、画带、裁剪、主题色（滚动引擎）
├─ ScrollRoller.vue         木轴 + 卷束
├─ PaperTexture.vue         绢面纹理
├─ ProgressRail.vue         右侧读卷刻度轨
├─ SealMark.vue             右下落款印
├─ MediaLightbox.vue        图片说明弹层
├─ OnboardingHint.vue       首次进入的说明卡（收起成左上角图标）
├─ ChapterShell.vue         一页的外壳：宽度、色温、序号水印、slot
├─ ChapterText.vue          正文大块（每页的文字都裹在这一个块里）
├─ ScrollImage.vue          可点击放大的图（含色罩 / multiply）
├─ CycleCanvas.vue          桑基鱼塘循环动画（canvas 手绘，可交互）
└─ chapters/
   ├─ ChapterOpening.vue    壹 · 岛与塘（图文对开）
   ├─ ChapterStorm.vue      贰 · 风起水浸（与卷首同一套图文对开）
   ├─ ChapterCycle.vue      叁 · 断链与桑基（文字 + canvas 循环动画）
   └─ ChapterColophon.vue   肆 · 落款（文字 + 江对岸的城市，页宽收窄）
```

> 原来是六页：纯文字的风起 / 断链 / 落款各自占满一屏、大半是空的。
> 现在「风起 + 水浸」「断链 + 桑基」两两合并，落款页收窄到 96vw，整卷更紧。

骨架参数在 `src/data/chapters.ts`（必须集中：滚动距离、章节边界、冷暖插值都要跨页计算）；
**内容与版式都在 `chapters/` 下的页面组件里**——改哪一页就只动那个文件。

## 2. 全局约束

- 卷面上的文字只有三种：汉字序号、右下落款印章、正文。**不写占位文案**；
  图片说明只在点击后的弹层里出现。另有一个视觉隐藏的 `<h1>`（`ScrollStoryView`），
  供读屏与搜索引擎，舞台用 `aria-labelledby="story-title"` 指向它。
- 图片只允许通过 `Chapter.media` 从 `public/assets/` 引入（见 §8），不写死在模板里。
- 主题色只能通过 `var(--paper)` / `var(--wash)` / `var(--ink)` … 读取，
  **不要在自己组件里写死颜色**；唯一例外是 `--seal`（朱砂，恒定）。
- 每个 SFC 用 `<style scoped>`；跨组件共享的量一律走 `tokens.css` 的变量。
- 遵守 `noUncheckedIndexedAccess`：数组下标取值是 `T | undefined`，必须处理。
- 代码风格：无分号、单引号、2 空格缩进、`<script setup lang="ts">` 顺序在前。

### 命名约定（BEM）

`block__element--modifier`，kebab-case，块名与组件文件名对应：

| 部分 | 规则 | 例子 |
| --- | --- | --- |
| block | = 组件名，全仓库唯一 | `chapter` `scroll-image` `chapter-text` |
| element | 块内的零件，**不再嵌套** | `chapter__ordinal` `scroll-image__img` |
| modifier | 变体 / 状态，一个元素只挂一个 `--` | `chapter--active` `scroll-image--blend` |

- 一条规则一个类选择器，不写后代选择器；全仓库唯一的例外是
  `.handscroll__paper .handscroll__texture`（舞台要把纹理层压在长条之上）。
- 给测试 / 调试用的钩子挂 `data-*`，不要用类名：`data-chapter`、`data-index`、`data-motion`。
- 状态用对象语法：`:class="{ 'chapter--active': active }"`。

## 3. 舞台 DOM

```html
<section class="handscroll" style="height: <跑道高度>">   <!-- 根节点，所有 CSS 变量写在这里 -->
  <div class="handscroll__stage">                          <!-- position: sticky; top: 0; height: 100dvh -->
    <div class="handscroll__sky" />                        <!-- 墨色氛围底 -->
    <div class="handscroll__band">                         <!-- 居中的横向画带 -->
      <div class="handscroll__sheet">                      <!-- 绢面区域，宽度随 --reveal 展开 -->
        <div class="handscroll__paper">                    <!-- overflow: clip，裁掉卷外的画面 -->
          <div class="handscroll__strip">                  <!-- 横向长条，随 --pan 平移 -->
            <Chapter* :chapter :index :active @open-media />  <!-- 每页一个版式组件 -->
          </div>
          <PaperTexture class="handscroll__texture" />
        </div>
        <ScrollRoller side="left" />
        <ScrollRoller side="right" />
      </div>
    </div>
    <div class="handscroll__rail"><ProgressRail /></div>
    <div class="handscroll__seal"><SealMark /></div>
  </div>

  <OnboardingHint />                                          <!-- 左上角说明图标 / 说明卡 -->
  <MediaLightbox :media="activeMedia" @close="closeMedia" />  <!-- 舞台的兄弟节点 -->
</section>
```

- 章节组件由 `HandscrollStage` 里的 `CHAPTER_VIEWS`（id → 组件）分发；
  未知 id 退回 `ChapterOpening`。
- `MediaLightbox` / `OnboardingHint` 必须挂在根节点下、**不能放进 `.handscroll__stage`**：
  舞台内部有 `overflow` 与 `transform` 祖先，`position: fixed` 会被裁切或错位；挂根节点还能继承主题色变量。
- 两者不互相抢占：`OnboardingHint` 的 `z-index: 60`，`MediaLightbox` 是 100。

## 4. CSS 变量契约

scroll-engine 每帧写入以下变量（写在舞台根节点上）：

| 变量 | 含义 | 取值范围 |
| --- | --- | --- |
| `--progress` | 整卷进度 | 0 → 1 |
| `--reveal` | 开卷进度，0 = 卷束合拢 | 0 → 1 |
| `--pan` | 平移进度，0 = 卷首，1 = 卷尾 | 0 → 1 |
| `--roll-l` / `--roll-r` | 左 / 右卷束粗细 | 0 → 1 |
| `--paper-w` | 全幅展开时的绢面宽度（只在尺寸变化时写） | px |
| `--paper` `--paper-deep` `--wash` `--ink` `--ink-soft` `--line` | 当前主题色 | 颜色 |
| `--tone` | 色温，0 = 灾后灰蓝，1 = 桑基翠绿 | 0 → 1 |

只读的派生变量（`tokens.css` 定义、不逐帧写）：
`--seal`、`--silk`、`--void`、`--wood`、`--band-height`、`--mount-pad`、`--chapter-gutter` 等。

- 写入方式：`element.style.setProperty()`，**不要**为逐帧变化的值建响应式 ref。
- 只有离散状态（当前章节、reduce-motion）才用 `ref`。
- 初始值已在 `tokens.css` 给出，脚本未执行时页面也应当是完整可看的。

## 5. 组件 API

### `ChapterShell.vue` —— 一页的外壳

```ts
defineProps<{
  chapter: Chapter   // 来自 @/data/chapters
  index: number      // 第几页，0 起
  active?: boolean   // 视口中心是否落在本页
}>()
```

- 根节点 `section.chapter`：宽度 `max(calc(var(--chapter-span) * 1vw), 640px)`，高 100%。
- 内部只有三样东西：序号水印（`.chapter__ordinal`，只在 active 时 0.05 透明）、
  一个绝对定位的 `.chapter__inner`（容纳版式）、`<slot />`。
- **版式都在 slot 里**，每页自己写；`ChapterShell` 不提供任何框。

### `ChapterText.vue` —— 正文大块

```ts
defineProps<{ text: readonly string[] }>()   // 段落数组
```

- 一块完整的「纸」：绢底、双层细边、投影、左上角一道朱砂短线当题头。
- 横排、首行缩进 2em（最后一段不缩进）、两端对齐，行高 2、字号 `clamp(12px, 1.55vh, 17px)`。
- 高度由内容决定；版式组件负责把它摆在页面上的位置。

### `ScrollImage.vue` —— 可点击的图

```ts
defineProps<{ media: MediaSpec }>()
defineEmits<{ 'open-media': [media: MediaSpec] }>()
```

- 整块是 `<button>`，`aria-label` 用素材标题；点击后由舞台打开 `MediaLightbox`。
- 只留一道细边，不再套框；照片叠一层 `--wash` 的 multiply 色罩（跟着章节冷暖变化），
  白底示意图（`blend: 'multiply'`）不加色罩、直接 multiply 吃掉白底。

### `CycleCanvas.vue` —— 循环场景（无 props）

- 用 canvas 手绘桑基鱼塘的循环，**构图照原模式图、但不画白底**：
  左边塘基 + 桑树、右边池塘（波纹 + 线鱼）、上方蚕、下方塘泥；
- 三条箭头串起循环：桑→蚕（桑叶养蚕）、蚕→鱼（蚕沙喂鱼）、塘泥→桑（塘泥肥桑），朱砂粒子沿箭头流动；
- 交互：指针停在某个环节的**图画或标签字**上（命中区 = 一个圆 + 标签字矩形）时，
  与该环节相连的两条箭头变朱砂、加粗、粒子变亮；**不画聚焦圈**；
  点画布或下方四枚小签选中，底部 `<p aria-live>` 给解释；小签 hover / focus 也会联动高亮箭头；
- 颜色每 8 帧从 `getComputedStyle` 读一次 CSS 变量（`--paper` / `--paper-deep` / `--wash` /
  `--ink` / `--ink-soft` / `--line` / `--seal`），所以它跟着卷轴冷暖变化；**不要在 JS 里写死颜色**；
- 只在进入视口时跑 rAF（`IntersectionObserver`）；`prefers-reduced-motion` 只画静帧；
  拿不到 2d context（jsdom）时安全降级；卸载时断开 observer、取消 rAF。

### `chapters/Chapter*.vue` —— 每页的版式

```ts
defineProps<{ chapter: Chapter; index: number; active?: boolean }>()
defineEmits<{ 'open-media': [media: MediaSpec] }>()   // 有图时才有
```

- 都包在 `<ChapterShell>` 里，版式各自写；**不要**再引入通用的框阵。
- 现有四页手法：图文对开（壹/贰/肆）、文字与图并置（叁）；
  不同的图幅比例与留白节奏。
- 需要加新页：在 `chapters.ts` 加数据 + 在 `chapters/` 加版式 + 在
  `HandscrollStage` 的 `CHAPTER_VIEWS` 注册。

### `PaperTexture.vue`

- 无必填 props；用内联 SVG `feTurbulence` + 极淡纤维线表现绢面，透明度 ≤ 0.12，可读 `--tone`。

### `ProgressRail.vue`

```ts
defineProps<{ count: number; active: number }>()
```

- 竖向刻度轨，`active` 高亮；无文字，自身不定位（由舞台摆位）。

### `SealMark.vue`

```ts
defineProps<{ glyph?: string; size?: number }>()
```

- 朱文方印：`--seal` 底色 + 留白边框与字腔，单字（默认 `桑`）。

### `MediaLightbox.vue`

```ts
defineProps<{ media: MediaSpec | null }>()   // null = 关闭
defineEmits<{ close: [] }>()
```

- 大图 + 标题 + 一段说明；关闭钮 / `Esc` / 点遮罩关闭；打开时锁定焦点，关闭后还回。
- 打开期间拦截 `wheel` / `touchmove`，滚动不透到长卷。

### `OnboardingHint.vue`

```ts
defineProps<{ openDelay?: number }>()   // 自动展开的延迟，默认 900ms
```

- 首次进入自动展开一张「如何读这卷」说明卡（延时等开卷起手）；
  关闭后收起成左上角一枚说明图标，点图标可再开。
- 是否读过记在 `localStorage`（`mulberry-handscroll:onboarding-seen`），读写失败时降级为每次都提示。
- `Esc` 关闭；展开时焦点移到卡片，关闭后还回图标按钮。
- 图标是内联 SVG（不引图标库）；要换 remixicon / ElementPlus 只替换那一个 `<svg>`。

## 6. 滚动映射（scroll-engine）

```
unrollScroll = viewportHeight * 0.8
panScroll    = (stripScrollWidth - paperWidth) * PAN_RATIO   // 0.72
runwayHeight = viewportHeight + unrollScroll + panScroll

travel  = clamp(scrollY - runwayTop, 0, unrollScroll + panScroll)
reveal  = easeOutCubic(clamp(travel / unrollScroll))
pan     = clamp((travel - unrollScroll) / panScroll)
progress = travel / (unrollScroll + panScroll)
```

- 色温：`focus = (pan * panDistance + paperWidth / 2) / stripWidth` → `themeAt(focus)`。
- 卷束：`rollLeft = lerp(1, 0.12 + 0.85 * pan, reveal)`，右侧用 `1 - pan`。
- 测量用 `ResizeObserver` + `window.resize`；**每帧只读 `scrollY`**；rAF 合并；passive scroll。
- `prefers-reduced-motion` 时开卷阶跃完成，保留平移；jsdom 里缺 `ResizeObserver` / `matchMedia` 要能降级。

## 7. 配色故事

| 页 | 序号 | 段落 | tone | span |
| --- | --- | --- | --- | --- |
| opening | 壹 | 岛与塘 | 0 | 124 |
| storm | 贰 | 风起 · 水浸（台风与内涝合并） | 0.12 | 140 |
| cycle | 叁 | 断链 · 桑基（问题与循环合并） | 0.72 | 150 |
| colophon | 肆 | 落款 · 启示 | 1 | 96 |

整体观感：**开头冷、灰、压；结尾绿、暖、透气**。
四页的跨度总和 510vw，比原来的 844vw 紧了不少——空白页合并之后，滚动也更短。

## 8. 素材与点击说明

图声明在页面组件的 `media` 常量里，类型是 `MediaSpec`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `src` | ✓ | `public/assets/` 下的路径（以 `/assets/` 开头） |
| `title` | ✓ | 弹窗标题，同时是按钮的无障碍名称 |
| `description` | ✓ | 弹窗正文，一两句话 |
| `fit` | | 照片用 `cover`（默认，允许裁切）；示意图用 `contain` |
| `position` | | 仅 `cover`：`object-position`，控制裁切重心 |
| `blend` | | 白底示意图用 `multiply` 融进绢面 |

- 交互链路：`ScrollImage` 的按钮 `emit('open-media')` → 版式组件转给舞台 → `openMedia()` →
  `MediaLightbox`；关闭后焦点还回按钮，滚动位置不变。
- 目前三张图在用，其中两张带图库水印，正式提交前需换成有授权的素材或补图源说明；
  循环示意图（`mulberry-fishpond-ecosystem-cycle.jpg`）已弃用，改由 `CycleCanvas` 现画。

## 9. 正文

页面组件里的 `text` 是一个段落数组，交给 `ChapterText` 渲染成一个大块：

- 每段 10–200 字；一页 2–6 段比较好看。
- 版式决定这块字摆哪：可以靠右、居中、与图对开，块宽控制在页宽的 36%–46%，
  行宽才不会长得难以阅读。
- 正文不缩进到边框上：`ChapterText` 自带内边距与题头，不要在版式里再包一层框。
