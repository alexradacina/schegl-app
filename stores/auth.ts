import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { authAPI } from "@/services/api"

export const useAuthStore = defineStore("auth", () => {
  const user = ref<any>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const initializeAuth = () => {
    const storedToken = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("user_data")

    if (storedToken && storedUser) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        // If parsing fails, clear storage
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_data")
      }
    }
  }

  const login = async (credentials: { email: string; password: string }) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await authAPI.login(credentials)

      if (response.data.success) {
        token.value = response.data.token
        user.value = response.data.user

        // Store in localStorage
        localStorage.setItem("auth_token", token.value)
        localStorage.setItem("user_data", JSON.stringify(user.value))

        return { success: true }
      } else {
        error.value = response.data.message || "Login failed"
        return { success: false, message: error.value }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Login failed"
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await authAPI.logout()
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      clearAuth()
    }
  }

  const clearAuth = () => {
    user.value = null
    token.value = null
    error.value = null
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
  }

  // Initialize on store creation
  initializeAuth()

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    clearAuth,
  }
})
