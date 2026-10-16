import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authApi } from "@/lib/api"

interface User {
  id: string
  email: string
  username: string
  role: string
  avatar?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
  setToken: (token: string) => void
  loadProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await authApi.login({ email, password })
          const { user, accessToken } = res.data
          localStorage.setItem("accessToken", accessToken)
          set({ user, accessToken, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      signup: async (email, username, password) => {
        set({ isLoading: true })
        try {
          const res = await authApi.signup({ email, username, password })
          const { user, accessToken } = res.data
          localStorage.setItem("accessToken", accessToken)
          set({ user, accessToken, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          localStorage.removeItem("accessToken")
          set({ user: null, accessToken: null, isAuthenticated: false })
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => {
        localStorage.setItem("accessToken", token)
        set({ accessToken: token })
      },

      loadProfile: async () => {
        try {
          const res = await authApi.getProfile()
          set({ user: res.data.user, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false, accessToken: null })
          localStorage.removeItem("accessToken")
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
)
