import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { MediaSpec } from '../data/chapters'
import MediaLightbox from '../components/handscroll/MediaLightbox.vue'

const MEDIA: MediaSpec = {
  src: '/assets/mulberry-fishpond-2.jpg',
  title: '岛与塘',
  description: '从高处看，大汕岛被水道围成一整片塘基。',
  fit: 'cover',
  position: 'center 62%',
}

describe('MediaLightbox', () => {
  it('没有素材时不渲染弹窗', () => {
    const wrapper = mount(MediaLightbox, { props: { media: null } })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('有素材时渲染图片、标题与说明', () => {
    const wrapper = mount(MediaLightbox, { props: { media: MEDIA } })
    const dialog = wrapper.get('[role="dialog"]')

    expect(dialog.attributes('aria-labelledby')).toBe('media-lightbox-title')
    expect(wrapper.get('h2').text()).toBe('岛与塘')
    expect(wrapper.get('h2').attributes('id')).toBe('media-lightbox-title')
    expect(wrapper.get('p').text()).toContain('大汕岛')
    expect(wrapper.get('img').attributes('src')).toBe(MEDIA.src)
    expect(wrapper.get('img').attributes('alt')).toBe(MEDIA.title)
  })

  it('点关闭按钮派发 close', async () => {
    const wrapper = mount(MediaLightbox, { props: { media: MEDIA } })
    await wrapper.get('.lightbox__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('按 Esc 派发 close', async () => {
    const wrapper = mount(MediaLightbox, {
      props: { media: MEDIA },
      attachTo: document.body,
    })
    await wrapper.get('.lightbox').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('media 从空变为有值时打开弹窗', async () => {
    const wrapper = mount(MediaLightbox, { props: { media: null } })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.setProps({ media: MEDIA })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})
