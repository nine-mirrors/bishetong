<script setup>
// ── 根组件：启动加载 + 路由进度 + 全局转场 ──
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppLoading from '@/shared/components/AppLoading.vue'
import RouteProgress from '@/shared/components/RouteProgress.vue'
import CustomCursor from '@/shared/components/CustomCursor.vue'
import { finishProgress, startProgress } from '@/app/progress.js'

const router = useRouter()
const ready = ref(false)

router.beforeEach(() => {
  startProgress()
  return true
})

router.afterEach(() => {
  finishProgress()
})

onMounted(async () => {
  await router.isReady()
  ready.value = true
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <CustomCursor />
    <RouteProgress />
    <AppLoading v-if="!ready" message="正在进入工作台" />

    <router-view v-else v-slot="{ Component }">
      <transition name="shell" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </el-config-provider>
</template>
