import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        { path: '', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
        { path: 'detail', name: 'Detail', component: () => import('../views/SalaryDetail.vue') },
        { path: 'comparison', name: 'Comparison', component: () => import('../views/Comparison.vue') },
        { path: 'password', name: 'Password', component: () => import('../views/ChangePassword.vue') },
        {
          path: 'admin',
          name: 'Admin',
          component: () => import('../views/admin/AdminLayout.vue'),
          meta: { requiresAdmin: true },
          redirect: '/admin/employees',
          children: [
            { path: 'employees', name: 'EmployeeManage', component: () => import('../views/admin/EmployeeManage.vue') },
            { path: 'salaries', name: 'SalaryManage', component: () => import('../views/admin/SalaryManage.vue') },
            { path: 'logs', name: 'OperationLogs', component: () => import('../views/admin/OperationLogs.vue'), meta: { requiresAdmin: true } }
          ]
        }
      ]
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.public) {
    if (userStore.token && !to.path.includes('login')) {
      next('/')
    } else {
      next()
    }
    return
  }

  if (!userStore.token) {
    next('/login')
    return
  }

  if (userStore.mustChangePassword && to.name !== 'Password') {
    next('/password')
    return
  }

  // Admin route guard
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    if (!userStore.isAdmin && !userStore.isDeptAdmin) {
      next('/')
      return
    }
    // Operation logs only for admin
    if (to.name === 'OperationLogs' && !userStore.isAdmin) {
      next('/')
      return
    }
  }

  next()
})

export default router
