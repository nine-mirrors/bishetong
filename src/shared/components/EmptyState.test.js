import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from './EmptyState.vue'

const buttonStub = {
  template: '<button type="button"><slot /></button>',
}

describe('EmptyState', () => {
  it('渲染默认标题与自定义描述', () => {
    const wrapper = mount(EmptyState, {
      props: { description: '提交后会出现在这里' },
      global: { stubs: { 'el-button': buttonStub } },
    })

    expect(wrapper.text()).toContain('暂无数据')
    expect(wrapper.text()).toContain('提交后会出现在这里')
  })

  it('有操作文案时点击触发 action 事件', async () => {
    const wrapper = mount(EmptyState, {
      props: { title: '还没有项目', actionText: '去选题' },
      global: { stubs: { 'el-button': buttonStub } },
    })

    expect(wrapper.text()).toContain('还没有项目')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })
})
