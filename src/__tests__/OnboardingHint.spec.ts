import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import OnboardingHint from '../components/handscroll/OnboardingHint.vue'

const SEEN_KEY = 'mulberry-handscroll:onboarding-seen'

describe('OnboardingHint', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('第一次进入时自动展开说明', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OnboardingHint, { props: { openDelay: 10 } })

    await vi.advanceTimersByTimeAsync(20)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('如何读这卷')

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('关闭后记住已读，并收起成左上角的图标', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OnboardingHint, { props: { openDelay: 10 } })
    await vi.advanceTimersByTimeAsync(20)

    await wrapper.get('.onboarding__confirm').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('.onboarding__button').exists()).toBe(true)
    expect(window.localStorage.getItem(SEEN_KEY)).toBe('1')

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('已经读过就不再自动展开，但点图标仍能打开', async () => {
    window.localStorage.setItem(SEEN_KEY, '1')
    vi.useFakeTimers()
    const wrapper = mount(OnboardingHint, { props: { openDelay: 10 } })

    await vi.advanceTimersByTimeAsync(20)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('.onboarding__button').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('按 Esc 也能收起', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OnboardingHint, { props: { openDelay: 10 } })
    await vi.advanceTimersByTimeAsync(20)

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    wrapper.unmount()
    vi.useRealTimers()
  })
})
