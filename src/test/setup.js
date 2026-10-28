// ── Vitest 全局测试环境 ──
import { vi } from 'vitest'

// jsdom 未实现 matchMedia，组件中若用到可拿到安全的默认值
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
