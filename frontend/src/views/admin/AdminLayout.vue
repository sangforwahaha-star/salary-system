<template>
  <div class="admin-layout">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="员工管理" name="employees" />
      <el-tab-pane label="工资导入" name="salaries" />
      <el-tab-pane v-if="userStore.isAdmin" label="操作日志" name="logs" />
    </el-tabs>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(route.path.split('/').pop() || 'employees')

function handleTabChange(tab: string) {
  router.push(`/admin/${tab}`)
}

watch(() => route.path, (path) => {
  activeTab.value = path.split('/').pop() || 'employees'
})
</script>

<style scoped>
.admin-layout {
  max-width: 1400px;
  margin: 0 auto;
}

:deep(.el-tabs__header) {
  margin-bottom: var(--spacing-xl);
}

/* 移动端适配 */
@media (max-width: 767px) {
  :deep(.el-tabs__nav-wrap) {
    overflow-x: auto;
  }

  :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 14px;
    min-width: auto;
  }

  :deep(.el-tabs__nav-scroll) {
    padding: 0 8px;
  }
}
</style>
