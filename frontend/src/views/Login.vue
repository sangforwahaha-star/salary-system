<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
    </div>
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#loginGrad)"/>
              <path d="M14 24h20M24 14v20" stroke="white" stroke-width="3" stroke-linecap="round"/>
              <defs><linearGradient id="loginGrad" x1="0" y1="0" x2="48" y2="48"><stop stop-color="#3B82F6"/><stop offset="1" stop-color="#1D4ED8"/></linearGradient></defs>
            </svg>
          </div>
          <h1>集团信息技术中心薪酬助手</h1>
          <p class="login-subtitle">员工薪酬查询系统</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin" class="login-form">
          <el-form-item prop="name">
            <el-input
              v-model="form.name"
              placeholder="请输入姓名"
              :prefix-icon="User"
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <div class="form-options">
              <el-checkbox v-model="rememberMe">记住账号</el-checkbox>
              <el-link type="primary" :underline="false" @click="showForgotPassword">忘记密码？</el-link>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" :loading="loading" @click="handleLogin" class="login-btn">
              登 录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      <div class="login-footer">
        <p>© 2026 集团信息技术中心 · 薪酬助手 · 内部系统</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(false)

const form = ref({
  name: localStorage.getItem('remembered_name') || '',
  password: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    router.push('/')
  }
})

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await api.post('/auth/login', form.value) as any
    userStore.setAuth(res.token, res.user)
    
    if (rememberMe.value) {
      localStorage.setItem('remembered_name', form.value.name)
    } else {
      localStorage.removeItem('remembered_name')
    }

    ElMessage.success('登录成功')
    
    // 确保路由跳转
    await new Promise(resolve => setTimeout(resolve, 100))
    if (res.user.must_change_password) {
      await router.push('/password')
    } else {
      await router.push('/')
    }
  } catch (err: any) {
    const errorMsg = err.error || '登录失败'
    if (err.locked) {
      ElMessage.error({
        message: errorMsg,
        duration: 5000
      })
    } else {
      ElMessage.error(errorMsg)
    }
  } finally {
    loading.value = false
  }
}

function showForgotPassword() {
  ElMessageBox.alert(
    '如忘记密码，请联系系统管理员重置密码',
    '忘记密码',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  background: white;
}

.bg-shape-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -100px;
  animation: float 20s ease-in-out infinite;
}

.bg-shape-2 {
  width: 400px;
  height: 400px;
  bottom: -100px;
  left: -100px;
  animation: float 15s ease-in-out infinite reverse;
}

.bg-shape-3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 50%;
  animation: float 18s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -30px); }
}

.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
}

.login-card {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-2xl) 48px;
  width: 420px;
  max-width: 90vw;
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.login-logo {
  margin-bottom: var(--spacing-lg);
}

.login-header h1 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.login-form {
  margin-top: var(--spacing-xl);
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: var(--font-size-md);
  font-weight: 600;
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-sm);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-footer {
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-xs);
}

/* 移动端适配 */
@media (max-width: 767px) {
  .login-page {
    padding: 16px;
    padding-top: env(safe-area-inset-top, 16px);
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }

  .login-card {
    width: 100%;
    max-width: 100%;
    padding: 32px 20px;
    border-radius: 16px;
  }

  .login-header h1 {
    font-size: 20px;
  }

  .login-subtitle {
    font-size: 13px;
  }

  .login-logo svg {
    width: 40px;
    height: 40px;
  }

  .login-form :deep(.el-input__wrapper) {
    height: 48px;
    line-height: 48px;
  }

  .login-form :deep(.el-input__inner) {
    height: 48px;
    font-size: 16px;
  }

  .login-btn {
    height: 48px;
    font-size: 16px;
  }

  .form-options {
    padding: 4px 0;
  }

  .form-options :deep(.el-checkbox__label) {
    font-size: 14px;
    padding-left: 8px;
  }

  .form-options :deep(.el-checkbox__input) {
    min-width: 20px;
    min-height: 20px;
  }

  .bg-shape-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    right: -50px;
  }

  .bg-shape-2 {
    width: 200px;
    height: 200px;
  }

  .bg-shape-3 {
    width: 150px;
    height: 150px;
  }

  .login-footer {
    font-size: 11px;
    text-align: center;
  }
}
</style>
