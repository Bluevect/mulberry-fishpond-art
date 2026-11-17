import { describe, expect, it } from 'vitest'

import { chapters, chapterCenters, themeAt } from '../data/chapters'

describe('chapters', () => {
  it('每一章的编号、id 唯一', () => {
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(chapters.length)
    expect(new Set(chapters.map((chapter) => chapter.ordinal)).size).toBe(chapters.length)
  })

  it('每章都有正的宽度，色温在 0–1 之间', () => {
    for (const chapter of chapters) {
      expect(chapter.span).toBeGreaterThan(0)
      expect(chapter.tone).toBeGreaterThanOrEqual(0)
      expect(chapter.tone).toBeLessThanOrEqual(1)
    }
  })

  it('章心按宽度递增，首尾为 0 与 1 之间', () => {
    const centers = chapterCenters()
    expect(centers).toHaveLength(chapters.length)
    const first = centers[0] ?? -1
    const last = centers[centers.length - 1] ?? -1
    expect(first).toBeGreaterThan(0)
    expect(last).toBeLessThan(1)
    for (let i = 1; i < centers.length; i += 1) {
      expect(centers[i] ?? 0).toBeGreaterThan(centers[i - 1] ?? 0)
    }
  })

  it('色温随卷轴推进单调上升：灰蓝 → 桑基翠绿', () => {
    let previous = -1
    for (let step = 0; step <= 20; step += 1) {
      const tone = themeAt(step / 20).tone
      expect(tone).toBeGreaterThanOrEqual(previous)
      previous = tone
    }
    expect(themeAt(0).tone).toBe(0)
    expect(themeAt(1).tone).toBe(1)
  })

  it('章节中心处取到该章自己的主题色', () => {
    const centers = chapterCenters()
    centers.forEach((center, index) => {
      const chapter = chapters[index]
      expect(chapter).toBeDefined()
      expect(themeAt(center).palette.paper).toBe(chapter?.palette.paper)
    })
  })
})
