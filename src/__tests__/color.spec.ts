import { describe, expect, it } from 'vitest'

import { mixOklab, mixPalette, paletteCssVars, parseHex, type Palette } from '../utils/color'

const COLD: Palette = {
  paper: '#c9d2d5',
  paperDeep: '#a6b3b8',
  wash: '#5d707b',
  ink: '#16232a',
  inkSoft: '#43555f',
  line: '#83939a',
}

const GREEN: Palette = {
  paper: '#d2dcc4',
  paperDeep: '#aebb9a',
  wash: '#4f6f45',
  ink: '#172413',
  inkSoft: '#3f5233',
  line: '#87976e',
}

describe('parseHex', () => {
  it('支持 3 位与 6 位写法', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('c9d2d5')).toEqual([201, 210, 213])
  })

  it('遇到非法值时抛错', () => {
    expect(() => parseHex('rgb(0,0,0)')).toThrow('无法解析颜色值')
    expect(() => parseHex('#12345')).toThrow('无法解析颜色值')
  })
})

describe('mixOklab', () => {
  it('端点处原样返回', () => {
    expect(mixOklab('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixOklab('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('结果始终是合法的 6 位小写十六进制', () => {
    for (let step = 0; step <= 10; step += 1) {
      expect(mixOklab(COLD.paper, GREEN.paper, step / 10)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('中点介于两端之间（明度不跳变）', () => {
    const mid = parseHex(mixOklab('#000000', '#ffffff', 0.5))
    expect(mid[0]).toBeGreaterThan(20)
    expect(mid[0]).toBeLessThan(240)
  })
})

describe('mixPalette', () => {
  it('在 0/1 处返回原对象，避免无谓的字符串处理', () => {
    expect(mixPalette(COLD, GREEN, 0)).toBe(COLD)
    expect(mixPalette(COLD, GREEN, 1)).toBe(GREEN)
  })

  it('逐字段插值', () => {
    const mixed = mixPalette(COLD, GREEN, 0.5)
    expect(mixed.paper).not.toBe(COLD.paper)
    expect(mixed.paper).not.toBe(GREEN.paper)
    expect(Object.keys(mixed).sort()).toEqual(Object.keys(COLD).sort())
  })
})

describe('paletteCssVars', () => {
  it('字段名与 tokens.css 的变量名对齐', () => {
    expect(paletteCssVars(COLD)).toEqual({
      '--paper': COLD.paper,
      '--paper-deep': COLD.paperDeep,
      '--wash': COLD.wash,
      '--ink': COLD.ink,
      '--ink-soft': COLD.inkSoft,
      '--line': COLD.line,
    })
  })
})
