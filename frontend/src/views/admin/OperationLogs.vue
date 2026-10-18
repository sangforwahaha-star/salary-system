<template>
  <div class="operation-logs">
    <el-table :data="logs" v-loading="loading" stripe>
      <el-table-column prop="created_at" label="时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column prop="user_name" label="操作人" width="120" />
      <el-table-column prop="operation_type" label="操作类型" width="150">
        <template #default="{ row }">
          <el-tag>{{ getOperationLabel(row.operation_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operation_content" label="操作内容" />
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="handlePageChange"
      style="margin-top: var(--spacing-xl); justify-content: flex-end"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../utils/api'

const loading = ref(true)
const logs = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 50

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getOperationLabel(type: string) {
  const map: Record<string, string> = {
    LOGIN: '登录',
    CHANGE_PASSWORD: '修改密码',
    RESET_PASSWORD: '重置密码',
    IMPORT_EMPLOYEES: '导入员工',
    IMPORT_SALARIES: '导入工资',
    UPDATE_STATUS: '更新状态'
  }
  return map[type] || type
}

async function loadLogs() {
  loading.value = true
  try {
    const res = await api.get('/import/logs', {
      params: { page: currentPage.value, limit: pageSize }
    }) as any
    logs.value = res.data
    total.value = res.total
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadLogs()
}

onMounted(loadLogs)
</script>

<style scoped>
/* 移动端适配 */
@media (max-width: 767px) {
  :deep(.el-table) {
    font-size: 13px;
  }

  :deep(.el-table th) {
    padding: 8px 0;
    font-size: 12px;
  }

  :deep(.el-table td) {
    padding: 8px 0;
  }

  :deep(.el-table .cell) {
    padding: 0 8px;
    word-break: break-word;
  }

  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
}
</style>
