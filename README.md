# 顺德桑基鱼塘 · 长卷叙事

一个以《清明上河图》式长卷为视觉原型的研究型网页：**极端天气（台风、洪涝）冲击下广东顺德大汕岛渔业生态的脆弱性，以及传统「桑基鱼塘」模式在当代生态抗灾中的启示。**

滚动不是往下刷页面，而是**把一卷画轴横向展开**：画带钉在视口里，纵向滚动驱动它向左平移；卷首从合拢的一束卷轴开始，缓缓展开；主色调随之从灾后的灰蓝过渡到桑基的翠绿，最后在落款处收束。

> **当前进度：内容版。**
> 四页各自的版式、四张图、每页一个正文大块都已入卷，点图可弹出说明。
> 台风 / 洪涝的实测数据还没接；改文案、换图直接在 `chapters/` 下对应页面的组件里改，
> `src/data/chapters.ts` 只放「每页多宽、什么色温」这类骨架参数。

## 快速开始

```sh
pnpm install
pnpm dev        # 本地调试
pnpm build      # 类型检查 + 生产构建
pnpm test:unit  # 单元测试
pnpm lint       # oxlint + eslint
pnpm format     # oxfmt
```

建议用 Chrome / Edge 全屏查看；移动端同样走纵向滚动驱动，无需额外适配。

## 目录结构

```
src/
├─ data/chapters.ts              长卷的「骨架参数」：每页的宽度、色温、主题色（不含内容）
├─ utils/color.ts                OKLab 色彩插值（灰蓝 → 翠绿不能走 sRGB，会发脏）
├─ utils/math.ts                 clamp / lerp / 缓动
├─ composables/
│  └─ useHandscrollProgress.ts   滚动 → 进度的映射、测量、逐帧写 CSS 变量
├─ components/handscroll/
│  ├─ HandscrollStage.vue        舞台：跑道、视口、画带、裁剪、主题色、章节分发
│  ├─ ScrollRoller.vue           木轴 + 卷束（纯 CSS 圆柱）
│  ├─ ChapterShell.vue           一页的外壳：宽度、序号水印、slot
│  ├─ ChapterText.vue            正文大块（每页的文字都裹在这一块里）
│  ├─ ScrollImage.vue            可点击放大的图（色罩 / multiply）
│  ├─ CycleCanvas.vue            桑基鱼塘循环动画（canvas 手绘，可交互）
│  ├─ PaperTexture.vue           绢面纹理（内联 SVG 噪点，无图片资源）
│  ├─ ProgressRail.vue           右侧读卷刻度轨
│  ├─ SealMark.vue               朱文方印（右下落款）
│  ├─ MediaLightbox.vue          图片说明弹层（点实景图打开）
│  ├─ OnboardingHint.vue         首次进入的说明卡（收起成左上角图标）
│  └─ chapters/                  四页各自的版式（每页一个文件，自由排版）
│     ├─ ChapterOpening.vue      壹 · 岛与塘（图文对开）
│     ├─ ChapterStorm.vue        贰 · 风起水浸（与卷首同一套图文对开）
│     ├─ ChapterCycle.vue        叁 · 断链与桑基（文字 + canvas 循环动画）
│     └─ ChapterColophon.vue     肆 · 落款（文字 + 江对岸的城市，页宽收窄）
├─ views/ScrollStoryView.vue     页面装配（把 chapters 交给舞台）
├─ styles/tokens.css             设计变量 + 主题色初始值
└─ styles/base.css               重置与页面底色
docs/handscroll-contract.md      实现契约（结构 / CSS 变量 / 组件 API / 滚动映射）
public/assets/                   实景图与示意图（mulberry-fishpond-*.jpg）
```

## 长卷是怎么动起来的

**只有一条主轴：纵向滚动位置。** 舞台外层是一段很高的 runway，内层是 `position: sticky` 的
100vh 视口，所以页面本身是正常滚动的——没有拦截滚轮，也就没有 scroll-jacking 的种种毛病。

```
travel  = clamp(scrollY - runwayTop, 0, unrollScroll + panScroll)
reveal  = easeOutCubic(travel / unrollScroll)     // 卷轴展开
pan     = clamp((travel - unrollScroll) / panScroll)  // 长卷平移
progress = travel / (unrollScroll + panScroll)    // 整卷进度
```

- **开卷**（`--reveal`）：绢面的左右边缘从画面正中对称推开到装裱留边，两个木轴骑在边缘上，
  卷束由粗变细——合拢时是中间一束，展开后左侧渐粗（读过的部分卷起来）、右侧渐细。
- **平移**（`--pan`）：长条 `translate3d` 走 `calc(100% - var(--paper-w))` 乘进度，宽度由浏览器算。
- **配色**：视口中心在整卷中的位置 `focus` 交给 `themeAt()`，在相邻两章的主题色之间做 OKLab
  插值，再逐帧写回 `--paper` / `--wash` / `--ink` …；`--tone` 单独给出 0→1 的色温信号。

### 一个刻意的取舍：滚动时不碰响应式

每帧都变的值（进度、位移、颜色）**不经过 Vue 的响应式系统**，而是在 rAF 里
`element.style.setProperty()` 直接写 CSS 自定义属性，几何计算全部交给 CSS `calc()`。
模板因此不会在滚动时重新渲染，只有「当前是第几章」这种离散状态才用 `ref`。
读代码时请留意这条约定，新加动画请沿用。

## 点击看图

带图的页面里，图整块是热区，点开后是一层「画片」弹窗：左边原图，右边标题与一段说明。

- 关闭方式：右上角朱砂钮 / `Esc` / 点遮罩。
- 打开时焦点移到关闭钮，关闭后还回触发它的按钮；`Tab` 在弹层内循环。
- 打开期间滚轮与触摸不透到长卷；关掉后仍停在原来的阅读位置。
- 弹窗继承舞台的主题色变量，所以它在卷首是灰蓝、在卷尾是桑叶绿。

## 首次进入的引导

第一次打开时，左上角会展开一张「如何读这卷」的说明卡（延后 0.9s，等开卷动画起手）：

- 说明三件事：向下滚动展开画卷、点图看说明（`Esc` 关闭）、右侧刻度是读到第几页；
- 关掉之后**收成左上角一枚说明图标**，随时可以再点开；
- 是否读过记在 `localStorage`（`mulberry-handscroll:onboarding-seen`），之后再进不自动弹；
  隐私模式下读写失败会退化成每次都提示。

图标是**内联 SVG**，没有引入图标库（这个环境装不了新依赖，内联也离线可用）。
想换成 remixicon / ElementPlus 的图标，只要替换 `OnboardingHint.vue` 里那一个 `<svg>`。

## 生态循环动画（叁 · 断链与桑基）

原来那张「湖州桑基鱼塘循环模式图」是白底的示意图，跟绢面卷轴的气质差太远，已经不用了。
现在这一页右侧是 [CycleCanvas.vue](src/components/handscroll/CycleCanvas.vue) 用 canvas 现画的循环场景，
**构图照原图来，但不画白底**——所有形状都是绢色 / 墨色的半透明笔触，像直接画在卷上：

```
┌──────────────────────────────────────────┐
│                 蚕                        │
│            ╱ ↘                          │
│   桑 ◯◯ ←─   ╲     ……（蚕沙喂鱼）       │
│   塘基    ←─  ╲  ┌──────────┐           │
│  ▁▁▁▁▁      ╲   │  池塘 ～～ │  鱼       │
│  ▁▁▁▁▁▁▁▁▁▁╲──│          │           │
│             塘泥 └──────────┘           │
└──────────────────────────────────────────┘
```

- 左边一块**塘基**（土坡）+ 两棵**桑树**；右边一片**池塘**（波纹 + 三尾线鱼）；
  上方是**蚕**（桑叶上的两条小蚕），下方是**塘泥**（塘底挤出来的一团）；
- 三条箭头串起循环：桑 →蚕（桑叶养蚕）、蚕 →鱼（蚕沙喂鱼）、塘泥 →桑（塘泥肥桑），
  朱砂粒子沿着箭头流动；
- 鼠标停在某个环节的**图画或标签字**上（不用点），与它相连的两条箭头就直接变朱砂、加粗，粒子也亮一档；
  不再额外画聚焦圈；
- 点画布或下方四枚小签选中该环节，底部给一句解释（小签支持键盘、`aria-live` 播报）；
- 颜色全部从 CSS 变量读（`--paper` / `--paper-deep` / `--wash` / `--ink` / `--line` / `--seal`），
  跟着卷轴冷暖一起变；动画只在页面进入视口时跑，离开就停，`prefers-reduced-motion` 下只画静帧；
  jsdom 里拿不到 `canvas 2d` 上下文时安全降级（不画、不报错）。

## 怎么往里填内容

**文字、图、弹窗说明都直接写在各自的页面组件里**（`components/handscroll/chapters/Chapter*.vue`），
想改哪一页就打开哪个文件；`src/data/chapters.ts` 只留骨架参数。

`chapters.ts` 里每页只有一行：

```ts
{ id: 'storm', ordinal: '贰', span: 140, tone: 0.12, palette: FLOOD }
```

| 字段 | 作用 |
| --- | --- |
| `id` | 用来选版式组件（`HandscrollStage` 的 `CHAPTER_VIEWS`） |
| `ordinal` | 卷上序号（壹贰叁肆），只做版面装饰 |
| `span` | 这一页占多宽（vw），决定滚动节奏 |
| `tone` / `palette` | 这一页的色温与主题色，跨页时在 OKLab 里插值 |

这些参数必须集中在一张表里，因为滚动距离、章节边界和冷暖过渡都要跨页计算。

### 一页的内容写在组件里

比如 [ChapterStorm.vue](src/components/handscroll/chapters/ChapterStorm.vue)：

```ts
// 这一页的图与文字就写在这里
const media: MediaSpec = {
  src: '/assets/mulberry-fishpond-1.jpg',
  title: '灾后塘面',              // 弹窗标题（也是按钮的无障碍名）
  description: '台风与内涝过去之后……', // 弹窗正文
  fit: 'cover',                  // 照片 cover；示意图用 contain
  position: 'center 55%',        // 只对 cover：裁切重心
}

const text: readonly string[] = [
  '台风从南海上来……',           // 一个元素 = 一个自然段
  '一塘鱼，就是一户人家一整年的收成……',
]
```

`media` 的几条约定：

- **照片**用 `fit: 'cover'` 铺满，允许裁切，`position` 控制留哪一段；
  **示意图**用 `fit: 'contain'`，别把标注裁掉。
- **白底图**加 `blend: 'multiply'`，白底会被绢面吃掉，图就像印上去的。
- 照片会自动叠一层当前页的 `--wash` 色罩，所以同一张图在卷首偏灰蓝、在卷尾偏桑绿。
- 图能点开说明，所以 `title` / `description` 必填。

### 正文：一个大块

每页的正文由 `ChapterText` 渲染成**一整块**（绢底 + 双层细边 + 朱砂题头），
横排、首行缩进两字、两端对齐；文字就是组件里的那个 `text` 段落数组。

- 单段 10–200 字；一页 2–6 段比较好看。
- 版式决定这块字摆哪：可以靠右（贰）、居中（肆）、与图对开（壹/叁）；
  块宽别超过页宽的 46%，否则一行太长。
- 想让某页文字更多：往数组里加段落即可，块会自然变高；版面留白跟着变。

### 加一页 / 改一页的版式

1. `chapters.ts` 里加一条骨架参数（`id` 要唯一）；
2. 在 `chapters/` 下新建 `Chapter<名字>.vue`：内容（`media` / `text`）和排版都写在里面；
3. 到 `HandscrollStage.vue` 的 `CHAPTER_VIEWS` 里登记 `id → 组件`。

章与章之间的色温过渡、卷轴展开、进度轨都**不需要动**。

## 设计约束

- 主题色只能通过 `var(--paper)` / `var(--wash)` / `var(--ink)` / `var(--line)` … 读取；
  唯一恒定的例外是朱砂 `--seal`。
- 网络字体、第三方动画库一律不引：纹理用内联 SVG，卷轴用 CSS 渐变，字体走系统宋/楷栈；
  图片只从 `public/assets/` 按数据引入。
- 尊重 `prefers-reduced-motion`：开卷动画阶跃完成，保留滚动平移。
- 卷面文字只有三种：汉字序号、右下落款印章，以及横排正文；不写占位文案。
  无障碍标题由 `ScrollStoryView` 里一个视觉隐藏的 `<h1>` 提供。
- 图标一律内联 SVG，不引图标库（离线可用、体积可控）。
- 目前的实景图带图库水印，正式提交前要换成有授权的素材或补图源。

## 调试

- `?p=0.5`：**仅开发环境**，直接以整卷 50% 的进度渲染（不改变滚动位置），方便对着稿子核对版式（0–1）。
  生产构建里这个参数会被忽略。
- 右侧刻度轨显示当前落在第几章；`--tone` 可以在 DevTools 里改，观察配色联动。

## 素材来源

卷中现在用**三张图**，全部放在 `public/assets/`，由需求方提供；其中两张带图库水印，**仅供内部演示**，
正式提交前须替换或取得授权。画面水印即来源线索：

| 文件 | 用在哪 | 画面水印 / 原始出处 | 状态 |
| --- | --- | --- | --- |
| `mulberry-fishpond-2.jpg` | 壹 · 岛与塘 | 站酷海洛（ID 2239037414） | 待授权，需替换 |
| `mulberry-fishpond-1.jpg` | 贰 · 风起水浸 | 视觉中国 + 凤凰新闻 | 待授权，需替换 |
| `mulberry-fishpond-3.jpg` | 肆 · 落款 | 需求方提供（城市江岸实拍，画面无水印） | 来源待补 |
| ~~`mulberry-fishpond-ecosystem-cycle.jpg`~~ | 已弃用 | 南浔旅游：湖州桑基鱼塘系统生态循环模式图 | 文件还留在 `public/assets/`，没人引用了，可以删 |

代码里的引用位置：`src/data/chapters.ts` 已不再放图，三张图分别写在
`chapters/ChapterOpening.vue`、`ChapterStorm.vue`、`ChapterColophon.vue` 里；
叁页的循环图换成了 `CycleCanvas.vue` 里用 canvas 现画的动画。

## 下一步

- [x] 首批实景图入卷 + 点击弹说明（岛与塘 / 灾后塘面 / 江对岸的城市）
- [x] 叁页的循环图换成 canvas 手绘的可交互循环动画
- [x] 四页正文（原六页合并为四页，横排、正常阅读顺序）
- [ ] 换掉带水印的图，补图源与授权
- [ ] 用 ECharts 做数据图（台风路径、水位、养殖损失——数据来源待定），按版式自由嵌进页面
- [ ] 正文按研究结论再校一遍（现在的文案是叙述性的，还没有具体数据支撑）
- [ ] 移动端版面细调（正文行宽与字号随屏宽、章节最小宽度）
- [ ] 可选的「点击刻度轨跳章」「键盘左右键翻章」
- [ ] 全卷末尾补一个向下滚动的落款区

## 附：模板与 IDE

- [VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（关闭 Vetur）。
- 项目用 [typescript-native-bridge](https://github.com/johnsoncodehk/typescript-native-bridge) 替换工作区
  TypeScript 包；命令行工具会自动走 bridge。VS Code 里接受「使用工作区 TypeScript 版本」提示即可，
  没有提示就手动执行 **TypeScript: Select TypeScript Version** → **Use Workspace Version**。
