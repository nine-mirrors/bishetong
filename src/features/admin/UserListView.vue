<script setup>
// ── 用户管理（教务） ──
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.js'
import {
  createUser,
  fetchUsers,
  resetUserPassword,
  updateUserStatus,
} from '@/shared/api/user.js'
import { ROLE, USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/shared/types/dict.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import { formatDate } from '@/shared/utils/format.js'

const route = useRoute()
const auth = useAuthStore()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({
  keyword: String(route.query.keyword || ''),
  role: '',
  status: '',
  page: 1,
  pageSize: 10,
})

async function loadUsers() {
  loading.value = true
  try {
    const result = await fetchUsers(query)
    rows.value = result.list
    total.value = result.total
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadUsers()
}

function handleReset() {
  query.keyword = ''
  query.role = ''
  query.status = ''
  query.page = 1
  loadUsers()
}

function handlePageChange(page) {
  query.page = page
  loadUsers()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.page = 1
  loadUsers()
}

onMounted(loadUsers)

// 全局搜索跳转时同步关键词
watch(
  () => route.query.keyword,
  (value) => {
    if (value === undefined) return
    query.keyword = String(value)
    query.page = 1
    loadUsers()
  },
)

async function toggleStatus(row, next) {
  if (row.id === auth.user?.id) {
    ElMessage.warning('不能停用当前登录账号')
    return
  }
  if (!next) {
    try {
      await ElMessageBox.confirm(`停用后 ${row.name} 将无法登录，确认继续？`, '停用账号', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  try {
    await updateUserStatus(row.id, next)
    row.isActive = next
    ElMessage.success(next ? '账号已启用' : '账号已停用')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// ── 新建用户 ──
const createVisible = ref(false)
const createRef = ref(null)
const creating = ref(false)
const createForm = reactive({
  name: '',
  email: '',
  password: '123456',
  role: 'STUDENT',
  studentNo: '',
  department: '',
})

const createRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function openCreate() {
  createForm.name = ''
  createForm.email = ''
  createForm.password = '123456'
  createForm.role = 'STUDENT'
  createForm.studentNo = ''
  createForm.department = ''
  createVisible.value = true
}

async function submitCreate() {
  if (!createRef.value) return
  const valid = await createRef.value.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    await createUser({ ...createForm })
    ElMessage.success('用户已创建')
    createVisible.value = false
    handleSearch()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    creating.value = false
  }
}

// ── 重置密码 ──
const resetVisible = ref(false)
const resetTarget = ref(null)
const resetting = ref(false)
const resetForm = reactive({ password: '' })

function openReset(row) {
  resetTarget.value = row
  resetForm.password = '123456'
  resetVisible.value = true
}

async function submitReset() {
  if (resetForm.password.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  resetting.value = true
  try {
    await resetUserPassword(resetTarget.value.id, resetForm.password)
    ElMessage.success('密码已重置')
    resetVisible.value = false
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">USER DIRECTORY</p>
        <h1 class="page-title">用户管理</h1>
        <p class="page-sub">维护学生、导师与教务账号，控制登录权限并重置密码。</p>
      </div>
      <div class="page-head-actions">
        <el-button type="primary" @click="openCreate">新建用户</el-button>
      </div>
    </header>

    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        class="search"
        placeholder="搜索姓名 / 邮箱 / 学号"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="query.role" class="filter" placeholder="全部角色" @change="handleSearch">
        <el-option label="全部角色" value="" />
        <el-option v-for="item in USER_ROLE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="query.status" class="filter" placeholder="全部状态" @change="handleSearch">
        <el-option v-for="item in USER_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button text @click="handleReset">重置</el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-meta num">{{ total }} USERS</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">账号列表</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">停用后无法登录，历史数据保留</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="rows" empty-text="暂无用户">
          <template #empty>
            <EmptyState title="没有匹配的用户" description="调整搜索条件，或新建一个账号。" />
          </template>
          <el-table-column label="用户" min-width="230">
            <template #default="{ row }">
              <div class="user-cell">
                <span class="avatar">{{ row.name.slice(0, 1) }}</span>
                <div>
                  <div class="cell-main">{{ row.name }}</div>
                  <div class="cell-sub">{{ row.email }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="ROLE[row.role].elType" effect="light">{{ ROLE[row.role].label }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="学号 / 院系" min-width="180">
            <template #default="{ row }">
              <div class="cell-main num">{{ row.studentNo || '—' }}</div>
              <div class="cell-sub">{{ row.department || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-switch
                :model-value="row.isActive"
                :disabled="row.id === auth.user?.id"
                inline-prompt
                active-text="启用"
                inactive-text="停用"
                @change="toggleStatus(row, $event)"
              />
            </template>
          </el-table-column>

          <el-table-column label="创建时间" width="130">
            <template #default="{ row }">
              <span class="date num">{{ formatDate(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="130" align="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openReset(row)">重置密码</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="panel-foot">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog v-model="createVisible" title="新建用户" width="520px">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="form-grid">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="createForm.name" maxlength="20" />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model="createForm.role">
              <el-option v-for="item in USER_ROLE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="name@school.edu" />
        </el-form-item>
        <el-form-item label="初始密码" prop="password">
          <el-input v-model="createForm.password" type="password" show-password />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="学号">
            <el-input v-model="createForm.studentNo" maxlength="20" />
          </el-form-item>
          <el-form-item label="院系">
            <el-input v-model="createForm.department" maxlength="30" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetVisible" title="重置密码" width="440px">
      <p class="dialog-hint">{{ resetTarget?.name }} · {{ resetTarget?.email }}</p>
      <el-form label-position="top">
        <el-form-item label="新密码">
          <el-input v-model="resetForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetting" @click="submitReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search {
  width: 280px;
}

.filter {
  width: 140px;
}

.toolbar-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.panel-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-count {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.panel-note {
  font-size: 10.5px;
  color: var(--text-faint);
}

.table-wrap {
  padding: 0 20px;
}

.panel-foot {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--line-soft);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--jade-100);
  color: var(--jade-700);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.cell-main {
  font-size: 13px;
  color: var(--text-primary);
}

.cell-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-faint);
}

.date {
  font-size: 11px;
  color: var(--text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dialog-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .search {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
