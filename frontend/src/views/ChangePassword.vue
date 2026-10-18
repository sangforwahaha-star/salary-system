<template>
  <div class="change-password">
    <div class="card password-card">
      <h2>{{ userStore.mustChangePassword ? '首次登录请修改密码' : '修改密码' }}</h2>
      <el-alert 
        v-if="userStore.mustChangePassword"
        title="为保障账户安全，首次登录必须修改密码" 
        type="warning" 
        :closable="false"
        style="margin-bottom: var(--spacing-xl)"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="旧密码" prop="old_password">
          <el-input v-model="form.old_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
          <el-input v-model="form.new_password" type="password" show-password />
          <div class="password-hint">
            密码要求：至少8位，包含大写字母、小写字母、数字和特殊字符
          </div>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm_password">
          <el-input v-model="form.confirm_password" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">确认修改</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const rules = {
  old_password: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passwordRegex.test(value)) {
          callback(new Error('密码至少8位，需包含大写字母、小写字母、数字和特殊字符'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  confirm_password: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== form.value.new_password) {
          callback(new Error('两次密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await api.post('/auth/change-password', {
      old_password: form.value.old_password,
      new_password: form.value.new_password
    })
    
    ElMessage.success('密码修改成功')
    userStore.updateMustChangePassword(false)
    
    if (userStore.mustChangePassword) {
      router.push('/')
    }
  } catch (err: any) {
    ElMessage.error(err.error || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-password {
  max-width: 600px;
  margin: 0 auto;
}

.password-card {
  padding: var(--spacing-2xl);
}

.password-card h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-xl);
}

.password-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

/* 移动端适配 */
@media (max-width: 767px) {
  .password-card {
    padding: 24px 16px;
  }

  .password-card h2 {
    font-size: 18px;
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
  }

  :deep(.el-input__wrapper) {
    height: 44px;
  }

  :deep(.el-input__inner) {
    height: 44px;
    font-size: 16px;
  }

  :deep(.el-form-item) {
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.el-form-item__label) {
    width: auto !important;
    margin-bottom: 4px;
  }

  :deep(.el-form-item__content) {
    width: 100%;
  }

  .password-hint {
    font-size: 12px;
  }

  :deep(.el-button) {
    width: 100%;
    height: 44px;
  }
}
</style>
