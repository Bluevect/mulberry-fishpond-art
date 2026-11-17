import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import ScrollStoryView from '../views/ScrollStoryView.vue'

/**
 * 冒烟测试：根路由能挂上长卷舞台，四页版式与内容都渲染出来。
 * 内容（图与文字）写在各自的页面组件里，所以这里从渲染结果反查，
 * 而不是去 datasource 里查（data/chapters.ts 只有骨架参数）。
 */
describe('App', () => {
  it('根路由渲染长卷舞台与四页内容', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'handscroll', component: ScrollStoryView }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('section.handscroll').exists()).toBe(true)

    // 每一页都是各自独立的版式组件，舞台负责按 id 分发
    const pages = wrapper.findAll('section.chapter')
    expect(pages).toHaveLength(4)
    for (const id of ['opening', 'storm', 'cycle', 'colophon']) {
      expect(wrapper.find(`[data-chapter="${id}"]`).exists()).toBe(true)
    }

    // 每页都有一块正文，且至少两个自然段
    const textBlocks = wrapper.findAll('.chapter-text')
    expect(textBlocks).toHaveLength(4)
    for (const block of textBlocks) {
      expect(block.findAll('p').length).toBeGreaterThanOrEqual(2)
      expect(block.text().length).toBeGreaterThan(40)
    }

    // 三张可点击的图（壹 / 贰 / 肆 各一张；叁 是 canvas 循环动画）
    expect(wrapper.findAll('.scroll-image')).toHaveLength(3)

    // 叁 的循环动画与四个节点小签
    expect(wrapper.find('.cycle-canvas__art').exists()).toBe(true)
    expect(wrapper.findAll('.cycle-canvas__chip')).toHaveLength(4)

    // 首次进入的引导：左上角常驻一枚说明图标
    expect(wrapper.find('.onboarding__button').exists()).toBe(true)

    wrapper.unmount()
  })
})
