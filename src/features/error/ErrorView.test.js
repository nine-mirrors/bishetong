import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ErrorView from './ErrorView.vue'

const buttonStub = {
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
}

async function mountError(query) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/error', name: 'Error', component: ErrorView },
      { path: '/login', name: 'Login', component: { template: '<div>login</div>' } },
      { path: '/topics', name: 'Topics', component: { template: '<div>topics</div>' } },
    ],
  })
  await router.push({ path: '/error', query })
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(ErrorView, {
    global: {
      plugins: [router, pinia],
      stubs: { 'el-button': buttonStub },
    },
  })
}

describe('ErrorView', () => {
  it('403 展示无权限标题与错误码', async () => {
    const wrapper = await mountError({ code: '403' })

    expect(wrapper.text()).toContain('没有访问权限')
    expect(wrapper.text()).toContain('SYS / ACCESS_DENIED')
    expect(wrapper.text()).toContain('ERROR CODE 403')
  })

  it('允许通过 query 覆盖提示文案', async () => {
    const wrapper = await mountError({ code: '403', message: '当前账号没有访问该页面的权限' })

    expect(wrapper.text()).toContain('当前账号没有访问该页面的权限')
  })
})
