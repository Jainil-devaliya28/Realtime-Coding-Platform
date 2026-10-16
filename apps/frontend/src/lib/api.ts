import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && error.response?.data?.error?.code === "TOKEN_EXPIRED" && !original._retry) {
      original._retry = true
      try {
        const res = await api.post("/api/auth/refresh")
        const { accessToken } = res.data
        localStorage.setItem("accessToken", accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem("accessToken")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  signup: (data: { email: string; username: string; password: string }) =>
    api.post("/api/auth/signup", data),
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),
  logout: () => api.post("/api/auth/logout"),
  getProfile: () => api.get("/api/auth/me"),
  refresh: () => api.post("/api/auth/refresh"),
}

export const roomApi = {
  list: (params?: Record<string, string>) => api.get("/api/rooms", { params }),
  getById: (id: string) => api.get(`/api/rooms/${id}`),
  create: (data: { name: string; description?: string; language: string; isPublic: boolean }) =>
    api.post("/api/rooms", data),
  update: (id: string, data: Partial<{ name: string; description: string; isPublic: boolean }>) =>
    api.put(`/api/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/api/rooms/${id}`),
  getMyRooms: () => api.get("/api/rooms/my"),
}

export const executionApi = {
  run: (roomId: string, data: { code: string; language: string; stdin?: string }) =>
    api.post(`/api/execution/rooms/${roomId}/execute`, data),
  getJobStatus: (jobId: string) => api.get(`/api/execution/jobs/${jobId}`),
  getHistory: (roomId: string, params?: Record<string, string>) =>
    api.get(`/api/execution/rooms/${roomId}/history`, { params }),
  getQueueStats: () => api.get("/api/execution/queue/stats"),
}

export const aiApi = {
  ask: (roomId: string, data: { message: string; code?: string; error?: string; conversationId?: string }) =>
    api.post(`/api/ai/rooms/${roomId}/ask`, data, { responseType: "stream" }),
  explainCode: (data: { code: string; language: string }) => api.post("/api/ai/explain", data),
  analyzeError: (data: { code: string; error: string; language: string }) => api.post("/api/ai/analyze-error", data),
  generateTests: (data: { code: string; language: string }) => api.post("/api/ai/generate-tests", data),
  optimizeCode: (data: { code: string; language: string }) => api.post("/api/ai/optimize", data),
  getConversations: (roomId: string) => api.get(`/api/ai/rooms/${roomId}/conversations`),
}

export const analyticsApi = {
  getDashboard: () => api.get("/api/analytics/dashboard"),
  getTrends: (days?: number) => api.get("/api/analytics/trends", { params: { days } }),
  getUserAnalytics: () => api.get("/api/analytics/me"),
  getRoomAnalytics: (roomId: string) => api.get(`/api/analytics/rooms/${roomId}`),
}
