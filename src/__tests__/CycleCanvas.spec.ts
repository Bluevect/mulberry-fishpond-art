import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import CycleCanvas from '../components/handscroll/CycleCanvas.vue'

/**
 * 循环动画：jsdom 没有 canvas 实现，这里把 getContext 打成 null，
 * 验证组件能安全降级（不画但不报错），同时把交互（四个节点小签 + 解释文字）测掉。
 */
function mountCanvas() {
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const wrapper = mount(CycleCanvas)
  return { wrapper, spy }
}

describe('CycleCanvas', () => {
  it('没有 canvas 也能安全渲染，四个环节小签齐全', () => {
    const { wrapper, spy } = mountCanvas()

    expect(wrapper.find('.cycle-canvas__art').exists()).toBe(true)
    expect(wrapper.findAll('.cycle-canvas__chip')).toHaveLength(4)
    // 默认给的是整个循环的一句话
    expect(wrapper.get('.cycle-canvas__caption').text()).toContain('桑叶养蚕')

    wrapper.unmount()
    spy.mockRestore()
  })

  it('点小签选中某一环，再点一次取消', async () => {
    const { wrapper, spy } = mountCanvas()
    const chips = wrapper.findAll('.cycle-canvas__chip')

    await chips[0]?.trigger('click')
    expect(wrapper.get('.cycle-canvas__caption').text()).toContain('桑基种桑')
    expect(chips[0]?.attributes('aria-pressed')).toBe('true')

    await chips[0]?.trigger('click')
    expect(wrapper.get('.cycle-canvas__caption').text()).toContain('桑叶养蚕')
    expect(chips[0]?.attributes('aria-pressed')).toBe('false')

    wrapper.unmount()
    spy.mockRestore()
  })

  it('点另一环会切换选中项', async () => {
    const { wrapper, spy } = mountCanvas()
    const chips = wrapper.findAll('.cycle-canvas__chip')

    await chips[1]?.trigger('click')
    expect(wrapper.get('.cycle-canvas__caption').text()).toContain('桑叶养蚕')

    await chips[2]?.trigger('click')
    expect(wrapper.get('.cycle-canvas__caption').text()).toContain('蚕沙喂鱼')
    expect(chips[2]?.attributes('aria-pressed')).toBe('true')
    expect(chips[1]?.attributes('aria-pressed')).toBe('false')

    wrapper.unmount()
    spy.mockRestore()
  })
})
