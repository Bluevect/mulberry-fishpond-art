# 长卷骨架 · 实现契约

这一版只搭骨架：**没有文案、没有图片，只有「框」**。所有内容框留空，供后续填充。
本文件是滚动引擎、视觉组件、页面装配三方共同遵守的接口约定，改动前请先同步这里。

## 1. 文件归属

| 归属 | 文件 |
| --- | --- |
| Lead | `src/data/chapters.ts`、`src/utils/*.ts`、`src/styles/*.css`、`src/views/ScrollStoryView.vue`、`src/router/index.ts`、`src/App.vue`、`src/main.ts`、`index.html`、`src/__tests__/*` |
| scroll-engine | `src/composables/useHandscrollProgress.ts`、`src/components/handscroll/HandscrollStage.vue`、`src/components/handscroll/ScrollRoller.vue` |
| ink-chrome | `src/components/handscroll/ChapterPanel.vue`、`InkFrame.vue`、`PaperTexture.vue`、`ProgressRail.vue`、`SealMark.vue` |

只改自己名下的文件。需要别人改动时，写清楚原因反馈给 Lead，不要直接改。

## 2. 全局约束

- 不出现任何占位文案（Lorem、TODO、「此处放图」之类的可见文字一律不要）。
  版面里只允许两种文字：`chapters.ts` 里的汉字序号（壹贰叁…）与印章里的单字。
  另有一个**视觉隐藏**的 `<h1>`（`ScrollStoryView`），供读屏与搜索引擎，舞台用
  `aria-labelledby="story-title"` 指向它，不算作版面文字。
- 不引入图片、字体、第三方动画库。纹理与卷轴一律用 CSS / 内联 SVG 现画。
- 主题色只能通过 `var(--paper)` / `var(--wash)` / `var(--ink)` … 读取，
  **不要在自己组件里写死颜色**；唯一例外是 `--seal`（朱砂，恒定）。
- 每个 SFC 用 `<style scoped>`；跨组件共享的量一律走 `tokens.css` 的变量。
- 遵守 `noUncheckedIndexedAccess`：数组下标取值是 `T | undefined`，必须处理。
- 代码风格：无分号、单引号、2 空格缩进、`<script setup lang="ts">` 顺序在前。
- 不运行 `pnpm` 命令（沙箱对子目录只读）；需要跑构建时交给 Lead。

### 命名约定（BEM）

`block__element--modifier`，kebab-case，块名与组件文件名一一对应：

| 部分 | 规则 | 例子 |
| --- | --- | --- |
| block | = 组件名，全仓库唯一 | `handscroll` `chapter` `ink-frame` `roller` `seal` |
| element | 块内的零件，**不再嵌套**（不写 `chapter__head__title`） | `chapter__ordinal` `roller__shaft` |
| modifier | 同一元素的变体 / 状态，一个元素只挂一个 `--` | `chapter--active` `roller--left` `ink-frame__corner--tl` |

- **一条规则一个类选择器**，不写 `.chapter .frame` 这类后代选择器，优先级保持扁平。
  全仓库唯一的例外是舞台要把纹理层压到长条之上：`.handscroll__paper .handscroll__texture`。
- 需要给测试 / 调试 / JS 用的钩子挂 `data-*`，不要用类名：`data-chapter`、`data-index`、
  `data-kind`、`data-motion`。类名只管样式，职责分开。
- 状态写在类上时用对象语法，不拼字符串：`:class="{ 'chapter--active': active }"`。

## 3. 舞台 DOM（scroll-engine 负责）

```html
<section class="handscroll" style="height: <跑道高度>">   <!-- 根节点，所有 CSS 变量写在这里 -->
  <div class="handscroll__stage">                          <!-- position: sticky; top: 0; height: 100vh -->
    <div class="handscroll__sky" />                        <!-- 墨色氛围底 -->
    <div class="handscroll__band">                         <!-- 居中的横向画带 -->
      <div class="handscroll__sheet">                      <!-- 绢面区域，宽度随 --reveal 展开 -->
        <div class="handscroll__paper">                    <!-- overflow: hidden，裁掉卷外的画面 -->
          <div class="handscroll__strip">                  <!-- 横向长条，随 --pan 平移 -->
            <ChapterPanel v-for="..." />                   <!-- 由 ink-chrome 提供 -->
          </div>
          <PaperTexture class="handscroll__texture" />     <!-- 纹理覆盖层 -->
        </div>
        <ScrollRoller side="left" />                       <!-- 骑在绢面左右边缘 -->
        <ScrollRoller side="right" />                      <!-- 内含：木轴 / 卷束 / 合拢时淡出的题签 -->
      </div>
    </div>
    <div class="handscroll__rail"><ProgressRail /></div>   <!-- 右侧读卷刻度轨 -->
    <div class="handscroll__seal"><SealMark /></div>       <!-- 落款印章 -->
  </div>
</section>
```

`ProgressRail` / `SealMark` 自身**不定位**，由舞台的 `.handscroll__rail` / `.handscroll__seal`
负责摆位；组件内部只画自己。

## 4. CSS 变量契约

scroll-engine 每帧写入以下变量（值必须是数字字符串或合法 CSS 长度）：

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
`--seal`（恒定朱砂）、`--silk`（绫边暖白）、`--void`（舞台外底色）、
`--wood`（木轴色，由 `--ink` 掺 `--seal` 得出）、`--roller-w` / `--roller-bundle`（卷轴尺度）。

- 写入方式：`element.style.setProperty(name, value)`，**不要**为逐帧变化的值建响应式 ref，
  以免每帧触发整棵组件树重渲染。
- 只有会发生「跳变」的离散状态（当前章节、是否 reduce-motion）才用 `ref`。
- 初始值已在 `tokens.css` 给出，脚本未执行时页面也应当是完整可看的。

几何计算尽量交给 CSS：
`--reveal` 控制绢面左右边缘，`--pan` 控制长条位移 `translate3d(...)`，
`--roll-l/-r` 控制卷束粗细（`scaleX` 或宽度）。JS 只负责「进度 → 变量」这一步。

## 5. 组件 API

### `ChapterPanel.vue`（ink-chrome）

```ts
defineProps<{
  chapter: Chapter   // 来自 @/data/chapters
  index: number      // 第几章，0 起
  active?: boolean   // 视口中心是否落在本章，用于轻微提亮
}>()
```

- 根节点 `class="chapter"`，作为 flex 子项，宽度由 `chapter.span` 决定：
  `width: max(calc(var(--chapter-span) * 1vw), 640px)`，内部用内联 `--chapter-span` 传入。
- 内部按 `chapter.frames` 绝对定位渲染 `InkFrame`，坐标即百分比。
- 章节序号 `chapter.ordinal` 作为版面装饰（大字、极淡），不要做成标题文案。

### `InkFrame.vue`（ink-chrome）

```ts
defineProps<{
  kind: FrameKind        // figure | plate | text | note | data
  columns?: number       // 仅 text：竖排界格栏数
}>()
```

- 只画框：双线框 / 界格 / 四角小标，按 `kind` 区分，**内部不放任何内容**。
- 根节点自己撑满父容器（`width/height: 100%`），父级负责定位。

### `PaperTexture.vue`（ink-chrome）

- 无必填 props；`position:absolute; inset:0; pointer-events:none`，用内联 SVG `feTurbulence`
  + 极淡的纤维线表现绢面，`mix-blend-mode: multiply`，透明度 ≤ 0.12。
- 可以读 `--tone` 做轻微变化（冷段更灰、绿段更暖）。

### `ProgressRail.vue`（ink-chrome）

```ts
defineProps<{ count: number; active: number }>()
```

- 竖向刻度轨：`count` 个刻度，`active` 高亮。**不要文字**，不要自己写 `position: fixed`。

### `SealMark.vue`（ink-chrome）

```ts
defineProps<{ glyph?: string; size?: number }>()
```

- 朱文方印：`--seal` 底色 + 留白的边框与字腔，单字（默认 `桑`）。

## 6. 滚动映射（scroll-engine）

单位用 px，不用「进度百分比」硬拆，保证不同视口下手感一致：

```
unrollScroll = viewportHeight * 0.8          // 开卷滚动的像素距离
panScroll    = (stripScrollWidth - paperWidth) * PAN_RATIO   // PAN_RATIO 默认 0.72
runwayHeight = viewportHeight + unrollScroll + panScroll

travel  = clamp(scrollY - runwayTop, 0, unrollScroll + panScroll)
reveal  = easeOutCubic(clamp(travel / unrollScroll))
pan     = clamp((travel - unrollScroll) / panScroll)
progress = travel / (unrollScroll + panScroll)
```

- 色温：`focus = (pan * panDistance + paperWidth / 2) / stripWidth`，
  用 `themeAt(focus)`（`@/data/chapters`）取色，再把 `paletteCssVars()` 合并写入根节点。
- 卷束粗细：
  `rollLeft  = lerp(1, 0.12 + 0.85 * pan, reveal)`
  `rollRight = lerp(1, 0.12 + 0.85 * (1 - pan), reveal)`
  （合拢时两侧都是 1，展开后左侧越来越粗、右侧越来越细。）
- 测量用 `ResizeObserver` + `window.resize` 触发，**每帧只读 `scrollY`**，不要每帧读布局。
- 加 rAF 合并；监听 `scroll` 用 `{ passive: true }`。
- `prefers-reduced-motion: reduce` 时：开卷瞬间完成（`reveal` 直接取 0/1 阶跃），保留滚动平移。
- jsdom 环境下 `ResizeObserver` / `matchMedia` 可能不存在，必须做能力判断，不能直接调用。
- 卸载时移除所有监听、断开 observer、取消 rAF。

### 开发辅助：`?p=`

URL 上带 `?p=0.5` 时，直接以该进度渲染（0–1），不改变页面滚动位置，用于截图与稿面对照。
之所以不走「滚到某处」：既避开路由 `scrollBehavior` 抢滚动位置，也能让无头浏览器稳定截到滚动后的画面。
**只在 `import.meta.env.DEV` 下生效**（生产构建里这个参数会被忽略），所以带参数的链接不会被钉死。

## 7. 配色故事

色温由 `chapters.ts` 的 `tone` 与 `palette` 决定，相邻章之间在 OKLab 里插值：

| 章 | 序号 | 段落 | tone |
| --- | --- | --- | --- |
| opening | 壹 | 卷首 · 岛与塘 | 0 |
| gale | 贰 | 风起 · 台风 | 0.04 |
| flood | 叁 | 水浸 · 洪涝 | 0.12 |
| break | 肆 | 断链 · 脆弱性 | 0.38 |
| mulberry | 伍 | 桑基 · 塘基循环 | 0.72 |
| colophon | 陸 | 落款 · 启示 | 1 |

整体观感必须满足：**开头冷、灰、压；结尾绿、暖、透气**。
