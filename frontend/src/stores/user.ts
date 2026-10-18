import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isDeptAdmin = computed(() => user.value?.role === 'dept_admin')
  const mustChangePassword = computed(() => user.value?.must_change_password)

  function setAuth(tokenValue: string, userData: any) {
    token.value = tokenValue
    user.value = userData
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function updateMustChangePassword(value: boolean) {
    if (user.value) {
      user.value.must_change_password = value
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  return { token, user, isLoggedIn, isAdmin, isDeptAdmin, mustChangePassword, setAuth, logout, updateMustChangePassword }
})
