/**
 * Vitest 的浏览器环境补丁。
 *
 * jsdom 没有实现 ResizeObserver / matchMedia / requestAnimationFrame 的完整行为，
 * 而长卷组件会在挂载时用到它们。这里提供最小可用替身，让组件测试关注逻辑而不是
 * 浏览器能力。
 */

import { vi } from 'vitest'

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((handle: number) =>
    clearTimeout(handle as unknown as NodeJS.Timeout)) as typeof cancelAnimationFrame
}
