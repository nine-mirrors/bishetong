<script setup>
// ── 全局搜索（Ctrl / Cmd + K） ──
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { globalSearch } from '@/shared/api/search.js'
import { PROJECT_PHASE, ROLE } from '@/shared/types/dict.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const inputRef = ref(null)
const keyword = ref('')
const loading = ref(false)
const results = ref({ topics: [], projects: [], users: [] })

let timer = null

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    keyword.value = ''
    results.value = { topics: [], projects: [], users: [] }
    await nextTick()
    inputRef.value?.focus()
  },
)

watch(keyword, (value) => {
  if (timer) clearTimeout(timer)
  const text = value.trim()
  if (!text) {
    results.value = { topics: [], projects: [], users: [] }
    return
  }
  timer = setTimeout(() => runSearch(text), 260)
})

async function runSearch(text) {
  loading.value = true
  try {
    results.value = await globalSearch(text)
  } catch {
    results.value = { topics: [], projects: [], users: [] }
  } finally {
    loading.value = false
  }
}

const hasResults = () => {
  const { topics, projects, users } = results.value
  return topics.length + projects.length + users.length > 0
}

const resultCount = computed(() => {
  const { topics, projects, users } = results.value
  return topics.length + projects.length + users.length
})

function close() {
  emit('update:modelValue', false)
}

function focusInput() {
  setTimeout(() => inputRef.value?.focus(), 120)
}

function openTopic(topic) {
  close()
  router.push({ name: 'Topics', query: { keyword: topic.title } })
}

function openProject(project) {
  close()
  router.push({ name: 'ProjectDetail', params: { id: project.id } })
}

function openUser(user) {
  close()
  router.push({ name: 'AdminUsers', query: { keyword: user.email } })
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="460px"
    :with-header="false"
    append-to-body
    class="search-drawer"
    @opened="focusInput"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="drawer-shell">
      <header class="drawer-head">
        <div>
          <p class="eyebrow">GLOBAL SEARCH</p>
          <h3 class="drawer-title">全局搜索</h3>
        </div>
        <button type="button" class="drawer-close" @click="close">关闭</button>
      </header>

      <div class="search-box">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          ref="inputRef"
          v-model="keyword"
          class="search-input"
          placeholder="搜索课题、项目或用户"
          @keydown.esc="close"
        />
        <span class="search-kbd">ESC</span>
      </div>

      <div class="search-body">
        <p v-if="loading" class="search-hint">搜索中…</p>
        <p v-else-if="!keyword.trim()" class="search-hint">输入关键词，回车或稍候自动搜索</p>
        <p v-else-if="!hasResults()" class="search-hint">没有找到匹配结果</p>

        <template v-else>
          <section v-if="results.topics.length" class="group">
            <p class="group-title">课题 · {{ results.topics.length }}</p>
            <button
              v-for="topic in results.topics"
              :key="topic.id"
              type="button"
              class="result-row"
              @click="openTopic(topic)"
            >
              <span class="result-main">{{ topic.title }}</span>
              <span class="result-meta">课题</span>
            </button>
          </section>

          <section v-if="results.projects.length" class="group">
            <p class="group-title">项目 · {{ results.projects.length }}</p>
            <button
              v-for="project in results.projects"
              :key="project.id"
              type="button"
              class="result-row"
              @click="openProject(project)"
            >
              <span class="result-main">{{ project.title }}</span>
              <span class="result-meta">{{ project.student.name }} · {{ PROJECT_PHASE[project.currentPhase].label }}</span>
            </button>
          </section>

          <section v-if="results.users.length" class="group">
            <p class="group-title">用户 · {{ results.users.length }}</p>
            <button
              v-for="user in results.users"
              :key="user.id"
              type="button"
              class="result-row"
              @click="openUser(user)"
            >
              <span class="result-main">{{ user.name }}</span>
              <span class="result-meta">{{ user.email }} · {{ ROLE[user.role]?.label || user.role }}</span>
            </button>
          </section>
        </template>
      </div>

      <div class="search-foot">
        <span class="num">{{ resultCount }} RESULTS</span>
        <span><span class="key">ESC</span> 关闭</span>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.drawer-title {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.drawer-close {
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--surface);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease;
}

.drawer-close:hover {
  border-color: var(--jade-300);
  color: var(--jade-700);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-soft);
}

.search-icon {
  color: var(--text-faint);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-faint);
}

.search-kbd,
.key {
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-faint);
  background: var(--surface);
}

.search-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 12px;
}

.search-hint {
  margin: 28px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}

.group {
  margin-bottom: 10px;
}

.group-title {
  margin: 0 0 4px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.result-row:hover {
  background: var(--jade-100);
}

.result-main {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-faint);
  white-space: nowrap;
}

.search-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--line-soft);
  font-size: 10px;
  color: var(--text-faint);
}

@media (max-width: 600px) {
  .drawer-shell {
    padding: 18px;
  }
}
</style>

<style>
.search-drawer .el-drawer__body {
  padding: 0;
}

.search-drawer.el-drawer {
  max-width: 100%;
}
</style>
