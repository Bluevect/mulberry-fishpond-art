import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import ScrollStoryView from '../views/ScrollStoryView.vue'

/**
 * 冒烟测试：根路由能挂上长卷舞台。
 * 断言的是舞台根节点的类名——它是滚动引擎与样式之间的契约（见 docs/handscroll-contract.md）。
 */
describe('App', () => {
  it('根路由渲染长卷舞台', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'handscroll', component: ScrollStoryView }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('section.handscroll').exists()).toBe(true)
    wrapper.unmount()
  })
})
