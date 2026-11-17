import { describe, expect, it } from 'vitest'

import { assetUrl, joinBase } from '../utils/assets'

/**
 * 部署 base 的拼接规则：GitHub Pages 项目页多一层 /<repo>/，
 * 拼错了图片就去站点根目录找，表现为「assets 读取不到」。
 */
describe('assetUrl', () => {
  it('开发环境（base 为 /）保持原样', () => {
    expect(assetUrl('/assets/a.jpg')).toBe('/assets/a.jpg')
  })

  it('项目页 base 下补上仓库前缀', () => {
    expect(joinBase('/mulberry-fishpond-art/', '/assets/a.jpg')).toBe(
      '/mulberry-fishpond-art/assets/a.jpg',
    )
  })

  it('不拼出双斜杠', () => {
    expect(joinBase('/repo/', 'assets/a.jpg')).toBe('/repo/assets/a.jpg')
    expect(joinBase('/repo', '/assets/a.jpg')).toBe('/repo/assets/a.jpg')
    expect(joinBase('/', '/assets/a.jpg')).toBe('/assets/a.jpg')
  })

  it('自定义域名（base 为 /）也走同一条路径', () => {
    expect(joinBase('/', 'assets/a.jpg')).toBe('/assets/a.jpg')
  })
})
