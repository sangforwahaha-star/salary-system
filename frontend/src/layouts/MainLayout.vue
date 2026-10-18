<template>
  <el-container class="main-layout">
    <!-- 桌面端侧边栏 -->
    <el-aside width="220px" class="sidebar desktop-only">
      <div class="logo">
        <div class="logo-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#logoGrad)"/>
            <path d="M8 14h12M14 8v12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <defs><linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28"><stop stop-color="#3B82F6"/><stop offset="1" stop-color="#1D4ED8"/></linearGradient></defs>
          </svg>
        </div>
        <span class="logo-text">集团信息技术中心<br/>薪酬助手</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/detail">
          <el-icon><Document /></el-icon>
          <span>工资明细</span>
        </el-menu-item>
        <el-menu-item index="/comparison">
          <el-icon><TrendCharts /></el-icon>
          <span>对比分析</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.isAdmin || userStore.isDeptAdmin" index="/admin/employees">
          <el-icon><Setting /></el-icon>
          <span>数据管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <!-- 移动端顶部栏 -->
      <el-header class="header mobile-only">
        <div class="header-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand" trigger="click">
            <el-avatar :size="36" class="user-avatar">{{ userStore.user?.name?.charAt(0) }}</el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 桌面端顶部栏 -->
      <el-header class="header desktop-only">
        <div class="header-left">
          <span class="greeting">{{ greeting }}，{{ userStore.user?.name }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">{{ userStore.user?.name?.charAt(0) }}</el-avatar>
              <span class="user-name">{{ userStore.user?.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content" :class="{ 'mobile-main': isMobile }">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
      
      <!-- 移动端底部导航 -->
      <el-footer class="mobile-footer mobile-only" :style="{ paddingBottom: safeAreaBottom }">
        <div class="bottom-nav">
          <div 
            class="nav-item" 
            :class="{ active: activeMenu === '/' }"
            @click="router.push('/')"
          >
            <el-icon><HomeFilled /></el-icon>
            <span>工作台</span>
          </div>
          <div 
            class="nav-item"
            :class="{ active: activeMenu === '/detail' }"
            @click="router.push('/detail')"
          >
            <el-icon><Document /></el-icon>
            <span>工资明细</span>
          </div>
          <div 
            class="nav-item"
            :class="{ active: activeMenu === '/comparison' }"
            @click="router.push('/comparison')"
          >
            <el-icon><TrendCharts /></el-icon>
            <span>对比分析</span>
          </div>
          <div 
            v-if="userStore.isAdmin || userStore.isDeptAdmin"
            class="nav-item"
            :class="{ active: activeMenu.startsWith('/admin') }"
            @click="router.push('/admin/employees')"
          >
            <el-icon><Setting /></el-icon>
            <span>管理</span>
          </div>
        </div>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const windowWidth = ref(window.innerWidth)

const isMobile = computed(() => windowWidth.value < 768)

const safeAreaBottom = computed(() => {
  return isMobile.value ? 'env(safe-area-inset-bottom, 0px)' : '0px'
})

const activeMenu = computed(() => {
  if (route.path.startsWith('/admin')) return '/admin/employees'
  return route.path
})

const pageTitle = computed(() => {
  if (route.path === '/') return '工作台'
  if (route.path === '/detail') return '工资明细'
  if (route.path === '/comparison') return '对比分析'
  if (route.path.startsWith('/admin')) return '数据管理'
  return '薪酬助手'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

function handleCommand(command: string) {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (command === 'password') {
    router.push('/password')
  }
}

function handleResize() {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background: var(--card-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  height: 64px;
  border-bottom: 1px solid var(--border-color);
}

.logo-text {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  padding: var(--spacing-sm) 0;
}

.sidebar-menu .el-menu-item {
  margin: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  height: 44px;
  line-height: 44px;
}

.sidebar-menu .el-menu-item.is-active {
  background: var(--primary-color);
  color: white;
}

.sidebar-menu .el-menu-item.is-active .el-icon {
  color: white;
}

.header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-xl);
  height: 64px;
}

.greeting {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.user-avatar {
  background: var(--primary-gradient);
  color: white;
  font-weight: 600;
}

.user-name {
  color: var(--text-primary);
  font-weight: 500;
}

.main-content {
  background: var(--bg-color);
  overflow-y: auto;
  padding: var(--spacing-xl);
}
</style>

<style>
/* 移动端适配 - 非scoped，用元素选择器提高优先级以覆盖el组件默认样式 */
.el-aside.desktop-only { display: flex !important; }
.el-header.desktop-only { display: flex !important; }
.el-header.mobile-only { display: none !important; }
.el-footer.mobile-only { display: none !important; }

@media (max-width: 767px) {
  .el-aside.desktop-only { display: none !important; }
  .el-header.desktop-only { display: none !important; }
  .el-header.mobile-only { display: flex !important; }
  .el-footer.mobile-only { display: flex !important; }
  
  .main-layout .header {
    height: 56px;
    padding: 0 16px;
    padding-top: env(safe-area-inset-top, 0px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  
  .main-layout .header-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    margin-right: 16px;
  }
  
  .main-layout .header-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  
  .main-layout .page-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100vw - 120px);
  }
  
  .main-layout .user-avatar {
    flex-shrink: 0;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* 移动端隐藏内容区重复标题 */
  .page-header h2 {
    display: none !important;
  }
  
  .page-header {
    margin-bottom: 16px !important;
  }
  
  .main-layout .main-content {
    padding: 16px;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }
  
  .main-layout .mobile-main {
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }
  
  .main-layout .mobile-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: auto;
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    z-index: 100;
    padding: 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  
  .main-layout .bottom-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 60px;
  }
  
  .main-layout .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 60px;
    min-height: 60px;
  }
  
  .main-layout .nav-item .el-icon {
    font-size: 22px;
    color: var(--text-secondary);
  }
  
  .main-layout .nav-item span {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .main-layout .nav-item.active .el-icon,
  .main-layout .nav-item.active span {
    color: var(--primary-color);
  }
  
  .main-layout .nav-item:active {
    background: var(--bg-color);
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-layout .sidebar {
    width: 180px !important;
  }
  
  .main-layout .logo-text {
    font-size: 14px;
  }
}
</style>
