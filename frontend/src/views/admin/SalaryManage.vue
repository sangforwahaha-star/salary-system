<template>
  <div class="salary-manage">
    <div class="action-bar">
      <el-button type="primary" @click="showImportDialog = true">
        <el-icon><Upload /></el-icon>导入工资数据
      </el-button>
      <el-button @click="downloadTemplate">
        <el-icon><Download /></el-icon>下载模板
      </el-button>
    </div>

    <el-alert title="提示" type="info" :closable="false" style="margin-bottom: var(--spacing-xl)">
      <p>请先确保员工信息已导入，工资数据中的工号必须与员工信息中的工号对应。</p>
    </el-alert>

    <el-dialog v-model="showImportDialog" title="导入工资数据" width="600px">
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
      <el-result :icon="importResult.failed > 0 ? 'warning' : 'success'" title="导入完成">
        <template #sub-title>
          <p>成功: {{ importResult.success }} 条</p>
          <p v-if="importResult.failed > 0">失败: {{ importResult.failed }} 条</p>
        </template>
      </el-result>
      <template #footer>
        <el-button type="primary" @click="showResultDialog = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import api from '../../utils/api'

const showImportDialog = ref(false)
const showResultDialog = ref(false)
const importing = ref(false)
const selectedFile = ref<UploadFile>()
const importResult = ref<any>({})

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
    const res = await api.post('/import/salaries', formData) as any
    importResult.value = {
      success: res.summary.success,
      failed: res.summary.failed
    }
    showImportDialog.value = false
    showResultDialog.value = true
  } catch (err: any) {
    ElMessage.error(err.error || '导入失败')
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  window.open('/api/import/templates/salaries', '_blank')
}
</script>

<style scoped>
.action-bar {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
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

  :deep(.el-dialog) {
    width: 90% !important;
    max-width: 100vw;
    margin: 0 auto;
  }

  :deep(.el-upload-dragger) {
    padding: 20px;
  }

  :deep(.el-alert) {
    font-size: 13px;
  }
}
</style>
