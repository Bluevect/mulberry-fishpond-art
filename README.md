# 顺德桑基鱼塘 · 长卷叙事

一个以《清明上河图》式长卷为视觉原型的研究型网页：**极端天气（台风、洪涝）冲击下广东顺德大汕岛渔业生态的脆弱性，以及传统「桑基鱼塘」模式在当代生态抗灾中的启示。**

滚动不是往下刷页面，而是**把一卷画轴横向展开**：画带钉在视口里，纵向滚动驱动它向左平移；卷首从合拢的一束卷轴开始，缓缓展开；主色调随之从灾后的灰蓝过渡到桑基的翠绿，最后在落款处收束。

> **当前进度：骨架版。**
> 没有文案、没有图片，版面上只有「框」。所有框都按最终的版面关系摆好了位置，
> 后续只需要往框里填内容，不需要改滚动逻辑和组件结构。

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
├─ data/chapters.ts              长卷的「内容结构」：六章的宽度、色温、主题色、版面空框
├─ utils/color.ts                OKLab 色彩插值（灰蓝 → 翠绿不能走 sRGB，会发脏）
├─ utils/math.ts                 clamp / lerp / 缓动
├─ composables/
│  └─ useHandscrollProgress.ts   滚动 → 进度的映射、测量、逐帧写 CSS 变量
├─ components/handscroll/
│  ├─ HandscrollStage.vue        舞台：跑道、视口、画带、裁剪、主题色
│  ├─ ScrollRoller.vue           木轴 + 卷束（纯 CSS 圆柱）
│  ├─ ChapterPanel.vue           一章的版面：按百分比摆放空框 + 汉字序号
│  ├─ InkFrame.vue               五类空框（图 / 插图 / 文字界格 / 注记 / 数据）
│  ├─ PaperTexture.vue           绢面纹理（内联 SVG 噪点，无图片资源）
│  ├─ ProgressRail.vue           右侧读卷刻度轨
│  └─ SealMark.vue               朱文方印
├─ views/ScrollStoryView.vue     页面装配（把 chapters 交给舞台）
├─ styles/tokens.css             设计变量 + 主题色初始值
└─ styles/base.css               重置与页面底色
docs/handscroll-contract.md      三方实现契约（DOM / CSS 变量 / 组件 API / 滚动映射）
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

## 怎么往里填内容

只需要改 `src/data/chapters.ts`：

```ts
{
  id: 'flood',
  ordinal: '叁',
  span: 136,                    // 本章占多宽（vw），决定叙事节奏
  tone: 0.12,                   // 色温：0 = 灾后灰蓝，1 = 桑基翠绿
  palette: FLOOD,               // 本章中心处的主题色
  frames: [
    { kind: 'figure', x: 4, y: 10, w: 40, h: 80 },   // 位置即画布百分比
    { kind: 'text',   x: 50, y: 12, w: 14, h: 58, columns: 2 },
  ],
}
```

`frames` 现在是空框。接内容时有两条路：

1. **保持数据驱动**：给 `FrameSpec` 加 `src` / `content` 字段，由 `ChapterPanel` 传给 `InkFrame`；
2. **给 `InkFrame` 开具名插槽**（`<template #figure>`），把图/文直接写在 `ChapterPanel` 里。

章与章之间的色温过渡、卷轴展开、进度轨都**不需要动**。

## 设计约束

- 主题色只能通过 `var(--paper)` / `var(--wash)` / `var(--ink)` / `var(--line)` … 读取；
  唯一恒定的例外是朱砂 `--seal`。
- 不引入图片与网络字体：纹理用内联 SVG，卷轴用 CSS 渐变，字体走系统宋/楷栈。
- 尊重 `prefers-reduced-motion`：开卷动画阶跃完成，保留滚动平移。
- 页面上除了汉字序号和印章单字，不出现任何文字；无障碍标题由 `ScrollStoryView` 里一个视觉隐藏的 `<h1>` 提供。

## 调试

- `?p=0.5`：**仅开发环境**，直接以整卷 50% 的进度渲染（不改变滚动位置），方便对着稿子核对版式（0–1）。
  生产构建里这个参数会被忽略。
- 右侧刻度轨显示当前落在第几章；`--tone` 可以在 DevTools 里改，观察配色联动。

## 下一步（骨架之后）

- [ ] 补六章的实际图文素材与图注（城市区位、台风路径、内涝范围、断链示意、塘基循环、启示）
- [ ] 数据框接真实指标（水位、盐度、鱼塘损失、基塘面积变化）
- [ ] 移动端版面细调（章节最小宽度、竖排界格栏数随宽度变化）
- [ ] 可选的「点击刻度轨跳章」
- [ ] 全卷末尾补一个向下滚动的落款区

## 附：模板与 IDE

- [VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（关闭 Vetur）。
- 项目用 [typescript-native-bridge](https://github.com/johnsoncodehk/typescript-native-bridge) 替换工作区
  TypeScript 包；命令行工具会自动走 bridge。VS Code 里接受「使用工作区 TypeScript 版本」提示即可，
  没有提示就手动执行 **TypeScript: Select TypeScript Version** → **Use Workspace Version**。
