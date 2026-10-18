<template>
  <div class="employee-manage">
    <div class="action-bar">
      <el-button type="primary" @click="showImportDialog = true">
        <el-icon><Upload /></el-icon>导入员工信息
      </el-button>
      <el-button @click="downloadTemplate">
        <el-icon><Download /></el-icon>下载模板
      </el-button>
    </div>

    <el-table :data="employees" v-loading="loading" stripe>
      <el-table-column prop="employee_no" label="工号" width="120" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="department" label="部门" width="150" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="getRoleType(row.role)">{{ getRoleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '在职' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button v-if="userStore.isAdmin" size="small" @click="handleResetPassword(row)">重置密码</el-button>
          <el-button v-if="userStore.isAdmin" size="small" :type="row.status === 1 ? 'danger' : 'success'" @click="handleToggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
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

    <el-dialog v-model="showImportDialog" title="导入员工信息" width="600px">
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx/.xls 文件，最大 10MB</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showResultDialog" title="导入结果" width="500px">
      <div class="import-result">
        <el-result :icon="importResult.failed > 0 ? 'warning' : 'success'" :title="`导入完成`">
          <template #sub-title>
            <p>成功: {{ importResult.success }} 条</p>
            <p>失败: {{ importResult.failed }} 条</p>
          </template>
        </el-result>
        <div v-if="importResult.passwords?.length" class="password-section">
          <h4>初始密码清单（仅此一次可见）</h4>
          <el-button size="small" @click="exportPasswords">导出密码清单</el-button>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showResultDialog = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import api from '../../utils/api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const loading = ref(true)
const employees = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20

const showImportDialog = ref(false)
const showResultDialog = ref(false)
const importing = ref(false)
const selectedFile = ref<UploadFile>()
const importResult = ref<any>({})

function getRoleType(role: string) {
  return role === 'admin' ? 'danger' : role === 'dept_admin' ? 'warning' : ''
}

function getRoleLabel(role: string) {
  return role === 'admin' ? '系统管理员' : role === 'dept_admin' ? '部门管理员' : '普通员工'
}

async function loadEmployees() {
  loading.value = true
  try {
    const res = await api.get('/users', {
      params: { page: currentPage.value, limit: pageSize }
    }) as any
    employees.value = res.data
    total.value = res.total
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadEmployees()
}

function handleFileChange(file: UploadFile) {
  selectedFile.value = file
}

async function handleImport() {
  if (!selectedFile.value?.raw) {
    ElMessage.warning('请选择文件')
    return
  }

  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value.raw)
    const res = await api.post('/import/employees', formData) as any
    importResult.value = res.details
    showImportDialog.value = false
    showResultDialog.value = true
    loadEmployees()
  } catch (err: any) {
    ElMessage.error(err.error || '导入失败')
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  window.open('/api/import/templates/employees', '_blank')
}

async function handleResetPassword(row: any) {
  const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.{6,}/,
    inputErrorMessage: '密码长度至少6位'
  })

  try {
    await api.post('/users/reset-password', { user_id: row.id, new_password: value })
    ElMessage.success('密码重置成功')
  } catch (err: any) {
    ElMessage.error(err.error || '重置失败')
  }
}

async function handleToggleStatus(row: any) {
  const action = row.status === 1 ? '停用' : '启用'
  await ElMessageBox.confirm(`确定${action}该用户？`, '提示')
  
  try {
    await api.put('/users/status', { user_id: row.id, status: row.status === 1 ? 0 : 1 })
    ElMessage.success(`${action}成功`)
    loadEmployees()
  } catch (err: any) {
    ElMessage.error(err.error || '操作失败')
  }
}

function exportPasswords() {
  const csv = ['工号,姓名,初始密码']
  importResult.value.passwords.forEach((p: any) => {
    csv.push(`${p.employee_no},${p.name},${p.password}`)
  })
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'initial_passwords.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadEmployees)
</script>

<style scoped>
.action-bar {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.import-result {
  text-align: center;
}

.password-section {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: #FEF3C7;
  border-radius: var(--radius-sm);
}

.password-section h4 {
  margin-bottom: var(--spacing-md);
  color: var(--warning-color);
}

/* 移动端适配 */
@media (max-width: 767px) {
  .action-bar {
    flex-direction: column;
    gap: 12px;
  }

  .action-bar .el-button {
    width: 100%;
    height: 44px;
  }

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

  :deep(.el-dialog) {
    width: 90% !important;
    max-width: 100vw;
    margin: 0 auto;
  }

  :deep(.el-upload-dragger) {
    padding: 20px;
  }
}
</style>
